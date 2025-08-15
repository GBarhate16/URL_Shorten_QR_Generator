"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { Button } from "@heroui/button";
import { API_CONFIG, getApiUrl } from "@/config/api";
import { safeArray, safeMap, safeSlice } from "@/lib/safe-arrays";

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
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    if (!refreshToken) return null;
    const resp = await fetch(getApiUrl('LOGIN').replace('/login/', '/token/refresh/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    localStorage.setItem('accessToken', data.access);
    return data.access as string;
  }, []);

  const fetchClicks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!accessToken) {
        router.replace('/login');
        return;
      }
      let resp = await fetch(`${API_CONFIG.BASE_URL}/api/urls/${urlId}/clicks/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (resp.status === 401) {
        const newToken = await refreshAccess();
        if (!newToken) {
          router.replace('/login');
          return;
        }
        resp = await fetch(`${API_CONFIG.BASE_URL}/api/urls/${urlId}/clicks/`, {
          headers: { Authorization: `Bearer ${newToken}` },
        });
      }
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `Failed (${resp.status})`);
      }
      const data: Click[] = await resp.json();
      setClicks(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load stats';
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
    const uniqueIps = new Set(safeMap(list, c => c.ip_address || '')).size;
    const uniqueReferrers = new Set(
      safeMap(list, c => c.referrer_domain || 'direct')
    ).size;
    const byDevice = list.reduce<Record<string, number>>((acc, c) => {
      const key = (c.device_type || 'unknown').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const topReferrers = list
      .map(c => c.referrer_domain || 'direct')
      .reduce<Record<string, number>>((acc, r) => { acc[r] = (acc[r] || 0) + 1; return acc; }, {});
    return { total, uniqueIps, byDevice, topReferrers };
  }, [clicks]);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="light" onPress={() => router.back()}>{"←"} Back</Button>
          <h1 className="text-xl font-semibold">URL Analytics</h1>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Overview</h2>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="text-muted-foreground">Loading…</div>
            ) : error ? (
              <div className="text-red-600 text-sm">{error}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded border p-4">
                  <div className="text-sm text-muted-foreground">Total Clicks</div>
                  <div className="text-2xl font-bold">{summary.total}</div>
                </div>
                <div className="rounded border p-4">
                  <div className="text-sm text-muted-foreground">Unique IPs</div>
                  <div className="text-2xl font-bold">{summary.uniqueIps}</div>
                </div>
                <div className="rounded border p-4">
                  <div className="text-sm text-muted-foreground">Devices</div>
                  <div className="text-sm">{Object.entries(summary.byDevice).map(([k,v]) => `${k}: ${v}`).join(', ') || '—'}</div>
                </div>
                <div className="rounded border p-4">
                  <div className="text-sm text-muted-foreground">Top Referrers</div>
                  <div className="text-sm">{Object.entries(summary.topReferrers).slice(0,3).map(([k,v]) => `${k}: ${v}`).join(', ') || '—'}</div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Click Events</h2>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="text-muted-foreground">Loading…</div>
            ) : error ? (
              <div className="text-red-600 text-sm">{error}</div>
            ) : !clicks || clicks.length === 0 ? (
              <div className="text-muted-foreground">No clicks yet.</div>
            ) : (
              <Table aria-label="Click events" className="w-full">
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
                      <TableCell>{new Date(c.clicked_at).toLocaleString()}</TableCell>
                      <TableCell>{c.ip_address || '—'}</TableCell>
                      <TableCell>{c.device_type || '—'}</TableCell>
                      <TableCell>{c.os || '—'}</TableCell>
                      <TableCell>{c.browser || '—'}</TableCell>
                      <TableCell>{c.referrer_domain || 'direct'}</TableCell>
                      <TableCell>{c.location || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
