import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthGuard } from "@/components/auth/auth-guard";
import Dashboard from "@/pages/dashboard";
import Properties from "@/pages/properties";
import Tasks from "@/pages/tasks";
import Messages from "@/pages/messages";
import AdminPanel from "@/pages/admin";
import PropertyAssignments from "@/pages/property-assignments";
import ResetPassword from "@/pages/reset-password";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/properties" component={Properties} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/messages" component={Messages} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/property-assignments" component={PropertyAssignments} />
      <Route path="/reset-password" component={ResetPassword} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthGuard>
          <Router />
        </AuthGuard>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
