import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Home, Edit, Trash2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import type { Property } from "@shared/schema";

interface PropertyCardProps {
  property: Property;
  onEdit?: (property: Property) => void;
  onDelete?: (propertyId: number) => void;
  showActions?: boolean;
  className?: string;
}

const statusColors = {
  active: "bg-green-100 text-green-800 border-green-200",
  maintenance: "bg-yellow-100 text-yellow-800 border-yellow-200",
  inactive: "bg-gray-100 text-gray-800 border-gray-200",
};

// Property images removed per user request

export function PropertyCard({ 
  property, 
  onEdit, 
  onDelete, 
  showActions = true,
  className 
}: PropertyCardProps) {
  const user = getCurrentUser();
  const handleEdit = () => {
    if (onEdit) {
      onEdit(property);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(property.id);
    }
  };

  // Revenue display removed per user request for privacy

  return (
    <Card className={cn("overflow-hidden hover:shadow-lg transition-all duration-200", className)}>
      <div className="p-4 border-b bg-gray-50">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">{property.name}</h3>
          <Badge 
            variant="outline" 
            className={cn(
              statusColors[property.status as keyof typeof statusColors]
            )}
          >
            {property.status.toUpperCase()}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-6">
        {/* Address and units information removed per user request */}

        {/* Notes section - only visible to admin and employee users */}
        {user?.role !== "homeowner" && property.notes && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start">
              <FileText className="h-4 w-4 mr-2 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-1">Access Notes</h4>
                <p className="text-sm text-blue-800 whitespace-pre-wrap">{property.notes}</p>
              </div>
            </div>
          </div>
        )}

        {showActions && (
          <div className="flex space-x-2 pt-4 border-t border-gray-200">
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleEdit}
              className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleDelete}
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
