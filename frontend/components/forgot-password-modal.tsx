"use client";
import { useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { X, Mail, CheckCircle, XCircle } from "lucide-react";
import { getApiUrl } from "@/config/api";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
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
        
        // Show notification
        if (typeof window !== "undefined" && (window as typeof window & { addNotification: (notification: { type: string; title: string; message: string; duration?: number }) => void }).addNotification) {
          (window as typeof window & { addNotification: (notification: { type: string; title: string; message: string; duration?: number }) => void }).addNotification({
            type: "success",
            title: "Email Sent",
            message: "Password reset link has been sent to your email address.",
            duration: 6000,
          });
        }
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
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
        setError(generalErrors[0] || "Failed to send password reset email.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setError("");
    setSuccess("");
    setFieldErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-xl border border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Mail className="h-4 w-4" />
              </div>
            </div>
            <h2 className="text-lg font-semibold">Forgot Password</h2>
          </div>
          <Button
            isIconOnly
            variant="light"
            size="sm"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardBody className="pb-6">
          <p className="text-sm text-muted-foreground mb-4">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
          
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
            
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="light"
                className="flex-1"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                color="primary"
                className="flex-1"
                isLoading={isLoading}
              >
                Send Reset Link
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
