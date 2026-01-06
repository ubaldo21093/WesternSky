import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navigation } from "@/components/ui/navigation";
import { StatCard } from "@/components/ui/stat-card";
import { TaskCard } from "@/components/ui/task-card";
import { PropertyCard } from "@/components/ui/property-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Calendar, AlertTriangle, Plus, MessageSquare } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCurrentUser } from "@/lib/auth";

export default function Dashboard() {
  const user = getCurrentUser();
  const [, setLocation] = useLocation();

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalProperties: number;
    activeTasks: number;
    urgentRequests: number;
    //monthlyRevenue: string;
  }>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
  });

  const handleQuickAction = (action: string) => {
    console.log("Quick action clicked:", action);
    try {
      switch (action) {
        case "createProperty":
          console.log("Navigating to properties page...");
          setLocation("/properties");
          break;
        case "createTask":
          console.log("Navigating to tasks page...");
          setLocation("/tasks");
          break;
        case "viewMessages":
          console.log("Navigating to messages page...");
          setLocation("/messages");
          break;
        default:
          console.log("Unknown action:", action);
      }
    } catch (error) {
      console.error("Error in handleQuickAction:", error);
    }
  };

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
    },
    onError: (error) => {
      console.error("Failed to update task:", error);
    },
  });

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
    },
    onError: (error) => {
      console.error("Failed to assign task:", error);
    },
  });

  const handleTaskStatusChange = (taskId: number, newStatus: string) => {
    updateTaskMutation.mutate({ id: taskId, status: newStatus });
  };

  const handleAssignToMe = (taskId: number) => {
    assignTaskMutation.mutate(taskId);
  };

  if (statsLoading || propertiesLoading || tasksLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Filter data based on user role
  let filteredTasks = tasks;
  
  // Filter out completed tasks for all users
  filteredTasks = tasks.filter((task: any) => task.status !== "completed");
  
  // Apply role-based filtering
  if (user?.role === "employee") {
    // Employees see unassigned tasks OR tasks assigned to them
    filteredTasks = filteredTasks.filter((task: any) => 
      task.assigneeId === null || task.assigneeId === user.id
    );
  } else if (user?.role === "homeowner") {
    // Homeowners see only their requested tasks
    filteredTasks = filteredTasks.filter((task: any) => task.requesterId === user.id);
  }
  
  const recentTasks = filteredTasks.slice(0, 6);
  const recentProperties = properties.slice(0, 6);
  const urgentTasks = filteredTasks.filter((task: any) => 
    task.priority === "urgent" && (task.status === "pending" || task.status === "in_progress")
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-2 text-sm text-gray-600">
                Welcome, {user?.name}! ({user?.role})
              </p>
            </div>

          </div>
        </div>

        {/* Stats Overview */}
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Properties"
              value={stats?.totalProperties || 0}
              icon={Home}
              iconColor="text-blue-600"
            />
            <StatCard
              title="Active Tasks"
              value={stats?.activeTasks || 0}
              icon={Calendar}
              iconColor="text-orange-600"
            />
            <StatCard
              title="Urgent Requests"
              value={stats?.urgentRequests || 0}
              icon={AlertTriangle}
              iconColor="text-red-600"
            />
            {/* Monthly Revenue removed (invoicing no longer available) */}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity - Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Tasks */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-lg font-semibold">Recent Tasks</CardTitle>
                  <Button variant="ghost" size="sm">View All</Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentTasks.length > 0 ? (
                    recentTasks.map((task: any) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleTaskStatusChange}
                        onAssignToMe={handleAssignToMe}
                        showActions={user?.role !== "homeowner"}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No tasks found</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Properties Overview */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-lg font-semibold">Properties Overview</CardTitle>
                  <Button variant="ghost" size="sm">View All</Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recentProperties.length > 0 ? (
                      recentProperties.map((property: any) => (
                        <PropertyCard
                          key={property.id}
                          property={property}
                          showActions={user?.role === "admin"}
                        />
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-8 text-gray-500">
                        <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No properties found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions - Role-based visibility */}
              {user?.role !== "employee" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => handleQuickAction("createTask")}
                    >
                      <Plus className="h-4 w-4 mr-3" />
                      Create New Task
                    </Button>
                    {/* Admin-only actions */}
                    {user?.role === "admin" && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => handleQuickAction("createProperty")}
                      >
                        <Home className="h-4 w-4 mr-3" />
                        Add Property
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => handleQuickAction("viewMessages")}
                    >
                      <MessageSquare className="h-4 w-4 mr-3" />
                      Messages
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Urgent Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-red-600">
                    Urgent Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {urgentTasks.length > 0 ? (
                    urgentTasks.map((task: any) => (
                      <div 
                        key={task.id}
                        className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                      >
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{task.title}</p>
                            <p className="text-xs text-gray-600">{task.property?.name}</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                          URGENT
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No urgent tasks</p>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
