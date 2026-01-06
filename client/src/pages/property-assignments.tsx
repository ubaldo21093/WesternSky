import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, UserPlus, Building } from "lucide-react";

interface PropertyAssignment {
  id: number;
  userId: number;
  propertyId: number;
  createdAt: string;
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
    avatarUrl: string | null;
    createdAt: Date;
  };
  property?: {
    id: number;
    name: string;
    address: string;
    units: number;
    monthlyRevenue: string | null;
    createdAt: Date;
  };
}

interface User {
  id: number;
  email: string;
  name: string;
  role: "admin" | "employee" | "homeowner";
  avatarUrl?: string;
  createdAt: string;
}

interface Property {
  id: number;
  name: string;
  address: string;
  units: number;
  monthlyRevenue: string | null;
  createdAt: string;
}

export default function PropertyAssignments() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch property assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["/api/property-assignments"],
    queryFn: () => apiRequest("GET", "/api/property-assignments").then(res => res.json()) as Promise<PropertyAssignment[]>,
  });

  // Fetch homeowner users
  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: () => apiRequest("GET", "/api/admin/users").then(res => res.json()) as Promise<User[]>,
  });

  // Fetch properties
  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
    queryFn: () => apiRequest("GET", "/api/properties").then(res => res.json()) as Promise<Property[]>,
  });

  // Filter for homeowner users only
  const homeowners = users.filter(user => user.role === "homeowner");

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: { userId: number; propertyId: number }) =>
      apiRequest("POST", "/api/property-assignments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/property-assignments"] });
      setIsDialogOpen(false);
      setSelectedUserId("");
      setSelectedPropertyId("");
      toast({
        title: "Success",
        description: "Property assigned to homeowner successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign property",
        variant: "destructive",
      });
    },
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async ({ userId, propertyId }: { userId: number; propertyId: number }) =>
      apiRequest("DELETE", `/api/property-assignments/${userId}/${propertyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/property-assignments"] });
      toast({
        title: "Success",
        description: "Property assignment removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove assignment",
        variant: "destructive",
      });
    },
  });

  const handleCreateAssignment = () => {
    if (!selectedUserId || !selectedPropertyId) {
      toast({
        title: "Error",
        description: "Please select both a homeowner and a property",
        variant: "destructive",
      });
      return;
    }

    createAssignmentMutation.mutate({
      userId: parseInt(selectedUserId),
      propertyId: parseInt(selectedPropertyId),
    });
  };

  const handleDeleteAssignment = (userId: number, propertyId: number) => {
    deleteAssignmentMutation.mutate({ userId, propertyId });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Property Assignments
            </h1>
            <p className="text-muted-foreground mt-2">
              Assign properties to homeowner accounts to control what they can see
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Assign Property
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Property to Homeowner</DialogTitle>
              <DialogDescription>
                Select a homeowner and property to create a new assignment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="homeowner">Homeowner</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a homeowner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {homeowners.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="property">Property</Label>
                <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a property..." />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id.toString()}>
                        {property.name} - {property.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateAssignment}
                  disabled={createAssignmentMutation.isPending}
                >
                  {createAssignmentMutation.isPending ? "Assigning..." : "Assign Property"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="w-5 h-5 mr-2" />
            Current Property Assignments
          </CardTitle>
          <CardDescription>
            Homeowners can only view invoices for their assigned properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignmentsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No property assignments found. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Homeowner</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={`${assignment.userId}-${assignment.propertyId}`}>
                    <TableCell className="font-medium">
                      {assignment.user?.name || "Unknown User"}
                    </TableCell>
                    <TableCell>{assignment.user?.email || "N/A"}</TableCell>
                    <TableCell>{assignment.property?.name || "Unknown Property"}</TableCell>
                    <TableCell>{assignment.property?.address || "N/A"}</TableCell>
                    <TableCell>
                      {new Date(assignment.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAssignment(assignment.userId, assignment.propertyId)}
                        disabled={deleteAssignmentMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}