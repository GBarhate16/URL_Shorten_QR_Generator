"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import NextLink from "next/link";
import { EyeOpenIcon, EyeNoneIcon } from "@radix-ui/react-icons";
import { LogIn, Mail, Lock, Home, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getApiUrl } from "@/config/api";
import ForgotPasswordModal from "@/components/forgot-password-modal";

function LoginContent() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  // Check for email verification status from URL params
  useEffect(() => {
    const verified = searchParams.get('verified');
    const errorType = searchParams.get('error');
    
    if (verified === 'true') {
      setSuccess('Email verified successfully! You can now log in.');
    } else if (verified === 'false') {
      if (errorType === 'expired') {
        setError('Email verification link has expired. Please request a new one.');
      } else if (errorType === 'invalid') {
        setError('Invalid email verification link.');
      }
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setFieldErrors({});

    try {
      console.log("Submitting login data:", loginForm);
      
      const response = await fetch(getApiUrl('LOGIN'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        mode: "cors",
        credentials: "omit",
        body: JSON.stringify(loginForm),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      const data = await response.json();
      console.log("Response data:", data);

      if (response.ok) {
        // Extract tokens and user data
        const { tokens, user } = data;
        login(tokens.access, tokens.refresh, user);
        
        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        // Normalize and show backend validation errors
        const nextFieldErrors: Record<string, string[]> = {};
        const generalErrors: string[] = [];

        if (data && typeof data === "object") {
          Object.keys(data).forEach((key) => {
            const value = (data as Record<string, unknown>)[key];
            if (Array.isArray(value)) {
              nextFieldErrors[key] = value as string[];
            } else if (typeof value === "string") {
              if (key === "non_field_errors") {
                generalErrors.push(value);
              } else {
                nextFieldErrors[key] = [value];
              }
            }
          });
        } else if (typeof data === "string") {
          generalErrors.push(data);
        }

        setFieldErrors(nextFieldErrors);
        setError(generalErrors[0] || "Invalid credentials.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <div className="relative h-screen overflow-hidden bg-background flex items-center justify-center px-4">
      {/* Home Button */}
      <Button
        as={NextLink}
        href="/"
        variant="light"
        size="sm"
        className="absolute top-4 left-4 z-10 text-muted-foreground hover:text-foreground"
        startContent={<Home className="h-4 w-4" />}
      >
        Home
      </Button>

      {/* Decorative blobs (hidden on small screens to avoid overflow) */}
      <div aria-hidden className="hidden sm:block pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden className="hidden sm:block pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />

      <Card className="w-full max-w-md shadow-lg border border-border/50">
        <CardHeader className="flex flex-col items-center gap-2 pt-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
            <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <LogIn className="h-6 w-6" />
            </div>
          </div>
          <h1 className="text-xl font-bold">Welcome back</h1>
          <p className="text-xs text-muted-foreground">Sign in to continue.</p>
        </CardHeader>
        <CardBody className="pb-6">
          <form onSubmit={handleLogin} className="space-y-3">
            <Input
              type="email"
              startContent={<Mail className="h-4 w-4 text-muted-foreground" />}
              placeholder="Enter your email"
              value={loginForm.email}
              onChange={(e) => {
                setLoginForm({ ...loginForm, email: e.target.value });
                if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: [] });
              }}
              required
            />
            {fieldErrors.email?.length ? (
              <p className="text-red-500 text-xs">{fieldErrors.email.join(" ")}</p>
            ) : null}
            <Input
              type={showPassword ? "text" : "password"}
              startContent={<Lock className="h-4 w-4 text-muted-foreground" />}
              placeholder="Enter your password"
              value={loginForm.password}
              onChange={(e) => {
                setLoginForm({ ...loginForm, password: e.target.value });
                if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: [] });
              }}
              endContent={
                <button
                  className="focus:outline-none"
                  type="button"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? <EyeNoneIcon /> : <EyeOpenIcon />}
                </button>
              }
              required
            />
            {fieldErrors.password?.length ? (
              <p className="text-red-500 text-xs">{fieldErrors.password.join(" ")}</p>
            ) : null}
            
            {/* Success Message */}
            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <p className="text-green-700 text-xs">{success}</p>
              </div>
            )}
            
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="h-4 w-4 text-red-600" />
                <div className="flex-1">
                  <p className="text-red-700 text-xs">{error}</p>
                  {(error.includes('expired') || error.includes('Invalid email verification')) && (
                    <NextLink href="/resend-verification" className="text-red-600 hover:text-red-800 text-xs underline">
                      Resend verification email
                    </NextLink>
                  )}
                </div>
              </div>
            )}
            
            <Button
              type="submit"
              color="primary"
              className="w-full"
              isLoading={isLoading}
            >
              Sign In
            </Button>
            
            {/* Forgot Password Link */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(true)}
                className="text-primary hover:underline text-xs"
              >
                Forgot your password?
              </button>
            </div>
          </form>
          <div className="mt-4 text-center text-xs">
            <p className="text-muted-foreground">
              Don&apos;t have an account?{" "}
              <NextLink href="/signup" className="text-primary hover:underline">
                Sign up
              </NextLink>
            </p>
          </div>
        </CardBody>
      </Card>
      
      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
