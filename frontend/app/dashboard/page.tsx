"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to overview page
    router.replace("/dashboard/overview");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        {/* Loader with responsive size */}
        <div
          className="animate-spin rounded-full border-b-2 border-primary mx-auto
          h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-14 lg:w-14"
        ></div>

        {/* Text with responsive font size */}
        <p className="mt-4 text-base sm:text-lg md:text-xl lg:text-2xl">
          Loading dashboard...
        </p>
      </div>
    </div>
  );
}
