"use client";

import { useState } from "react";
import { useUrls } from "@/hooks/use-urls";
import { useAnalytics, type AnalyticsRange } from "@/hooks/use-analytics";
import dynamic from "next/dynamic";

const AnalyticsCharts = dynamic(() => import("@/components/analytics/Charts"), { ssr: false });

export default function OverviewPage() {
  const { error, stats } = useUrls();
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const { analytics, isLoading: analyticsLoading, error: analyticsError, mutate } = useAnalytics(range);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Debug Info */}
      {error && (
        <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">Error loading URLs: {error.message}</p>
        </div>
      )}

      <AnalyticsCharts analytics={analytics} loading={analyticsLoading} error={analyticsError as Error | undefined} range={range} setRange={setRange} stats={stats} onRefresh={() => mutate()} />
    </div>
  );
}
