import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin, User, Trash2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { ProgressTracker } from "@/components/ui/progress-tracker";
import type { Task, Property, User as UserType } from "@shared/schema";

interface TaskCardProps {
  task: Task & { property?: Property; assignee?: UserType };
  onStatusChange?: (taskId: number, newStatus: string) => void;
  onAssignToMe?: (taskId: number) => void;
  onDelete?: (taskId: number) => void;
  showActions?: boolean;
  className?: string;
}

const priorityColors = {
  urgent: "bg-red-200 text-red-900 border-red-300",
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200",
};

const statusColors = {
  pending: "bg-gray-100 text-gray-800 border-gray-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export function TaskCard({ task, onStatusChange, onAssignToMe, onDelete, showActions = true, className }: TaskCardProps) {
  const currentUser = getCurrentUser();
  const [isProgressTrackerOpen, setIsProgressTrackerOpen] = useState(false);
  
  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(task.id, newStatus);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(task.id);
    }
  };

  const handleTrackProgress = () => {
    setIsProgressTrackerOpen(true);
  };

  const handleAssignToMe = () => {
    if (onAssignToMe) {
      onAssignToMe(task.id);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "No due date";
    return new Date(date).toLocaleDateString();
  };

  return (
    <Card className={cn("overflow-hidden hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-gray-600 mb-3">{task.description}</p>
            )}
          </div>
          <div className="flex space-x-2 ml-4">
            <Badge 
              variant="outline" 
              className={cn("text-xs", priorityColors[task.priority as keyof typeof priorityColors])}
            >
              {task.priority.toUpperCase()}
            </Badge>
            <Badge 
              variant="outline"
              className={cn("text-xs", statusColors[task.status as keyof typeof statusColors])}
            >
              {task.status.replace("_", " ").toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm text-gray-600">
          {task.property && (
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              <span>{task.property.name}</span>
            </div>
          )}
          
          {task.assignee && (
            <div className="flex items-center">
              <Avatar className="h-6 w-6 mr-2">
                <AvatarImage src={task.assignee.avatarUrl ?? undefined} alt={task.assignee.name} />
                <AvatarFallback className="text-xs">
                  {task.assignee.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{task.assignee.name}</span>
            </div>
          )}
          
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{formatDate(task.dueDate)}</span>
          </div>
        </div>

        {(showActions || currentUser?.role === "homeowner") && (
          <div className="flex space-x-2">
            {currentUser?.role === "homeowner" ? (
              // Homeowners can always track progress regardless of status
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleTrackProgress}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Eye className="h-4 w-4 mr-1" />
                Track Progress
              </Button>
            ) : (
              // Employees and admins can manage task status
              <>
                {/* Show "Assign to Me" button for unassigned tasks (employees only) */}
                {!task.assigneeId && currentUser?.role === "employee" && task.status === "pending" && (
                  <Button 
                    size="sm" 
                    onClick={handleAssignToMe}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <User className="h-4 w-4 mr-1" />
                    Assign to Me
                  </Button>
                )}
                
                {task.status !== "completed" && task.status !== "cancelled" && (
                  <>
                    {task.status === "pending" && task.assigneeId && (
                      <Button 
                        size="sm" 
                        onClick={() => handleStatusChange("in_progress")}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Start Task
                      </Button>
                    )}
                    {task.status === "in_progress" && (
                      <Button 
                        size="sm" 
                        onClick={() => handleStatusChange("completed")}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Mark Complete
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleStatusChange("cancelled")}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Cancel
                    </Button>
                  </>
                )}
                {task.status === "cancelled" && onDelete && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleDelete}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </>
            )}
          </div>
        )}
        
        {/* Progress Tracker Modal */}
        <ProgressTracker 
          task={task}
          isOpen={isProgressTrackerOpen}
          onClose={() => setIsProgressTrackerOpen(false)}
        />
      </CardContent>
    </Card>
  );
}
