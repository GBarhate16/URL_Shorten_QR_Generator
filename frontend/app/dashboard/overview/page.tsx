"use client";

import { useState } from "react";
import { useDashboardData } from "@/contexts/dashboard-data-context";
import { useAnalytics, type AnalyticsRange } from "@/hooks/use-analytics";
import { useQRAnalytics } from "@/hooks/use-qr-analytics";
import { Button } from "@heroui/button";
import { BarChart2, Globe, MonitorSmartphone, MousePointerClick, Link2, RefreshCcw, QrCode, Scan } from "lucide-react";
import { useMemo } from "react";
import { safeArray } from "@/lib/safe-arrays";
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

export default function OverviewPage() {
  const { stats: dashboardStats, isInitializing: dashboardInitializing, error: dashboardError } = useDashboardData();
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const {
    analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    mutate,
  } = useAnalytics(range);
  
  const {
    analytics: qrAnalytics,
    isLoading: qrAnalyticsLoading,
    error: qrAnalyticsError,
    mutate: qrMutate,
  } = useQRAnalytics(range);

  const avgClicks = useMemo(() => (dashboardStats.urls.totalUrls ? Math.round((dashboardStats.urls.totalClicks / dashboardStats.urls.totalUrls) * 10) / 10 : 0), [dashboardStats.urls]);
  const avgScans = useMemo(() => (dashboardStats.qrCodes.totalQrCodes ? Math.round((dashboardStats.qrCodes.totalScans / dashboardStats.qrCodes.totalQrCodes) * 10) / 10 : 0), [dashboardStats.qrCodes]);

  const seriesData = useMemo(() => {
    if (!analytics || !analytics.series || !qrAnalytics || !qrAnalytics.series) {
      return { combined: [], clicks: [] };
    }
    
    const formatDate = (iso: string) => new Date(iso).toLocaleDateString();
    
    const urlsCreated = safeArray(analytics.series.urls_created);
    const clicks = safeArray(analytics.series.clicks);
    const qrCodesCreated = safeArray(qrAnalytics.series.qr_codes_created);
    const scans = safeArray(qrAnalytics.series.scans);
    
    // Create a map of dates to combine data
    const dateMap = new Map();
    
    // Add URL data
    urlsCreated.forEach((item) => {
      const date = formatDate(item.date);
      dateMap.set(date, { date, urlCount: item.count, qrCount: 0, clicks: 0, scans: 0 });
    });
    
    // Add QR data
    qrCodesCreated.forEach((item) => {
      const date = formatDate(item.date);
      if (dateMap.has(date)) {
        dateMap.get(date).qrCount = item.count;
      } else {
        dateMap.set(date, { date, urlCount: 0, qrCount: item.count, clicks: 0, scans: 0 });
      }
    });
    
    // Add clicks data
    clicks.forEach((item) => {
      const date = formatDate(item.date);
      if (dateMap.has(date)) {
        dateMap.get(date).clicks = item.count;
      } else {
        dateMap.set(date, { date, urlCount: 0, qrCount: 0, clicks: item.count, scans: 0 });
      }
    });
    
    // Add scans data
    scans.forEach((item) => {
      const date = formatDate(item.date);
      if (dateMap.has(date)) {
        dateMap.get(date).scans = item.count;
      } else {
        dateMap.set(date, { date, urlCount: 0, qrCount: 0, clicks: 0, scans: item.count });
      }
    });
    
    const combinedData = Array.from(dateMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return {
      combined: combinedData,
      clicks: combinedData,
    };
  }, [analytics, qrAnalytics]);

  const palette = [
    "#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4",
    "#A855F7", "#84CC16", "#F472B6", "#10B981", "#0EA5E9",
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 w-full max-w-7xl mx-auto">
      {/* Error Message */}
      {dashboardError && (
        <div className="p-3 sm:p-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-center sm:text-left">
          <p className="text-red-700 text-sm sm:text-base">
            Error loading dashboard data: {dashboardError.message}
          </p>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Dashboard Overview</h1>
        <p className="text-gray-300">
          Comprehensive analytics dashboard showing URLs and QR codes performance, engagement patterns, and user insights.
        </p>
      </div>

      {/* Combined KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* URLs KPIs */}
        <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total URLs</p>
              <p className="text-2xl font-bold">{dashboardStats.urls.totalUrls}</p>
            </div>
            <Link2 className="h-6 w-6 text-primary" />
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-emerald-500/10 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Clicks</p>
              <p className="text-2xl font-bold">{dashboardStats.urls.totalClicks}</p>
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
              <p className="text-2xl font-bold">{dashboardStats.urls.activeUrls}</p>
            </div>
            <Globe className="h-6 w-6 text-fuchsia-500" />
          </div>
        </div>
      </div>

      {/* QR Codes KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border bg-gradient-to-br from-purple-500/10 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total QR Codes</p>
              <p className="text-2xl font-bold">{dashboardStats.qrCodes.totalQrCodes}</p>
            </div>
            <QrCode className="h-6 w-6 text-purple-500" />
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-orange-500/10 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Scans</p>
              <p className="text-2xl font-bold">{dashboardStats.qrCodes.totalScans}</p>
            </div>
            <Scan className="h-6 w-6 text-orange-500" />
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-teal-500/10 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Scans / QR</p>
              <p className="text-2xl font-bold">{avgScans}</p>
            </div>
            <BarChart2 className="h-6 w-6 text-teal-500" />
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-cyan-500/10 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active QR Codes</p>
              <p className="text-2xl font-bold">{dashboardStats.qrCodes.activeQrCodes}</p>
            </div>
            <MonitorSmartphone className="h-6 w-6 text-cyan-500" />
          </div>
        </div>
      </div>

      {/* Range Selector and Refresh */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          {(['7d', '30d', '90d', '180d', '365d'] as const).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "solid" : "bordered"}
              onPress={() => setRange(r)}
              className="min-w-0 px-3"
            >
              {r}
            </Button>
          ))}
        </div>
        <div className="ml-auto">
          <Button
            size="sm"
            variant="bordered"
            onPress={() => {
              mutate();
              qrMutate();
            }}
            startContent={<RefreshCcw className="h-4 w-4" />}
            isLoading={analyticsLoading || qrAnalyticsLoading || dashboardInitializing}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {analyticsError && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg text-center sm:text-left">
          <p className="text-red-700 text-sm sm:text-base">
            Error loading analytics: {analyticsError.message}
          </p>
        </div>
      )}

      {/* QR Analytics Error Message */}
      {qrAnalyticsError && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg text-center sm:text-left">
          <p className="text-red-700 text-sm sm:text-base">
            Error loading QR analytics: {qrAnalyticsError.message}
          </p>
        </div>
      )}

      {/* Combined Activity Chart */}
      <div className="rounded-xl border p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Activity Over Time</h3>
        {analyticsLoading || qrAnalyticsLoading || dashboardInitializing ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={seriesData.combined}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="urlCount"
                stroke="#6366F1"
                strokeWidth={2}
                name="URLs Created"
              />
              <Line
                type="monotone"
                dataKey="qrCount"
                stroke="#A855F7"
                strokeWidth={2}
                name="QR Codes Created"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Clicks Chart */}
      <div className="rounded-xl border p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Engagement Over Time</h3>
        {analyticsLoading || qrAnalyticsLoading || dashboardInitializing ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={seriesData.clicks}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#22C55E"
                strokeWidth={2}
                name="URL Clicks"
              />
              <Line
                type="monotone"
                dataKey="scans"
                stroke="#F59E0B"
                strokeWidth={2}
                name="QR Scans"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Breakdown Charts */}
      <div className="space-y-6">
        {/* URL Analytics Breakdown */}
        <div className="rounded-xl border p-6">
          <h3 className="text-lg font-semibold mb-4">URL Analytics Breakdown</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Countries */}
            <div>
              <h4 className="text-md font-medium mb-3">Countries</h4>
              {analyticsLoading || dashboardInitializing ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={safeArray(analytics?.breakdowns?.countries)}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                    >
                      {safeArray(analytics?.breakdowns?.countries).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Devices */}
            <div>
              <h4 className="text-md font-medium mb-3">Devices</h4>
              {analyticsLoading || dashboardInitializing ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={safeArray(analytics?.breakdowns?.devices)}>
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#22C55E" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Browsers */}
            <div>
              <h4 className="text-md font-medium mb-3">Browsers</h4>
              {analyticsLoading || dashboardInitializing ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={safeArray(analytics?.breakdowns?.browsers)}>
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* QR Analytics Breakdown */}
        <div className="rounded-xl border p-6">
          <h3 className="text-lg font-semibold mb-4">QR Analytics Breakdown</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Countries */}
            <div>
              <h4 className="text-md font-medium mb-3">Countries</h4>
              {qrAnalyticsLoading || dashboardInitializing ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={safeArray(qrAnalytics?.breakdowns?.countries)}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                    >
                      {safeArray(qrAnalytics?.breakdowns?.countries).map((entry, index) => (
                        <Cell key={`qr-cell-${index}`} fill={palette[index % palette.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Devices */}
            <div>
              <h4 className="text-md font-medium mb-3">Devices</h4>
              {qrAnalyticsLoading || dashboardInitializing ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={safeArray(qrAnalytics?.breakdowns?.devices)}>
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#A855F7" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Browsers */}
            <div>
              <h4 className="text-md font-medium mb-3">Browsers</h4>
              {qrAnalyticsLoading || dashboardInitializing ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={safeArray(qrAnalytics?.breakdowns?.browsers)}>
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#06B6D4" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
