import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Home, Settings, Menu, X, Shield, Building, CheckSquare, MessageSquare } from "lucide-react";
import { getCurrentUser, signOut } from "@/lib/auth";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface NavigationProps {
  className?: string;
}

export function Navigation({ className }: NavigationProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const user = getCurrentUser();

  // Get current user data to check role
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/me");
      return response.json();
    },
    retry: false,
  });

  // Base navigation items
  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Properties", href: "/properties", icon: Building },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Messages", href: "/messages", icon: MessageSquare },
  ];

  // Add admin panel for admin users only - check multiple sources for admin role
  const isAdmin = currentUser?.user?.role === "admin" || 
                  user?.role === "admin" || 
                  (currentUser?.user?.email === "ubaldobogarin@gmail.com");
  
  if (isAdmin) {
    navigation.push({ name: "Admin", href: "/admin", icon: Shield });
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <nav className={cn("bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Desktop Navigation */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Home className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-semibold text-gray-900">Western Sky</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-8 ml-10">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                    location === item.href
                      ? "text-blue-600 border-blue-600"
                      : "text-gray-500 border-transparent hover:text-gray-900 hover:border-gray-300"
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                3
              </span>
            </Button>
            
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                <AvatarFallback>
                  {user?.name?.split(" ").map(n => n[0]).join("").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-900">{user?.name}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "block px-3 py-2 text-base font-medium rounded-md",
                  location === item.href
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="px-3 py-2 border-t border-gray-200 mt-3 pt-3">
              <div className="flex items-center space-x-2 mb-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                  <AvatarFallback>
                    {user?.name?.split(" ").map(n => n[0]).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-900">{user?.name}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="w-full">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
