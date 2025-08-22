"use client";

import { useDashboardData } from "@/contexts/dashboard-data-context";
import OptimizedLoading from "./optimized-loading";
import { Suspense } from "react";

interface DashboardLoadingProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  variant?: 'card' | 'table' | 'list' | 'dashboard';
}

export function DashboardLoading({ children, fallback, variant = 'dashboard' }: DashboardLoadingProps) {
  const { isInitializing } = useDashboardData();

  if (isInitializing) {
    return fallback || <OptimizedLoading variant={variant} className="p-4" />;
  }

  return (
    <Suspense fallback={<OptimizedLoading variant={variant} className="p-4" />}>
      {children}
    </Suspense>
  );
}
