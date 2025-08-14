"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Link } from "@heroui/link";
import { EyeOpenIcon, EyeNoneIcon } from "@radix-ui/react-icons";
import { Lock, Home, ArrowLeft, CheckCircle, XCircle, Key } from "lucide-react";
import { getApiUrl } from "@/config/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [resetForm, setResetForm] = useState({
    new_password: "",
    new_password2: "",
  });

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(`${getApiUrl('VERIFY_PASSWORD_RESET')}${token}/`, {
          method: "GET",
          headers: {
            "Accept": "application/json",
          },
          mode: "cors",
          credentials: "omit",
        });

        const data = await response.json();

        if (response.ok && data.valid) {
          setIsValid(true);
          setUserEmail(data.email || "");
        } else {
          setIsValid(false);
          setError(data.message || "Invalid or expired reset token.");
        }
      } catch (err) {
        console.error("Token validation error:", err);
        setIsValid(false);
        setError("Failed to validate reset token.");
      } finally {
        setIsValidating(false);
      }
    };

    if (token) {
      validateToken();
    } else {
      setIsValidating(false);
      setIsValid(false);
      setError("No reset token provided.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    setFieldErrors({});

    try {
      const response = await fetch(`${getApiUrl('VERIFY_PASSWORD_RESET')}${token}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        mode: "cors",
        credentials: "omit",
        body: JSON.stringify(resetForm),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Password reset successfully! Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        // Handle validation errors
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
        setError(generalErrors[0] || "Failed to reset password.");
      }
    } catch (err) {
      console.error("Reset error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

  if (isValidating) {
    return (
      <div className="relative h-screen overflow-hidden bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md shadow-lg border border-border/50">
          <CardBody className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Validating reset token...</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="relative h-screen overflow-hidden bg-background flex items-center justify-center px-4">
        {/* Home Button */}
        <Button
          as={Link}
          href="/"
          variant="light"
          size="sm"
          className="absolute top-4 left-4 z-10 text-muted-foreground hover:text-foreground"
          startContent={<Home className="h-4 w-4" />}
        >
          Home
        </Button>

        {/* Decorative blobs */}
        <div aria-hidden className="hidden sm:block pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div aria-hidden className="hidden sm:block pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />

        <Card className="w-full max-w-md shadow-lg border border-border/50">
          <CardHeader className="flex flex-col items-center gap-2 pt-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl" />
              <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-500">
                <XCircle className="h-6 w-6" />
              </div>
            </div>
            <h1 className="text-xl font-bold">Invalid Reset Link</h1>
            <p className="text-xs text-muted-foreground">
              This password reset link is invalid or has expired.
            </p>
          </CardHeader>
          <CardBody className="pb-6 text-center">
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <XCircle className="h-4 w-4 text-red-600" />
              <p className="text-red-700 text-xs">{error}</p>
            </div>
            
            <div className="space-y-3">
              <Button
                as={Link}
                href="/forgot-password"
                color="primary"
                className="w-full"
              >
                Request New Reset Link
              </Button>
              
              <Button
                as={Link}
                href="/login"
                variant="light"
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-background flex items-center justify-center px-4">
      {/* Home Button */}
      <Button
        as={Link}
        href="/"
        variant="light"
        size="sm"
        className="absolute top-4 left-4 z-10 text-muted-foreground hover:text-foreground"
        startContent={<Home className="h-4 w-4" />}
      >
        Home
      </Button>

      {/* Back to Login Button */}
      <Button
        as={Link}
        href="/login"
        variant="light"
        size="sm"
        className="absolute top-4 right-4 z-10 text-muted-foreground hover:text-foreground"
        startContent={<ArrowLeft className="h-4 w-4" />}
      >
        Back to Login
      </Button>

      {/* Decorative blobs */}
      <div aria-hidden className="hidden sm:block pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden className="hidden sm:block pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />

      <Card className="w-full max-w-md shadow-lg border border-border/50">
        <CardHeader className="flex flex-col items-center gap-2 pt-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
            <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Key className="h-6 w-6" />
            </div>
          </div>
          <h1 className="text-xl font-bold">Reset Password</h1>
          <p className="text-xs text-muted-foreground">
            Enter your new password below.
          </p>
          {userEmail && (
            <p className="text-xs text-muted-foreground">
              Resetting password for: <span className="font-medium">{userEmail}</span>
            </p>
          )}
        </CardHeader>
        <CardBody className="pb-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type={showPassword ? "text" : "password"}
              startContent={<Lock className="h-4 w-4 text-muted-foreground" />}
              placeholder="Enter new password"
              value={resetForm.new_password}
              onChange={(e) => {
                setResetForm({ ...resetForm, new_password: e.target.value });
                if (fieldErrors.new_password) setFieldErrors({ ...fieldErrors, new_password: [] });
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
            {fieldErrors.new_password?.length ? (
              <p className="text-red-500 text-xs">{fieldErrors.new_password.join(" ")}</p>
            ) : null}
            
            <Input
              type={showConfirmPassword ? "text" : "password"}
              startContent={<Lock className="h-4 w-4 text-muted-foreground" />}
              placeholder="Confirm new password"
              value={resetForm.new_password2}
              onChange={(e) => {
                setResetForm({ ...resetForm, new_password2: e.target.value });
                if (fieldErrors.new_password2) setFieldErrors({ ...fieldErrors, new_password2: [] });
              }}
              endContent={
                <button
                  className="focus:outline-none"
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                >
                  {showConfirmPassword ? <EyeNoneIcon /> : <EyeOpenIcon />}
                </button>
              }
              required
            />
            {fieldErrors.new_password2?.length ? (
              <p className="text-red-500 text-xs">{fieldErrors.new_password2.join(" ")}</p>
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
                <p className="text-red-700 text-xs">{error}</p>
              </div>
            )}
            
            <Button
              type="submit"
              color="primary"
              className="w-full"
              isLoading={isLoading}
            >
              Reset Password
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
