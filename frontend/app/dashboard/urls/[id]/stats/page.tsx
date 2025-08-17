"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import { Button } from "@heroui/button";
import { API_CONFIG, getApiUrl } from "@/config/api";
import { safeMap, safeSlice } from "@/lib/safe-arrays";

type Click = {
  id: number;
  shortened_url: number;
  shortened_url_code: string;
  ip_address: string | null;
  user_agent: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  referrer: string | null;
  referrer_domain: string | null;
  clicked_at: string;
  country: string | null;
  city: string | null;
  location: string | null;
};

export default function UrlStatsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [clicks, setClicks] = useState<Click[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const urlId = Number(params?.id);

  const refreshAccess = useCallback(async () => {
    const refreshToken =
      typeof window !== "undefined"
        ? localStorage.getItem("refreshToken")
        : null;
    if (!refreshToken) return null;
    const resp = await fetch(
      getApiUrl("LOGIN").replace("/login/", "/token/refresh/"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ refresh: refreshToken }),
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    localStorage.setItem("accessToken", data.access);
    return data.access as string;
  }, []);

  const fetchClicks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const accessToken =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken")
          : null;
      if (!accessToken) {
        router.replace("/login");
        return;
      }
      let resp = await fetch(
        `${API_CONFIG.BASE_URL}/api/urls/${urlId}/clicks/`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (resp.status === 401) {
        const newToken = await refreshAccess();
        if (!newToken) {
          router.replace("/login");
          return;
        }
        resp = await fetch(
          `${API_CONFIG.BASE_URL}/api/urls/${urlId}/clicks/`,
          {
            headers: { Authorization: `Bearer ${newToken}` },
          }
        );
      }
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `Failed (${resp.status})`);
      }
      const data: Click[] = await resp.json();
      setClicks(data);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to load stats";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [router, urlId, refreshAccess]);

  useEffect(() => {
    if (!Number.isFinite(urlId)) return;
    fetchClicks();
  }, [fetchClicks, urlId]);

  const summary = useMemo(() => {
    const list = clicks ?? [];
    const total = list.length;
    const uniqueIps = new Set(
      safeMap(list, (c) => c.ip_address || "")
    ).size;
    const byDevice = list.reduce<Record<string, number>>((acc, c) => {
      const key = (c.device_type || "unknown").toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const topReferrers = safeMap(
      list,
      (c) => c.referrer_domain || "direct"
    ).reduce<Record<string, number>>((acc, r) => {
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    }, {});
    return { total, uniqueIps, byDevice, topReferrers };
  }, [clicks]);

  return (
    <div className="px-2 sm:px-4 md:px-6 lg:px-8 py-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="light"
            onPress={() => router.back()}
            size="sm"
            className="text-[clamp(12px,1.5vw,16px)]"
          >
            {"←"} Back
          </Button>
          <h1 className="text-[clamp(16px,2vw,22px)] font-semibold">
            URL Analytics
          </h1>
        </div>

        {/* Overview Card */}
        <Card>
          <CardHeader>
            <h2 className="text-[clamp(14px,1.8vw,20px)] font-semibold">
              Overview
            </h2>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="text-muted-foreground">Loading…</div>
            ) : error ? (
              <div className="text-red-600 text-sm">{error}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded border p-4">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Total Clicks
                  </div>
                  <div className="text-[clamp(18px,2vw,26px)] font-bold">
                    {summary.total}
                  </div>
                </div>
                <div className="rounded border p-4">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Unique IPs
                  </div>
                  <div className="text-[clamp(18px,2vw,26px)] font-bold">
                    {summary.uniqueIps}
                  </div>
                </div>
                <div className="rounded border p-4">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Devices
                  </div>
                  <div className="text-xs sm:text-sm break-words">
                    {safeMap(
                      Object.entries(summary.byDevice),
                      ([k, v]) => `${k}: ${v}`
                    ).join(", ") || "—"}
                  </div>
                </div>
                <div className="rounded border p-4">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Top Referrers
                  </div>
                  <div className="text-xs sm:text-sm break-words">
                    {safeMap(
                      safeSlice(
                        Object.entries(summary.topReferrers),
                        0,
                        3
                      ),
                      ([k, v]) => `${k}: ${v}`
                    ).join(", ") || "—"}
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Click Events Card */}
        <Card>
          <CardHeader>
            <h2 className="text-[clamp(14px,1.8vw,20px)] font-semibold">
              Click Events
            </h2>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="text-muted-foreground">Loading…</div>
            ) : error ? (
              <div className="text-red-600 text-sm">{error}</div>
            ) : !clicks || clicks.length === 0 ? (
              <div className="text-muted-foreground">No clicks yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table
                  aria-label="Click events"
                  className="min-w-[700px] text-xs sm:text-sm"
                >
                  <TableHeader>
                    <TableColumn className="w-[16%]">Time</TableColumn>
                    <TableColumn className="w-[12%]">IP</TableColumn>
                    <TableColumn className="w-[12%]">Device</TableColumn>
                    <TableColumn className="w-[12%]">OS</TableColumn>
                    <TableColumn className="w-[12%]">Browser</TableColumn>
                    <TableColumn className="w-[16%]">Referrer</TableColumn>
                    <TableColumn className="w-[20%]">Location</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {safeMap(clicks, (c) => (
                      <TableRow key={c.id}>
                        <TableCell className="truncate max-w-[120px]">
                          {new Date(c.clicked_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="truncate max-w-[100px]">
                          {c.ip_address || "—"}
                        </TableCell>
                        <TableCell>{c.device_type || "—"}</TableCell>
                        <TableCell>{c.os || "—"}</TableCell>
                        <TableCell>{c.browser || "—"}</TableCell>
                        <TableCell className="truncate max-w-[120px]">
                          {c.referrer_domain || "direct"}
                        </TableCell>
                        <TableCell className="truncate max-w-[150px]">
                          {c.location || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
