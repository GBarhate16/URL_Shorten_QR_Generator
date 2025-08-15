"use client";

import { useState } from "react";
import { useUrls } from "@/hooks/use-urls";
import { useAnalytics, type AnalyticsRange } from "@/hooks/use-analytics";
import dynamic from "next/dynamic";

const AnalyticsCharts = dynamic(() => import("@/components/analytics/Charts"), { ssr: false });

export default function OverviewPage() {
  const { error, stats } = useUrls();
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const {
    analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    mutate,
  } = useAnalytics(range);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 w-full max-w-7xl mx-auto">
      {/* Error Message */}
      {error && (
        <div className="p-3 sm:p-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-center sm:text-left">
          <p className="text-red-700 text-sm sm:text-base">
            Error loading URLs: {error.message}
          </p>
        </div>
      )}

      {/* Charts Section */}
      <div className="w-full overflow-x-auto">
        <AnalyticsCharts
          analytics={analytics}
          loading={analyticsLoading}
          error={analyticsError as Error | undefined}
          range={range}
          setRange={setRange}
          stats={stats}
          onRefresh={() => mutate()}
        />
      </div>
    </div>
  );
}
