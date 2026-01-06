import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { loadUser, getCurrentUser } from "@/lib/auth";
import { LoginPage } from "./login-page-fixed";

interface AuthGuardProps {
  children: React.ReactNode;
}

const PUBLIC_ROUTES = ["/reset-password"];

export function AuthGuard({ children }: AuthGuardProps) {
  const [location] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(getCurrentUser());

  const isPublicRoute = PUBLIC_ROUTES.some(route => location.startsWith(route));

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await loadUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
