"use client";
import { useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Link } from "@heroui/link";
import { Mail, Home, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { getApiUrl } from "@/config/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    setFieldErrors({});

    try {
      const response = await fetch(getApiUrl('RESET_PASSWORD'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        mode: "cors",
        credentials: "omit",
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || "Password reset email sent successfully!");
        setEmail("");
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
        setError(generalErrors[0] || "Failed to send password reset email.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
              <Mail className="h-6 w-6" />
            </div>
          </div>
          <h1 className="text-xl font-bold">Forgot Password</h1>
          <p className="text-xs text-muted-foreground">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </CardHeader>
        <CardBody className="pb-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              startContent={<Mail className="h-4 w-4 text-muted-foreground" />}
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: [] });
              }}
              required
            />
            {fieldErrors.email?.length ? (
              <p className="text-red-500 text-xs">{fieldErrors.email.join(" ")}</p>
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
              Send Reset Link
            </Button>
          </form>
          
          <div className="mt-4 text-center text-xs">
            <p className="text-muted-foreground">
              Remember your password?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
