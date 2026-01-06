import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EyeIcon, EyeOffIcon, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import coloradoMountainImg from "@assets/colorado-5156229.jpg";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [resetComplete, setResetComplete] = useState(false);
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setIsVerifying(false);
        setIsValid(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-reset-token?token=${token}`);
        const data = await response.json();
        
        if (data.valid) {
          setIsValid(true);
          setEmail(data.email);
        } else {
          setIsValid(false);
        }
      } catch (error) {
        console.error("Token verification error:", error);
        setIsValid(false);
      } finally {
        setIsVerifying(false);
      }
    }

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/reset-password", {
        token,
        newPassword: formData.newPassword,
      });

      if (response.ok) {
        setResetComplete(true);
        toast({
          title: "Password Reset Successful",
          description: "You can now log in with your new password.",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Reset Failed",
          description: errorData.error || "Failed to reset password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        title: "Reset Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 z-0">
        <img 
          src={coloradoMountainImg} 
          alt="Colorado Mountains" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-white text-2xl font-light mb-2">
              Western Sky Maintenance
            </h1>
          </div>

          {isVerifying ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white/80">Verifying your reset link...</p>
            </div>
          ) : resetComplete ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-white text-xl font-medium mb-2">Password Reset!</h2>
              <p className="text-white/80 mb-6">Your password has been successfully updated.</p>
              <Button 
                onClick={() => setLocation("/")}
                className="w-full bg-white text-black hover:bg-white/90 font-medium py-3"
                data-testid="button-go-to-login"
              >
                Go to Login
              </Button>
            </div>
          ) : !isValid ? (
            <div className="text-center py-8">
              <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-white text-xl font-medium mb-2">Invalid or Expired Link</h2>
              <p className="text-white/80 mb-6">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Button 
                onClick={() => setLocation("/")}
                className="w-full bg-white text-black hover:bg-white/90 font-medium py-3"
                data-testid="button-back-to-login"
              >
                Back to Login
              </Button>
            </div>
          ) : (
            <>
              <p className="text-white/80 text-center mb-6">
                Create a new password for <strong>{email}</strong>
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="New Password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 pr-10"
                    required
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm New Password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 pr-10"
                    required
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
                <Button 
                  type="submit"
                  className="w-full bg-white text-black hover:bg-white/90 font-medium py-3"
                  disabled={isLoading}
                  data-testid="button-reset-password"
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
