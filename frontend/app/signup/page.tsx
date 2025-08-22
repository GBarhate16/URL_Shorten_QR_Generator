// Server component wrapper to pre-render shell, then client hydrate for form
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import NextLink from "next/link";
import { EyeOpenIcon, EyeNoneIcon } from "@radix-ui/react-icons";
import { UserPlus, User, Mail, KeyRound, Home } from "lucide-react";
import { getApiUrl } from "@/config/api";
import { safeArray, safeSome } from "@/lib/safe-arrays";

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [signupForm, setSignupForm] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
    first_name: "",
    last_name: "",
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    setFieldErrors({});

    if (signupForm.password !== signupForm.password2) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      
      
      const response = await fetch(getApiUrl('REGISTER'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        mode: "cors",
        credentials: "omit",
        body: JSON.stringify(signupForm),
      });

      

      const data = await response.json();
      

      if (response.ok) {
        setSuccess("Account created successfully! Please login.");
        // Clear form
        setSignupForm({
          username: "",
          email: "",
          password: "",
          password2: "",
          first_name: "",
          last_name: "",
        });
        setFieldErrors({});
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push("/login");
        }, 2000);
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

        // Special-case: map password mismatch to confirm field if present
        if (
          (safeSome(safeArray(data.non_field_errors as string[]), (m: string) => m.toLowerCase().includes("match"))) ||
          (safeSome(generalErrors, (m) => m.toLowerCase().includes("match")))
        ) {
          nextFieldErrors.password2 = ["Passwords do not match."];
        }

        setFieldErrors(nextFieldErrors);
        setError(generalErrors[0] || "Please fix the errors below.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

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
              <UserPlus className="h-6 w-6" />
            </div>
          </div>
          <h1 className="text-xl font-bold">Create your account</h1>
          <p className="text-xs text-muted-foreground">It only takes a minute.</p>
        </CardHeader>
        <CardBody className="pb-6">
          <form onSubmit={handleSignup} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="text"
                startContent={<User className="h-4 w-4 text-muted-foreground" />}
                placeholder="First name"
                value={signupForm.first_name}
                onChange={(e) => {
                  setSignupForm({ ...signupForm, first_name: e.target.value });
                  if (fieldErrors.first_name) setFieldErrors({ ...fieldErrors, first_name: [] });
                }}
                required
              />
              <Input
                type="text"
                startContent={<User className="h-4 w-4 text-muted-foreground" />}
                placeholder="Last name"
                value={signupForm.last_name}
                onChange={(e) => {
                  setSignupForm({ ...signupForm, last_name: e.target.value });
                  if (fieldErrors.last_name) setFieldErrors({ ...fieldErrors, last_name: [] });
                }}
                required
              />
            </div>
            <Input
              type="text"
              startContent={<User className="h-4 w-4 text-muted-foreground" />}
              placeholder="Choose a username"
              value={signupForm.username}
              onChange={(e) => {
                setSignupForm({ ...signupForm, username: e.target.value });
                if (fieldErrors.username) setFieldErrors({ ...fieldErrors, username: [] });
              }}
              required
            />
            {fieldErrors.username?.length ? (
              <p className="text-red-500 text-xs">{fieldErrors.username.join(" ")}</p>
            ) : null}
            <Input
              type="email"
              startContent={<Mail className="h-4 w-4 text-muted-foreground" />}
              placeholder="Enter your email"
              value={signupForm.email}
              onChange={(e) => {
                setSignupForm({ ...signupForm, email: e.target.value });
                if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: [] });
              }}
              required
            />
            {fieldErrors.email?.length ? (
              <p className="text-red-500 text-xs">{fieldErrors.email.join(" ")}</p>
            ) : null}
            <Input
              type={showPassword ? "text" : "password"}
              startContent={<KeyRound className="h-4 w-4 text-muted-foreground" />}
              placeholder="Create a password"
              value={signupForm.password}
              onChange={(e) => {
                setSignupForm({ ...signupForm, password: e.target.value });
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
            <Input
              type={showConfirmPassword ? "text" : "password"}
              startContent={<KeyRound className="h-4 w-4 text-muted-foreground" />}
              placeholder="Confirm your password"
              value={signupForm.password2}
              onChange={(e) => {
                setSignupForm({ ...signupForm, password2: e.target.value });
                if (fieldErrors.password2) setFieldErrors({ ...fieldErrors, password2: [] });
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
            {fieldErrors.password2?.length ? (
              <p className="text-red-500 text-xs">{fieldErrors.password2.join(" ")}</p>
            ) : null}
            {error && <p className="text-red-500 text-xs">{error}</p>}
            {success && <p className="text-green-500 text-xs">{success}</p>}
            <Button
              type="submit"
              color="primary"
              className="w-full"
              isLoading={isLoading}
            >
              Create Account
            </Button>
          </form>

          <div className="mt-4 text-center text-xs">
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <NextLink href="/login" className="text-primary hover:underline">
                Sign in
              </NextLink>
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
