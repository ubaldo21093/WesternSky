import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/ui/navigation";
import { PropertyCard } from "@/components/ui/property-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPropertySchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import type { Property } from "@shared/schema";
import { z } from "zod";

const propertyFormSchema = insertPropertySchema.omit({
  monthlyRevenue: true,
});

type PropertyFormData = z.infer<typeof propertyFormSchema>;

export default function Properties() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("default");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const { toast } = useToast();
  const user = getCurrentUser();

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["/api/properties"],
  });

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      name: "",
      address: "",
      units: 1,
      status: "active",
      notes: "",
    },
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (data: PropertyFormData) => {
      const propertyData = {
        ...data,
        units: Number(data.units),
      };
      return apiRequest("POST", "/api/properties", propertyData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Property created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create property",
        variant: "destructive",
      });
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: PropertyFormData }) => {
      const propertyData = {
        ...data,
        units: Number(data.units),
      };
      return apiRequest("PUT", `/api/properties/${id}`, propertyData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setIsDialogOpen(false);
      setEditingProperty(null);
      form.reset();
      toast({
        title: "Success",
        description: "Property updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update property",
        variant: "destructive",
      });
    },
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/properties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Success",
        description: "Property deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete property",
        variant: "destructive",
      });
    },
  });

  const handleCreateProperty = (data: PropertyFormData) => {
    createPropertyMutation.mutate(data);
  };

  const handleUpdateProperty = (data: PropertyFormData) => {
    if (editingProperty) {
      updatePropertyMutation.mutate({ id: editingProperty.id, data });
    }
  };

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    form.reset({
      name: property.name,
      address: property.address,
      units: property.units,
      status: property.status,
      notes: property.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteProperty = (propertyId: number) => {
    if (confirm("Are you sure you want to delete this property?")) {
      deletePropertyMutation.mutate(propertyId);
    }
  };

  const openCreateDialog = () => {
    setEditingProperty(null);
    form.reset({
      name: "",
      address: "",
      units: 1,
      status: "active",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  // Filter and sort properties
  const filteredProperties = properties
    .filter((property: Property) => {
      const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           property.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || property.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a: Property, b: Property) => {
      if (sortOrder === "alphabetical") {
        return a.name.localeCompare(b.name);
      }
      return 0; // default order
    });

  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage all your properties in one place
              </p>
            </div>
            {isAdmin && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Property
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProperty ? "Edit Property" : "Add New Property"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form 
                      onSubmit={form.handleSubmit(editingProperty ? handleUpdateProperty : handleCreateProperty)}
                      className="space-y-6"
                    >
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter property name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter property address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="units"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Units</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                placeholder="Enter number of units" 
                                {...field} 
                                onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select property status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="maintenance">Maintenance</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Notes field - only visible to admin and employee users */}
                      {user?.role !== "homeowner" && (
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes (Admin/Employee Only)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Enter sensitive information like gate codes, alarm codes, etc." 
                                  className="min-h-[100px]"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
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
                          disabled={createPropertyMutation.isPending || updatePropertyMutation.isPending}
                        >
                          {createPropertyMutation.isPending || updatePropertyMutation.isPending ? "Saving..." : "Save Property"}
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
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search properties..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default Order</SelectItem>
                      <SelectItem value="alphabetical">Alphabetical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Properties Grid */}
        <div className="px-4 py-6 sm:px-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property: Property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onEdit={isAdmin ? handleEditProperty : undefined}
                  onDelete={isAdmin ? handleDeleteProperty : undefined}
                  showActions={isAdmin}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-gray-500">
                  <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No properties found</h3>
                  <p className="text-sm">
                    {searchTerm || statusFilter !== "all" 
                      ? "Try adjusting your search or filter criteria" 
                      : isAdmin 
                        ? "Get started by adding your first property"
                        : "No properties have been added yet"
                    }
                  </p>
                  {isAdmin && !searchTerm && statusFilter === "all" && (
                    <Button className="mt-4" onClick={openCreateDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Property
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
