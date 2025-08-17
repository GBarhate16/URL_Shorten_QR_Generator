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
        {/* Loader with fully responsive sizing */}
        <div
          className="animate-spin rounded-full border-b-2 border-primary mx-auto
          h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 xl:h-20 xl:w-20"
        ></div>

        {/* Text with fluid font size */}
        <p className="mt-4 text-[clamp(14px,2vw,28px)] font-medium">
          Loading dashboard...
        </p>
      </div>
    </div>
  );
}
