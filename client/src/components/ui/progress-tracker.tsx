import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, Property, User as UserType } from "@shared/schema";

interface ProgressTrackerProps {
  task: Task & { property?: Property; assignee?: UserType };
  isOpen: boolean;
  onClose: () => void;
}

const getProgressStage = (status: string) => {
  switch (status) {
    case "pending":
      return 0; // Request Submitted
    case "in_progress":
      return 1; // Working on It
    case "completed":
      return 2; // Completed
    case "cancelled":
      return -1; // Special case
    default:
      return 0;
  }
};

const progressStages = [
  { label: "Request Submitted", color: "bg-red-100 border-red-300", textColor: "text-red-700" },
  { label: "Working on It", color: "bg-yellow-100 border-yellow-300", textColor: "text-yellow-700" },
  { label: "Completed", color: "bg-green-100 border-green-300", textColor: "text-green-700" }
];

export function ProgressTracker({ task, isOpen, onClose }: ProgressTrackerProps) {
  const currentStage = getProgressStage(task.status);
  const isCancelled = task.status === "cancelled";

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Not set";
    return new Date(date).toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Track Progress</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Task Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{task.title}</h3>
            {task.description && (
              <p className="text-gray-600 mb-3">{task.description}</p>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {task.property && (
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{task.property.name}</span>
                </div>
              )}
              
              {task.assignee && (
                <div className="flex items-center text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  <span>Assigned to: {task.assignee.name}</span>
                </div>
              )}
              
              <div className="flex items-center text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Due: {formatDate(task.dueDate)}</span>
              </div>
              
              <div className="flex items-center text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                <span>Created: {formatDate(task.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {isCancelled ? (
            <div className="text-center p-6">
              <Badge variant="destructive" className="text-lg px-4 py-2">
                Request Cancelled
              </Badge>
              <p className="text-gray-600 mt-2">This maintenance request has been cancelled.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="font-semibold text-center">Progress Status</h4>
              
              {/* Progress Visual */}
              <div className="flex items-center justify-between relative">
                {/* Progress Line */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 transform -translate-y-1/2 z-0"></div>
                <div 
                  className="absolute top-1/2 left-0 h-1 bg-blue-500 transform -translate-y-1/2 z-0 transition-all duration-500"
                  style={{ width: `${(currentStage / (progressStages.length - 1)) * 100}%` }}
                ></div>
                
                {/* Stage Indicators */}
                {progressStages.map((stage, index) => (
                  <div key={index} className="flex flex-col items-center z-10 relative">
                    <div 
                      className={cn(
                        "w-8 h-8 rounded-full border-2 flex items-center justify-center mb-2 bg-white transition-all duration-300",
                        index <= currentStage 
                          ? "border-blue-500 bg-blue-500" 
                          : "border-gray-300"
                      )}
                    >
                      {index <= currentStage && (
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      )}
                    </div>
                    <div 
                      className={cn(
                        "text-xs text-center px-2 py-1 rounded border transition-all duration-300",
                        index <= currentStage 
                          ? stage.color + " " + stage.textColor
                          : "bg-gray-100 text-gray-500 border-gray-300"
                      )}
                    >
                      {stage.label}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Current Status Description */}
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-800 font-medium">
                  {currentStage === 0 && "Your request has been submitted and is pending assignment."}
                  {currentStage === 1 && "Great news! Work has started on your request."}
                  {currentStage === 2 && "Your maintenance request has been completed!"}
                </p>
              </div>
            </div>
          )}
          
          {/* Priority Badge */}
          <div className="text-center">
            <Badge 
              variant="outline" 
              className={cn(
                "text-sm px-3 py-1",
                task.priority === "high" && "border-red-300 text-red-700 bg-red-50",
                task.priority === "medium" && "border-yellow-300 text-yellow-700 bg-yellow-50",
                task.priority === "low" && "border-green-300 text-green-700 bg-green-50"
              )}
            >
              {task.priority.toUpperCase()} PRIORITY
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}