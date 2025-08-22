"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { API_CONFIG } from '@/config/api';

// Import types from existing contexts
import { QRCode } from '@/contexts/qr-codes-context';
import { ShortenedURL } from '@/hooks/use-urls';
import { AnalyticsResponse } from '@/hooks/use-analytics';
import { QRAnalyticsResponse } from '@/hooks/use-qr-analytics';

// Types for dashboard data
export interface DashboardStats {
  urls: {
    totalUrls: number;
    totalClicks: number;
    activeUrls: number;
  };
  qrCodes: {
    totalQrCodes: number;
    totalScans: number;
    activeQrCodes: number;
    dynamicQrCodes: number;
  };
}

export interface DashboardData {
  urls: ShortenedURL[];
  qrCodes: QRCode[];
  analytics: AnalyticsResponse | null;
  qrAnalytics: QRAnalyticsResponse | null;
  stats: DashboardStats;
  isInitializing: boolean;
  hasInitialized: boolean;
  error: Error | null;
  refetchAll: () => Promise<void>;
  clearData: () => void;
}

interface DashboardDataContextType extends DashboardData {}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const [urls, setUrls] = useState<ShortenedURL[]>([]);
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [qrAnalytics, setQrAnalytics] = useState<QRAnalyticsResponse | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    urls: { totalUrls: 0, totalClicks: 0, activeUrls: 0 },
    qrCodes: { totalQrCodes: 0, totalScans: 0, activeQrCodes: 0, dynamicQrCodes: 0 }
  });
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isAuthenticated, getValidAccessToken } = useAuth();

  // Fetch URLs data
  const fetchUrls = useCallback(async () => {
    const token = await getValidAccessToken();
    if (!token) return [];

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.URLS}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch URLs: ${response.status}`);
      }

      const data = await response.json();
      const urlArray = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
      
      // Calculate URL stats
      const urlStats = {
        totalUrls: urlArray.length,
        totalClicks: urlArray.reduce((sum: number, url: ShortenedURL) => sum + (url.click_count || 0), 0),
        activeUrls: urlArray.filter((url: ShortenedURL) => !url.expires_at || new Date(url.expires_at) > new Date()).length
      };

      setUrls(urlArray);
      setStats(prev => ({ ...prev, urls: urlStats }));
      return urlArray;
    } catch (err) {
      console.error('Failed to fetch URLs:', err);
      return [];
    }
  }, [getValidAccessToken]);

  // Fetch QR codes data
  const fetchQrCodes = useCallback(async () => {
    const token = await getValidAccessToken();
    if (!token) return [];

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.QR_CODES}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch QR codes: ${response.status}`);
      }

      const data = await response.json();
      const qrArray = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
      
      // Calculate QR code stats
      const qrStats = {
        totalQrCodes: qrArray.length,
        totalScans: qrArray.reduce((sum: number, qr: QRCode) => sum + (qr.scan_count || 0), 0),
        activeQrCodes: qrArray.filter((qr: QRCode) => qr.status === 'active').length,
        dynamicQrCodes: qrArray.filter((qr: QRCode) => qr.is_dynamic).length
      };

      setQrCodes(qrArray);
      setStats(prev => ({ ...prev, qrCodes: qrStats }));
      return qrArray;
    } catch (err) {
      console.error('Failed to fetch QR codes:', err);
      return [];
    }
  }, [getValidAccessToken]);

  // Fetch QR code stats
  const fetchQrStats = useCallback(async () => {
    const token = await getValidAccessToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.QR_STATS}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(prev => ({
          ...prev,
          qrCodes: {
            totalQrCodes: data.total_qr_codes || 0,
            totalScans: data.total_scans || 0,
            activeQrCodes: data.active_qr_codes || 0,
            dynamicQrCodes: data.dynamic_qr_codes || 0,
          }
        }));
      }
    } catch (err) {
      console.error('Failed to fetch QR code stats:', err);
    }
  }, [getValidAccessToken]);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    const token = await getValidAccessToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.URLS_ANALYTICS}?range=30d`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  }, [getValidAccessToken]);

  // Fetch QR analytics data
  const fetchQRAnalytics = useCallback(async () => {
    const token = await getValidAccessToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.QR_ANALYTICS}?range=30d`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQrAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to fetch QR analytics:', err);
    }
  }, [getValidAccessToken]);

  // Pre-fetch all dashboard data
  const fetchAllData = useCallback(async () => {
    if (!isAuthenticated || hasInitialized) return;

    setIsInitializing(true);
    setError(null);

    try {
      // Fetch all data in parallel for better performance
      await Promise.all([
        fetchUrls(),
        fetchQrCodes(),
        fetchQrStats(),
        fetchAnalytics(),
        fetchQRAnalytics()
      ]);

      setHasInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard data'));
    } finally {
      setIsInitializing(false);
    }
  }, [isAuthenticated, hasInitialized, fetchUrls, fetchQrCodes, fetchQrStats, fetchAnalytics, fetchQRAnalytics]);

  // Refetch all data
  const refetchAll = useCallback(async () => {
    setIsInitializing(true);
    setError(null);

    try {
      await Promise.all([
        fetchUrls(),
        fetchQrCodes(),
        fetchQrStats(),
        fetchAnalytics(),
        fetchQRAnalytics()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refetch dashboard data'));
    } finally {
      setIsInitializing(false);
    }
  }, [fetchUrls, fetchQrCodes, fetchQrStats, fetchAnalytics, fetchQRAnalytics]);

  // Pre-fetch data as soon as user is authenticated
  useEffect(() => {
    if (isAuthenticated && !hasInitialized) {
      fetchAllData();
    }
  }, [isAuthenticated, hasInitialized, fetchAllData]);

  // Function to manually clear all data
  const clearData = useCallback(() => {
    
    setUrls([]);
    setQrCodes([]);
    setAnalytics(null);
    setQrAnalytics(null);
    setStats({
      urls: { totalUrls: 0, totalClicks: 0, activeUrls: 0 },
      qrCodes: { totalQrCodes: 0, totalScans: 0, activeQrCodes: 0, dynamicQrCodes: 0 }
    });
    setHasInitialized(false);
    setError(null);
    
  }, []);

  // Clear data when user logs out or authentication changes
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear all data when user is not authenticated
      clearData();
    }
  }, [isAuthenticated, clearData]);

  // Clear data when user ID changes (handles token refresh scenarios)
  useEffect(() => {
    const currentUserId = localStorage.getItem('userData') ? 
      JSON.parse(localStorage.getItem('userData') || '{}').id : null;
    
    if (currentUserId && hasInitialized) {
      // Check if user ID has changed
      const lastUserId = localStorage.getItem('lastUserId');
      if (lastUserId && lastUserId !== currentUserId.toString()) {
        // User ID changed, clear data and re-fetch
        clearData();
        setHasInitialized(false);
      }
      // Update last user ID
      localStorage.setItem('lastUserId', currentUserId.toString());
    }
  }, [hasInitialized, clearData]);

  // Listen for logout events to clear data
  useEffect(() => {
    const handleUserLogout = () => {
      clearData();
    };

    window.addEventListener('userLoggedOut', handleUserLogout);
    
    return () => {
      window.removeEventListener('userLoggedOut', handleUserLogout);
    };
  }, [clearData]);

  const value: DashboardDataContextType = {
    urls,
    qrCodes,
    analytics,
    qrAnalytics,
    stats,
    isInitializing,
    hasInitialized,
    error,
    refetchAll,
    clearData,
  };

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (context === undefined) {
    throw new Error('useDashboardData must be used within a DashboardDataProvider');
  }
  return context;
}
