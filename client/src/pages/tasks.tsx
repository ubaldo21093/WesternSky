import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/ui/navigation";
import { TaskCard } from "@/components/ui/task-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Filter, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import type { Task, Property, User } from "@shared/schema";
import { z } from "zod";

const taskFormSchema = insertTaskSchema.omit({ dueDate: true }).extend({
  dueDate: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

export default function Tasks() {
  const user = getCurrentUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<string>(
    user?.role === "employee" ? "unassigned" : "all"
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      propertyId: undefined,
      assigneeId: undefined,
      requesterId: user?.id,
      priority: "medium",
      status: "pending",
      dueDate: "",
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const taskData = {
        ...data,
        propertyId: data.propertyId ? Number(data.propertyId) : undefined,
        assigneeId: data.assigneeId ? Number(data.assigneeId) : undefined,
        requesterId: Number(data.requesterId),
        ...(data.dueDate && data.dueDate !== "" ? { dueDate: data.dueDate } : {}),
      };
      console.log("Sending task data to server:", taskData);
      return apiRequest("POST", "/api/tasks", taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Task created successfully",
      });
    },
    onError: (error) => {
      console.error("Task creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const updateData: any = { status };
      if (status === "completed") {
        updateData.completedAt = new Date();
      }
      return apiRequest("PUT", `/api/tasks/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const handleCreateTask = (data: TaskFormData) => {
    // Convert date string to proper format for the server
    const taskData = {
      ...data,
      dueDate: data.dueDate || undefined,
    };
    createTaskMutation.mutate(taskData);
  };

  const handleTaskStatusChange = (taskId: number, newStatus: string) => {
    updateTaskMutation.mutate({ id: taskId, status: newStatus });
  };

  const assignTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      if (!user) throw new Error("User not authenticated");
      return apiRequest("PUT", `/api/tasks/${taskId}`, {
        assigneeId: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Task assigned to you successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to assign task",
        variant: "destructive",
      });
    },
  });

  const handleAssignToMe = (taskId: number) => {
    assignTaskMutation.mutate(taskId);
  };

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  const handleTaskDelete = (taskId: number) => {
    deleteTaskMutation.mutate(taskId);
  };

  const openCreateDialog = () => {
    form.reset({
      title: "",
      description: "",
      propertyId: undefined,
      assigneeId: undefined,
      requesterId: user?.id,
      priority: "medium",
      status: "pending",
      dueDate: "",
    });
    setIsDialogOpen(true);
  };

  // Filter tasks
  const filteredTasks = (tasks as any[]).filter((task: Task & { property?: Property; assignee?: User }) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.property?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    
    // Assignment filter
    let matchesAssignment = true;
    if (assignmentFilter === "assigned") {
      matchesAssignment = task.assigneeId !== null;
    } else if (assignmentFilter === "unassigned") {
      matchesAssignment = task.assigneeId === null;
    } else if (assignmentFilter === "mine" && user) {
      matchesAssignment = task.assigneeId === user.id;
    }
    
    // Role-based filtering
    if (user?.role === "employee") {
      // Employees can see tasks assigned to them OR unassigned tasks they can take
      const roleBasedFilter = task.assigneeId === user.id || task.assigneeId === null;
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignment && roleBasedFilter;
    }
    if (user?.role === "homeowner") {
      return matchesSearch && matchesStatus && matchesPriority && task.requesterId === user.id;
    }
    
    return matchesSearch && matchesStatus && matchesPriority && matchesAssignment;
  });

  const canCreateTasks = user?.role === "admin" || user?.role === "homeowner";
  const canAssignTasks = user?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
              <p className="mt-2 text-sm text-gray-600">
                {user?.role === "employee" ? "Your assigned tasks" :
                 user?.role === "homeowner" ? "Your maintenance requests" :
                 "Manage all property maintenance tasks"}
              </p>
            </div>
            {canCreateTasks && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    {user?.role === "homeowner" ? "New Request" : "New Task"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {user?.role === "homeowner" ? "Create Maintenance Request" : "Create New Task"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form 
                      onSubmit={form.handleSubmit(handleCreateTask)}
                      className="space-y-6"
                    >
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter task title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter task description" 
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="propertyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property</FormLabel>
                            <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select property" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {properties
                                  .sort((a: Property, b: Property) => a.name.localeCompare(b.name))
                                  .map((property: Property) => (
                                    <SelectItem key={property.id} value={property.id.toString()}>
                                      {property.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date</FormLabel>
                            <FormControl>
                              <Input 
                                type="date"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end space-x-3">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createTaskMutation.isPending}
                        >
                          {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-6 sm:px-0">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search tasks..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  {user?.role === "employee" && (
                    <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Assignment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        <SelectItem value="mine">My Tasks</SelectItem>
                        <SelectItem value="all">All Tasks</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Grid */}
        <div className="px-4 py-6 sm:px-0">
          {tasksLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredTasks.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredTasks.map((task: Task & { property?: Property; assignee?: User }) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleTaskStatusChange}
                  onAssignToMe={handleAssignToMe}
                  onDelete={handleTaskDelete}
                  showActions={user?.role !== "homeowner" || task.status === "pending"}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No tasks found</h3>
                  <p className="text-sm">
                    {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                      ? "Try adjusting your search or filter criteria"
                      : canCreateTasks
                        ? user?.role === "homeowner" 
                          ? "You haven't submitted any maintenance requests yet"
                          : "Get started by creating your first task"
                        : "No tasks have been assigned to you yet"
                    }
                  </p>
                  {canCreateTasks && !searchTerm && statusFilter === "all" && priorityFilter === "all" && (
                    <Button className="mt-4" onClick={openCreateDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      {user?.role === "homeowner" ? "Submit First Request" : "Create First Task"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
