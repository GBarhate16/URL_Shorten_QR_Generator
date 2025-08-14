"use client";
import { Card, CardBody, CardHeader } from "@heroui/react";
import { Button } from "@heroui/button";
import NextLink from "next/link";
import { Lock, ShieldAlert } from "lucide-react";

export default function NotAuthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="relative w-full max-w-lg">
        {/* Decorative background blob */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl animate-pulse"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-secondary/10 blur-3xl animate-pulse"
        />

        <Card className="w-full text-center shadow-lg">
          <CardHeader className="flex flex-col items-center gap-3 pt-8">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Lock className="h-8 w-8 animate-pulse" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Access Restricted</h1>
            <p className="text-sm text-muted-foreground max-w-sm">
              You don&apos;t have permission to view this page. Please log in to continue.
            </p>
          </CardHeader>
          <CardBody className="pb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm mx-auto">
              <NextLink href="/login">
                <Button color="primary" className="w-full">Go to Login</Button>
              </NextLink>
              <NextLink href="/">
                <Button variant="light" className="w-full">Back to Home</Button>
              </NextLink>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldAlert className="h-4 w-4" />
              <span>Secured area. Authentication required.</span>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}


