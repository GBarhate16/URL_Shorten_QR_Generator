"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { getApiUrl } from "@/config/api";
import { useAuth } from "@/contexts/auth-context";

export type AnalyticsRange = "7d" | "30d" | "90d" | "180d" | "365d";

export interface TimePoint {
  date: string;
  count: number;
}

export interface BreakdownItem {
  label: string;
  count: number;
}

export interface AnalyticsResponse {
  range: AnalyticsRange | string;
  interval: string;
  totals: { total_urls: number; total_clicks: number };
  series: {
    urls_created: TimePoint[];
    clicks: TimePoint[];
  };
  breakdowns: {
    countries: BreakdownItem[];
    devices: BreakdownItem[];
    os: BreakdownItem[];
    browsers: BreakdownItem[];
    referrers: BreakdownItem[];
  };
}

export function useAnalytics(range: AnalyticsRange = "30d") {
  const { isAuthenticated } = useAuth();

  const key = useMemo(() => (isAuthenticated ? ["urls-analytics", range] : null), [isAuthenticated, range]);

  const fetcher = async (): Promise<AnalyticsResponse> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const url = `${getApiUrl("URLS_ANALYTICS")}?range=${encodeURIComponent(range)}`;
    const resp = await fetch(url, { method: "GET", headers, mode: "cors", credentials: "omit" });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Failed to fetch analytics: ${resp.status} ${txt}`);
    }
    return (await resp.json()) as AnalyticsResponse;
  };

  const { data, error, isLoading, mutate } = useSWR<AnalyticsResponse>(key, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 5_000,
    dedupingInterval: 2_500,
    keepPreviousData: true as unknown as boolean,
  });

  return { analytics: data, isLoading, error, mutate };
}


