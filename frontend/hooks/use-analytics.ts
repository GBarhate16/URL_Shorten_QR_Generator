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
  const { isAuthenticated, getValidAccessToken } = useAuth();

  const key = useMemo(() => (isAuthenticated ? ["urls-analytics", range] : null), [isAuthenticated, range]);

  const fetcher = async (): Promise<AnalyticsResponse> => {
    // Get valid access token with automatic refresh if needed
    const token = await getValidAccessToken();
    if (!token) {
      throw new Error('No valid access token available');
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    
    const url = `${getApiUrl("URLS_ANALYTICS")}?range=${encodeURIComponent(range)}`;
    const resp = await fetch(url, { method: "GET", headers, mode: "cors", credentials: "omit" });
    
    if (!resp.ok) {
      if (resp.status === 401) {
        // Token might be invalid, try to refresh and retry once
        const newToken = await getValidAccessToken();
        if (newToken && newToken !== token) {
          headers.Authorization = `Bearer ${newToken}`;
          const retryResp = await fetch(url, { method: "GET", headers, mode: "cors", credentials: "omit" });
          if (retryResp.ok) {
            return (await retryResp.json()) as AnalyticsResponse;
          }
        }
      }
      
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
    onError: (error) => {
      console.error('Analytics fetch error:', error);
    },
  });

  return { analytics: data, isLoading, error, mutate };
}


