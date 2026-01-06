import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { signInWithGoogle } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import coloradoMountainImg from "@assets/colorado-5156229.jpg";

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    rememberMe: false,
  });
  const [resetEmail, setResetEmail] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Sign in failed:", error);
      toast({
        title: "Sign In Failed",
        description: "Please try again or contact support if the problem persists.",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Validate email format for sign up
    if (isSignUp) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast({
          title: "Invalid Email",
          description: "Please provide a valid email address",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }
    
    try {
      const endpoint = isSignUp ? "/api/auth/register" : "/api/auth/login";
      const response = await apiRequest("POST", endpoint, formData);
      
      if (response.ok) {
        toast({
          title: "Success!",
          description: isSignUp ? "Account created successfully!" : "Welcome back!",
        });
        window.location.href = "/dashboard";
      } else {
        const data = await response.json();
        throw new Error(data.error || "Authentication failed");
      }
    } catch (error: any) {
      toast({
        title: isSignUp ? "Sign Up Failed" : "Sign In Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please provide a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/auth/forgot-password", {
        email: resetEmail,
      });
      
      if (response.ok) {
        setResetEmailSent(true);
        toast({
          title: "Check Your Email",
          description: "If an account exists with that email, you'll receive a password reset link.",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Request Failed",
          description: errorData.error || "Failed to send reset email. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Password reset request error:", error);
      toast({
        title: "Request Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Mountain Background */}
      <div className="absolute inset-0 z-0">
        <img 
          src={coloradoMountainImg} 
          alt="Colorado Mountains" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Login Form */}
      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-white text-2xl font-light mb-2">
              Western Sky Maintenance
            </h1>
            <p className="text-white/80 text-sm">
              {isPasswordReset ? "Reset your password" : isSignUp ? "Create an account" : "Have an account?"}
            </p>
          </div>

          {/* Password Reset Form */}
          {isPasswordReset ? (
            resetEmailSent ? (
              <div className="text-center py-4">
                <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-4 mb-6">
                  <p className="text-white">
                    Check your email! If an account exists for <strong>{resetEmail}</strong>, you'll receive a password reset link.
                  </p>
                </div>
                <p className="text-white/70 text-sm mb-4">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <Button 
                  type="button"
                  variant="ghost"
                  className="w-full text-white/80 hover:text-white hover:bg-white/10"
                  onClick={() => {
                    setIsPasswordReset(false);
                    setResetEmailSent(false);
                    setResetEmail("");
                  }}
                  data-testid="button-back-to-login"
                >
                  Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <p className="text-white/80 text-sm text-center mb-2">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20"
                    required
                    data-testid="input-reset-email"
                  />
                </div>
                <Button 
                  type="submit"
                  className="w-full bg-white text-black hover:bg-white/90 font-medium py-3"
                  disabled={isLoading}
                  data-testid="button-send-reset-link"
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
                <Button 
                  type="button"
                  variant="ghost"
                  className="w-full text-white/80 hover:text-white hover:bg-white/10"
                  onClick={() => setIsPasswordReset(false)}
                  data-testid="button-back-to-login"
                >
                  Back to Login
                </Button>
              </form>
            )
          ) : (
            <>
              {/* Login/Signup Form */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {isSignUp && (
                  <div>
                    <Input
                      type="email"
                      placeholder="Email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20"
                      required
                    />
                  </div>
                )}
                
                <div>
                  <Input
                    type="text"
                    placeholder="Username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20"
                    required
                  />
                </div>

                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>

                {!isSignUp && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="remember"
                        checked={formData.rememberMe}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, rememberMe: checked as boolean })
                        }
                      />
                      <Label htmlFor="remember" className="text-white/80">
                        Remember Me
                      </Label>
                    </div>
                    <button 
                      type="button" 
                      className="text-white/80 hover:text-white"
                      onClick={() => setIsPasswordReset(true)}
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-full py-3 font-medium transition-all duration-200"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {isSignUp ? "Creating Account..." : "Signing In..."}
                    </div>
                  ) : (
                    isSignUp ? "CREATE ACCOUNT" : "SIGN IN"
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="flex items-center my-6">
                <div className="flex-1 border-t border-white/20"></div>
                <span className="px-4 text-white/60 text-sm">Or Sign In With</span>
                <div className="flex-1 border-t border-white/20"></div>
              </div>

              {/* Social Login */}
              <Button
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 rounded-full py-3 font-medium transition-all duration-200"
              >
                {isGoogleLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </div>
                )}
              </Button>

              {/* Toggle between Sign In and Sign Up */}
              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-white/80 hover:text-white text-sm"
                >
                  {isSignUp 
                    ? "Already have an account? Sign In" 
                    : "Don't have an account? Create one"
                  }
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}