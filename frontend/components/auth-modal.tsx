"use client";
import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Tabs, Tab, Card, CardBody } from "@heroui/react";
import { EyeOpenIcon, EyeNoneIcon } from "@radix-ui/react-icons";

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess: (token: string, user: { id: number; username: string; email: string; first_name: string; last_name: string }) => void;
}

export default function AuthModal({ isOpen, onOpenChange, onAuthSuccess }: AuthModalProps) {
  const [selectedTab, setSelectedTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Form states
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [signupForm, setSignupForm] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
    first_name: "",
    last_name: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/users/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (response.ok) {
        onAuthSuccess(data.token, data.user);
        onOpenChange(false);
        // Redirect to dashboard will be handled by parent component
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (signupForm.password !== signupForm.password2) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/users/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signupForm),
      });

      const data = await response.json();

      if (response.ok) {
        // After successful signup, switch to login tab
        setSelectedTab("login");
        setLoginForm({ email: signupForm.email, password: "" });
        setError("Account created successfully! Please login.");
        // Clear signup form
        setSignupForm({
          username: "",
          email: "",
          password: "",
          password2: "",
          first_name: "",
          last_name: "",
        });
      } else {
        setError(data.message || "Signup failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(key as string)}
            className="w-full"
          >
            <Tab key="login" title="Login">
              <Card>
                <CardBody>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <Input
                      type="email"
                      label="Email"
                      placeholder="Enter your email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                    />
                    <Input
                      type={showPassword ? "text" : "password"}
                      label="Password"
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
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
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button
                      type="submit"
                      color="primary"
                      className="w-full"
                      isLoading={isLoading}
                    >
                      Login
                    </Button>
                  </form>
                </CardBody>
              </Card>
            </Tab>
            <Tab key="signup" title="Sign Up">
              <Card>
                <CardBody>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        type="text"
                        label="First Name"
                        placeholder="First name"
                        value={signupForm.first_name}
                        onChange={(e) => setSignupForm({ ...signupForm, first_name: e.target.value })}
                        required
                      />
                      <Input
                        type="text"
                        label="Last Name"
                        placeholder="Last name"
                        value={signupForm.last_name}
                        onChange={(e) => setSignupForm({ ...signupForm, last_name: e.target.value })}
                        required
                      />
                    </div>
                    <Input
                      type="text"
                      label="Username"
                      placeholder="Choose a username"
                      value={signupForm.username}
                      onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                      required
                    />
                    <Input
                      type="email"
                      label="Email"
                      placeholder="Enter your email"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      required
                    />
                    <Input
                      type={showPassword ? "text" : "password"}
                      label="Password"
                      placeholder="Create a password"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
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
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      label="Confirm Password"
                      placeholder="Confirm your password"
                      value={signupForm.password2}
                      onChange={(e) => setSignupForm({ ...signupForm, password2: e.target.value })}
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
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button
                      type="submit"
                      color="primary"
                      className="w-full"
                      isLoading={isLoading}
                    >
                      Sign Up
                    </Button>
                  </form>
                </CardBody>
              </Card>
            </Tab>
          </Tabs>
        </ModalHeader>
      </ModalContent>
    </Modal>
  );
}
