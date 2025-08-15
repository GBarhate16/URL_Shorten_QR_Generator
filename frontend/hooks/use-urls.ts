"use client";
import { useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getApiUrl } from "@/config/api";
import useSWR from "swr";
import { usePathname } from "next/navigation";
import { safeArray, safeSlice, safeMap, safeReduce, safeFilter } from "@/lib/safe-arrays";

export interface ShortenedURL {
	id: number;
	original_url: string;
	short_code: string;
	title: string;
	click_count: number;
	created_at: string;
	expires_at: string | null;
	qr_code_url?: string | null;
	qr_code_download_url?: string | null;
}

// Type guards to avoid any-casts when parsing API payloads
function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function extractArrayPayload(value: unknown): unknown[] | null {
	if (Array.isArray(value)) return value;
	if (isObject(value)) {
		const results = (value as Record<string, unknown>)["results"];
		if (Array.isArray(results)) return results;
		const items = (value as Record<string, unknown>)["items"];
		if (Array.isArray(items)) return items;
	}
	return null;
}

export function useUrls() {
	const { isAuthenticated, getValidAccessToken } = useAuth();
	const pathname = usePathname();

	const fetcher = useCallback(async (): Promise<ShortenedURL[]> => {
		const token = await getValidAccessToken();
		if (!token) {
			throw new Error('No valid access token available');
		}

		const headers: Record<string, string> = { Accept: "application/json" };
		if (token) headers.Authorization = `Bearer ${token}`;

		const url = getApiUrl("URLS");
		console.log("[useUrls] GET", url);
		const resp = await fetch(url, {
			method: "GET",
			headers,
			mode: "cors",
			credentials: "omit",
		});

		if (!resp.ok) {
			if (resp.status === 401) {
				// Token might be invalid, try to refresh and retry once
				const newToken = await getValidAccessToken();
				if (newToken && newToken !== token) {
					headers.Authorization = `Bearer ${newToken}`;
					const retryResp = await fetch(getApiUrl("URLS"), {
						method: "GET",
						headers,
						mode: "cors",
						credentials: "omit",
					});
					if (retryResp.ok) {
						return (await retryResp.json()) as ShortenedURL[];
					}
				}
			}
			
			const txt = await resp.text();
			console.error("[useUrls] GET /urls failed", resp.status, txt);
			throw new Error(`Failed to fetch URLs: ${resp.status} ${txt}`);
		}

		const data: unknown = await resp.json();
		console.log("[useUrls] GET /urls ok, shape:", Array.isArray(data) ? "array" : typeof data);
		const arr = extractArrayPayload(data);
		if (arr) return arr as ShortenedURL[];
		console.warn("[useUrls] Unexpected payload for /urls", data);
		return [];
	}, [getValidAccessToken]);

	// Gate SWR until we have at least one token (access or refresh)
	const hasAnyToken = !!(typeof window !== "undefined" ? localStorage.getItem("accessToken") : null);
	const swrKey = useMemo(() => (isAuthenticated && hasAnyToken ? "user-urls" : null), [isAuthenticated, hasAnyToken]);

	const shouldPoll = useMemo(() => {
		if (!pathname) return false;
		return (
			pathname.startsWith('/dashboard/overview') ||
			pathname.startsWith('/dashboard/urls') // covers list and /urls/[id]/stats
		);
	}, [pathname]);

  const refreshInterval = shouldPoll ? 5000 : 0; // reduce churn but still near real-time
  const dedupeMs = Math.max(2500, Math.floor(refreshInterval * 0.5));

	const { data: urls, isLoading, error, mutate } = useSWR<ShortenedURL[]>(
		swrKey,
		() => fetcher(),
		{
			revalidateOnFocus: true,
			revalidateOnReconnect: true,
			refreshInterval,
			dedupingInterval: dedupeMs,
			refreshWhenHidden: false,
			refreshWhenOffline: false,
			revalidateIfStale: false,
			revalidateOnMount: true,
			errorRetryCount: 1,
			errorRetryInterval: 60000,
			keepPreviousData: true as unknown as boolean,
		}
	);

	const getFullShortUrl = useCallback((shortCode: string) =>
		`${typeof window !== "undefined" ? window.location.origin : ""}/r/${shortCode}`,
		[]
	);

	const stats = useMemo(() => {
		const safeUrls = safeArray(urls);
		return {
			totalUrls: safeUrls.length,
			totalClicks: safeReduce(safeUrls, (total, url) => total + url.click_count, 0),
			activeUrls: safeFilter(safeUrls, url => !url.expires_at || new Date(url.expires_at) > new Date()).length
		};
	}, [urls]);

	const recentUrls = useMemo(() => {
		return safeSlice(urls, 0, 5);
	}, [urls]);

	const updateUrlClickCount = useCallback((urlId: number, newClickCount: number) => {
		mutate(
			(current) => {
				const safeCurrent = safeArray(current);
				return safeMap(safeCurrent, url => (url.id === urlId ? { ...url, click_count: newClickCount } : url));
			},
			false
		);
	}, [mutate]);

	return { urls, isLoading, error, mutate, getFullShortUrl, stats, recentUrls, updateUrlClickCount };
}
