"use client";
import { useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getApiUrl } from "@/config/api";
import useSWR from "swr";
import { usePathname } from "next/navigation";

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

function decodeJwtExp(accessToken: string | null): number | null {
	if (!accessToken) return null;
	try {
		const parts = accessToken.split(".");
		if (parts.length !== 3) return null;
		const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
		return typeof payload?.exp === "number" ? payload.exp : null;
	} catch {
		return null;
	}
}

function isExpiringSoon(accessToken: string | null, withinSeconds = 120): boolean {
	const exp = decodeJwtExp(accessToken);
	if (!exp) return false;
	const nowSec = Math.floor(Date.now() / 1000);
	return exp - nowSec <= withinSeconds;
}

// Single-flight refresh to avoid concurrent refresh storms
let refreshInFlight: Promise<string | null> | null = null;

export function useUrls() {
	const { isAuthenticated } = useAuth();
	const pathname = usePathname();

	const accessTokenStored = useMemo(
		() => (typeof window !== "undefined" ? localStorage.getItem("accessToken") : null),
		[]
	);

	const refreshTokenStored = useMemo(
		() => (typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null),
		[]
	);

	const refreshAccessToken = useCallback(async (): Promise<string | null> => {
		if (!refreshTokenStored) return null;
		try {
			const response = await fetch(getApiUrl('LOGIN').replace('/login/', '/token/refresh/'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
				mode: 'cors',
				credentials: 'omit',
				body: JSON.stringify({ refresh: refreshTokenStored }),
			});
			if (response.ok) {
				const data = await response.json();
				localStorage.setItem('accessToken', data.access);
				return data.access as string;
			}
			return null;
		} catch {
			return null;
		}
	}, [refreshTokenStored]);

	const getValidAccessToken = useCallback(async (): Promise<string | null> => {
		let token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
		if (!token || isExpiringSoon(token, 120)) {
			if (!refreshInFlight) {
				refreshInFlight = refreshAccessToken().finally(() => {
					refreshInFlight = null;
				});
			}
			token = (await refreshInFlight) || token;
		}
		return token;
	}, [refreshAccessToken]);

	const fetcher = useCallback(async (): Promise<ShortenedURL[]> => {
		const token = await getValidAccessToken();
		const headers: Record<string, string> = { Accept: "application/json" };
		if (token) headers.Authorization = `Bearer ${token}`;

		const resp = await fetch(getApiUrl("URLS"), {
			method: "GET",
			headers,
			mode: "cors",
			credentials: "omit",
		});

		if (resp.status === 401) {
			// Last-chance refresh (should be rare)
			const newToken = await refreshAccessToken();
			if (newToken) {
				const retry = await fetch(getApiUrl("URLS"), {
					method: "GET",
					headers: { Authorization: `Bearer ${newToken}`, Accept: "application/json" },
					mode: "cors",
					credentials: "omit",
				});
				if (!retry.ok) {
					const errorText = await retry.text();
					throw new Error(`Failed to fetch URLs: ${retry.status} ${errorText}`);
				}
				const data = await retry.json();
				return (data.results || data) as ShortenedURL[];
			}
			throw new Error("Failed to refresh token");
		}

		if (!resp.ok) {
			const errorText = await resp.text();
			throw new Error(`Failed to fetch URLs: ${resp.status} ${errorText}`);
		}
		const data = await resp.json();
		return (data.results || data) as ShortenedURL[];
	}, [getValidAccessToken, refreshAccessToken]);

	// Gate SWR until we have at least one token (access or refresh)
	const hasAnyToken = !!(accessTokenStored || refreshTokenStored);
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
		if (!urls) return { totalUrls: 0, totalClicks: 0, activeUrls: 0 };
		return {
			totalUrls: urls.length,
			totalClicks: urls.reduce((total, url) => total + url.click_count, 0),
			activeUrls: urls.filter(url => !url.expires_at || new Date(url.expires_at) > new Date()).length
		};
	}, [urls]);

	const recentUrls = useMemo(() => {
		return urls ? urls.slice(0, 5) : [];
	}, [urls]);

	const updateUrlClickCount = useCallback((urlId: number, newClickCount: number) => {
		mutate(
			(current) => {
				if (!current) return current;
				return current.map(url => (url.id === urlId ? { ...url, click_count: newClickCount } : url));
			},
			false
		);
	}, [mutate]);

	return { urls, isLoading, error, mutate, getFullShortUrl, stats, recentUrls, refreshAccessToken, updateUrlClickCount };
}
