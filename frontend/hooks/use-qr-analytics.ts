"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { getApiUrl } from "@/config/api";
import { useAuth } from "@/contexts/auth-context";

export type QRAnalyticsRange = "7d" | "30d" | "90d" | "180d" | "365d";

export interface QRTimePoint {
  date: string;
  count: number;
}

export interface QRBreakdownItem {
  label: string;
  count: number;
}

export interface QRAnalyticsResponse {
  range: QRAnalyticsRange | string;
  interval: string;
  totals: { 
    total_qr_codes: number; 
    total_scans: number;
    active_qr_codes: number;
    dynamic_qr_codes: number;
  };
  series: {
    qr_codes_created: QRTimePoint[];
    scans: QRTimePoint[];
  };
  breakdowns: {
    countries: QRBreakdownItem[];
    devices: QRBreakdownItem[];
    os: QRBreakdownItem[];
    browsers: QRBreakdownItem[];
    qr_types: QRBreakdownItem[];
  };
}

export function useQRAnalytics(range: QRAnalyticsRange = "30d") {
  const { isAuthenticated, getValidAccessToken } = useAuth();

  const key = useMemo(() => (isAuthenticated ? ["qr-analytics", range] : null), [isAuthenticated, range]);

  const fetcher = async (): Promise<QRAnalyticsResponse> => {
    // Get valid access token with automatic refresh if needed
    const token = await getValidAccessToken();
    if (!token) {
      throw new Error('No valid access token available');
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    
    const url = `${getApiUrl("QR_ANALYTICS")}?range=${encodeURIComponent(range)}`;
    const resp = await fetch(url, { method: "GET", headers, mode: "cors", credentials: "omit" });
    
    if (!resp.ok) {
      if (resp.status === 401) {
        // Token might be invalid, try to refresh and retry once
        const newToken = await getValidAccessToken();
        if (newToken && newToken !== token) {
          headers.Authorization = `Bearer ${newToken}`;
          const retryResp = await fetch(url, { method: "GET", headers, mode: "cors", credentials: "omit" });
          if (retryResp.ok) {
            return (await retryResp.json()) as QRAnalyticsResponse;
          }
        }
      }
      
      const txt = await resp.text();
      throw new Error(`Failed to fetch QR analytics: ${resp.status} ${txt}`);
    }
    
    return (await resp.json()) as QRAnalyticsResponse;
  };

  const { data, error, isLoading, mutate } = useSWR<QRAnalyticsResponse>(key, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 5_000,
    dedupingInterval: 2_500,
    keepPreviousData: true as unknown as boolean,
    onError: (error) => {
      console.error('QR Analytics fetch error:', error);
    },
  });

  return { analytics: data, isLoading, error, mutate };
}
