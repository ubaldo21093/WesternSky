import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MessageCircle, Send, Plus, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentUser } from "@/lib/auth";
import type { Message, User as UserType } from "@shared/schema";

const messageSchema = z.object({
  receiverId: z.number().min(1, "Please select a recipient"),
  content: z.string().min(1, "Message cannot be empty"),
});

type MessageFormData = z.infer<typeof messageSchema>;

interface MessageWithUsers extends Message {
  sender: UserType;
  receiver: UserType;
}

export default function Messages() {
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();

  // Get all messageable users
  const { data: messageableUsers = [], isLoading: usersLoading } = useQuery<UserType[]>({
    queryKey: ["/api/messages/users"],
    enabled: !!currentUser,
  });

  // Get all messages for the current user
  const { data: allMessages = [], isLoading: messagesLoading } = useQuery<MessageWithUsers[]>({
    queryKey: ["/api/messages"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/messages");
      return response.json();
    },
    enabled: !!currentUser,
  });

  // Get messages for selected conversation
  const messages = selectedUser 
    ? allMessages.filter(msg => 
        (msg.senderId === currentUser?.id && msg.receiverId === selectedUser) ||
        (msg.senderId === selectedUser && msg.receiverId === currentUser?.id)
      )
    : [];

  const newMessageForm = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      receiverId: 0,
      content: "",
    },
  });

  const createMessageMutation = useMutation({
    mutationFn: async (data: MessageFormData) => {
      const response = await apiRequest("POST", "/api/messages", data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all message-related queries to refresh conversations
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/users"] });
      newMessageForm.reset({
        receiverId: 0,
        content: "",
      });
      setIsNewMessageOpen(false);
    },
  });

  const handleSendMessage = (data: MessageFormData) => {
    console.log("Form data:", data);
    console.log("Form errors:", newMessageForm.formState.errors);
    createMessageMutation.mutate(data);
  };

  const getConversationPartner = (message: MessageWithUsers) => {
    return message.senderId === currentUser?.id ? message.receiver : message.sender;
  };

  // Group messages by conversation
  const conversations = Array.isArray(allMessages) 
    ? allMessages.reduce((acc: Record<number, MessageWithUsers[]>, message: MessageWithUsers) => {
        const partnerId = message.senderId === currentUser?.id ? message.receiverId : message.senderId;
        if (!acc[partnerId]) {
          acc[partnerId] = [];
        }
        acc[partnerId].push(message);
        return acc;
      }, {})
    : {};

  if (!currentUser) {
    return <div>Please log in to view messages.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageCircle className="h-8 w-8" />
          Messages
        </h1>
        <Dialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send New Message</DialogTitle>
            </DialogHeader>
            <Form {...newMessageForm}>
              <form onSubmit={newMessageForm.handleSubmit(handleSendMessage)} className="space-y-4">
                <FormField
                  control={newMessageForm.control}
                  name="receiverId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To</FormLabel>
                      <Select value={field.value > 0 ? field.value.toString() : ""} onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select recipient" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {messageableUsers.map((user: UserType) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {user.name} ({user.role})
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newMessageForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Type your message here..." rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsNewMessageOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMessageMutation.isPending}>
                    <Send className="h-4 w-4 mr-2" />
                    {createMessageMutation.isPending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div>Loading conversations...</div>
              ) : Object.keys(conversations).length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No conversations yet. Start a new message!
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {Object.entries(conversations).map(([partnerId, msgs]) => {
                      const latestMessage = msgs[msgs.length - 1];
                      const partner = getConversationPartner(latestMessage);
                      return (
                        <div
                          key={partnerId}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedUser === parseInt(partnerId)
                              ? "bg-primary/10 border border-primary"
                              : "bg-muted hover:bg-muted/80"
                          }`}
                          onClick={() => setSelectedUser(parseInt(partnerId))}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span className="font-medium">{partner.name}</span>
                            </div>
                            <Badge variant="secondary">{partner.role}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {latestMessage.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(latestMessage.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Messages View */}
        <div className="md:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle>
                {selectedUser
                  ? `Conversation with ${
                      messageableUsers.find((u: UserType) => u.id === selectedUser)?.name || "User"
                    }`
                  : "Select a conversation"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {selectedUser ? (
                <>
                  <ScrollArea className="flex-1 mb-4">
                    {messagesLoading ? (
                      <div>Loading messages...</div>
                    ) : conversations[selectedUser]?.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        No messages in this conversation yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(conversations[selectedUser] || [])
                          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                          .map((message: MessageWithUsers) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.senderId === currentUser.id ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                message.senderId === currentUser.id
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  message.senderId === currentUser.id
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {new Date(message.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  <MessageInput
                    onSend={(content) => {
                      createMessageMutation.mutate({
                        receiverId: selectedUser,
                        content,
                      });
                    }}
                    isLoading={createMessageMutation.isPending}
                  />
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Select a conversation to view messages
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
}

interface MessageInputProps {
  onSend: (content: string) => void;
  isLoading: boolean;
}

function MessageInput({ onSend, isLoading }: MessageInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message.trim());
      setMessage("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        disabled={isLoading}
      />
      <Button type="submit" disabled={!message.trim() || isLoading}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}