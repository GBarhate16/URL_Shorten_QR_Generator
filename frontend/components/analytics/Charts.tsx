"use client";

import { useMemo, useState } from "react";
import type { AnalyticsResponse, AnalyticsRange } from "@/hooks/use-analytics";
import { Button } from "@heroui/button";
import { BarChart2, Globe, MonitorSmartphone, MousePointerClick, Link2, RefreshCcw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type OverviewStats = { totalUrls: number; totalClicks: number; activeUrls: number };

interface ChartsProps {
  analytics: AnalyticsResponse | undefined;
  loading: boolean;
  error?: Error;
  range: AnalyticsRange;
  setRange: (r: AnalyticsRange) => void;
  stats: OverviewStats;
  onRefresh?: () => void;
}

export default function AnalyticsCharts({ analytics, loading, error, range, setRange, stats, onRefresh }: ChartsProps) {
  const [activeTab, setActiveTab] = useState<'countries' | 'devices' | 'browsers' | 'referrers'>('countries');
  const isMobile = useIsMobile();
  const seriesData = useMemo(() => {
    if (!analytics || !analytics.series) return { urls: [], clicks: [] };
    
    const formatDate = (iso: string) => new Date(iso).toLocaleDateString();
    
    // Ensure the arrays exist before calling .map()
    const urlsCreated = Array.isArray(analytics.series.urls_created) ? analytics.series.urls_created : [];
    const clicks = Array.isArray(analytics.series.clicks) ? analytics.series.clicks : [];
    
    return {
      urls: urlsCreated.map((p) => ({ date: formatDate(p.date), count: p.count })),
      clicks: clicks.map((p) => ({ date: formatDate(p.date), count: p.count })),
    };
  }, [analytics]);

  const palette = [
    "#6366F1",
    "#22C55E",
    "#F59E0B",
    "#EF4444",
    "#06B6D4",
    "#A855F7",
    "#84CC16",
    "#F472B6",
    "#10B981",
    "#0EA5E9",
  ];

  const avgClicks = useMemo(() => (stats.totalUrls ? Math.round((stats.totalClicks / stats.totalUrls) * 10) / 10 : 0), [stats]);

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total URLs</p>
              <p className="text-2xl font-bold">{stats.totalUrls}</p>
            </div>
            <Link2 className="h-6 w-6 text-primary" />
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-emerald-500/10 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Clicks</p>
              <p className="text-2xl font-bold">{stats.totalClicks}</p>
            </div>
            <MousePointerClick className="h-6 w-6 text-emerald-500" />
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-indigo-500/10 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Clicks / URL</p>
              <p className="text-2xl font-bold">{avgClicks}</p>
            </div>
            <BarChart2 className="h-6 w-6 text-indigo-500" />
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-fuchsia-500/10 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active URLs</p>
              <p className="text-2xl font-bold">{stats.activeUrls}</p>
            </div>
            <Globe className="h-6 w-6 text-fuchsia-500" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold">Analytics</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {(["7d", "30d", "90d", "180d", "365d"] as AnalyticsRange[]).map((r) => (
            <Button key={r} size="sm" variant={range === r ? "solid" : "flat"} color="primary" onPress={() => setRange(r)}>
              {r.toUpperCase()}
            </Button>
          ))}
          <Button size="sm" variant="flat" onPress={onRefresh} startContent={<RefreshCcw className="h-4 w-4" />}>Refresh</Button>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="col-span-1 xl:col-span-2 bg-card rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold">Activity Over Time</h3>
            <div className="text-xs text-muted-foreground">Auto-updates every 5s</div>
          </div>
          <div className="p-4 h-[240px] sm:h-[300px] md:h-[360px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-red-600 text-sm">{error.message}</div>
            ) : !analytics ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <XAxis
                    dataKey="date"
                    type="category"
                    allowDuplicatedCategory={false}
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                    interval={isMobile ? "preserveStartEnd" : 0}
                    minTickGap={isMobile ? 28 : 10}
                    tickMargin={8}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <Tooltip />
                  {!isMobile && <Legend />}
                  <Line dataKey="count" data={seriesData.urls} name="URLs Created" type="monotone" stroke="#6366F1" strokeWidth={2} dot={false} />
                  <Line dataKey="count" data={seriesData.clicks} name="Clicks" type="monotone" stroke="#22C55E" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Breakdown with Tabs */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold">Breakdown</h3>
            <div className="flex gap-1">
              <Button size="sm" variant={activeTab === 'countries' ? 'solid' : 'flat'} onPress={() => setActiveTab('countries')} startContent={<Globe className="h-4 w-4" />}>Countries</Button>
              <Button size="sm" variant={activeTab === 'devices' ? 'solid' : 'flat'} onPress={() => setActiveTab('devices')} startContent={<MonitorSmartphone className="h-4 w-4" />}>Devices</Button>
              <Button size="sm" variant={activeTab === 'browsers' ? 'solid' : 'flat'} onPress={() => setActiveTab('browsers')}>Browsers</Button>
              <Button size="sm" variant={activeTab === 'referrers' ? 'solid' : 'flat'} onPress={() => setActiveTab('referrers')}>Referrers</Button>
            </div>
          </div>
          <div className="p-4 h-[240px] sm:h-[300px] md:h-[360px]">
            {!analytics ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">No data</div>
            ) : activeTab === 'countries' ? (
              analytics.breakdowns?.countries?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.breakdowns.countries} layout={isMobile ? "vertical" : "horizontal"}>
                    {isMobile ? (
                      <>
                        <XAxis type="number" tick={{ fontSize: 10 }} hide />
                        <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 10 }} />
                      </>
                    ) : (
                      <>
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={60} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      </>
                    )}
                    <Tooltip />
                    <Bar dataKey="count" fill="#06B6D4" maxBarSize={isMobile ? 18 : 28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No country data</div>
              )
            ) : activeTab === 'devices' ? (
              analytics.breakdowns?.devices?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.breakdowns.devices} dataKey="count" nameKey="label" innerRadius={isMobile ? 36 : 50} outerRadius={isMobile ? 60 : 80}>
                      {analytics.breakdowns.devices.map((_, idx) => (
                        <Cell key={idx} fill={palette[idx % palette.length]} />
                      ))}
                    </Pie>
                    {!isMobile && <Legend />}
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No device data</div>
              )
            ) : activeTab === 'browsers' ? (
              analytics.breakdowns?.browsers?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.breakdowns.browsers} dataKey="count" nameKey="label" innerRadius={isMobile ? 36 : 50} outerRadius={isMobile ? 60 : 80}>
                      {analytics.breakdowns.browsers.map((_, idx) => (
                        <Cell key={idx} fill={palette[idx % palette.length]} />
                      ))}
                    </Pie>
                    {!isMobile && <Legend />}
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No browser data</div>
              )
            ) : (
              analytics.breakdowns?.referrers?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.breakdowns.referrers} layout={isMobile ? "vertical" : "horizontal"}>
                    {isMobile ? (
                      <>
                        <XAxis type="number" tick={{ fontSize: 10 }} hide />
                        <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 10 }} />
                      </>
                    ) : (
                      <>
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={60} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      </>
                    )}
                    <Tooltip />
                    <Bar dataKey="count" fill="#A855F7" maxBarSize={isMobile ? 18 : 28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No referrer data</div>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}


