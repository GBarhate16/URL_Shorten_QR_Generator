"use client";

import { Skeleton } from "@heroui/react";
import { memo } from "react";

interface OptimizedLoadingProps {
  variant?: 'card' | 'table' | 'list' | 'dashboard';
  count?: number;
  className?: string;
}

const OptimizedLoading = memo(({ 
  variant = 'card', 
  count = 3, 
  className = "" 
}: OptimizedLoadingProps) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <div className={`space-y-4 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-16 rounded" />
                  <Skeleton className="h-8 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        );

      case 'table':
        return (
          <div className={`space-y-2 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex space-x-4 py-2">
                <Skeleton className="h-4 w-1/4 rounded" />
                <Skeleton className="h-4 w-1/3 rounded" />
                <Skeleton className="h-4 w-1/6 rounded" />
                <Skeleton className="h-4 w-1/6 rounded" />
              </div>
            ))}
          </div>
        );

      case 'list':
        return (
          <div className={`space-y-3 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        );

      case 'dashboard':
        return (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-2">
                <Skeleton className="h-6 w-3/4 rounded" />
                <Skeleton className="h-8 w-1/2 rounded" />
                <Skeleton className="h-3 w-full rounded" />
              </div>
            ))}
          </div>
        );

      default:
        return <Skeleton className={`h-4 w-full rounded ${className}`} />;
    }
  };

  return renderSkeleton();
});

OptimizedLoading.displayName = 'OptimizedLoading';

export default OptimizedLoading;
