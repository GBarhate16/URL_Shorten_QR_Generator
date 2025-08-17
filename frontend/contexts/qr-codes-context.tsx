"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { API_CONFIG } from '@/config/api';
import { useQRAnalytics } from '@/hooks/use-qr-analytics';
import { useDashboardData } from '@/contexts/dashboard-data-context';

export interface QRCodeContent {
  url?: string;
  wifi?: {
    ssid: string;
    password: string;
    encryption: 'WPA' | 'WEP' | 'nopass';
    hidden?: boolean;
  };
  text?: string;
  vcard?: {
    name: string;
    phone?: string;
    email?: string;
    company?: string;
    title?: string;
    address?: string;
  };
  event?: {
    title: string;
    description?: string;
    location?: string;
    startTime: string;
    endTime?: string;
  };
  file?: {
    name: string;
    url: string;
    type: string;
    size: number;
  };
}

export interface QRCodeCustomization {
  foreground_color?: string;
  background_color?: string;
  size?: number;
  logo?: string;
  style?: 'square' | 'rounded' | 'circle';
  border?: boolean;
}

export interface QRCode {
  id: number;
  user: number;
  title: string;
  description?: string;
  qr_type: 'url' | 'wifi' | 'text' | 'vcard' | 'event' | 'file';
  is_dynamic: boolean;
  content: QRCodeContent;
  qr_image?: string;
  qr_image_url?: string;
  short_code: string;
  redirect_url?: string;
  customization: QRCodeCustomization;
  status: 'active' | 'inactive' | 'expired';
  expires_at?: string;
  created_at: string;
  updated_at: string;
  scan_count?: number;
  files?: QRCodeFile[];
}

export interface QRCodeFile {
  id: number;
  file: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
}

export interface QRCodeScan {
  id: number;
  qr_code: number;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  country?: string;
  city?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  scanned_at: string;
}

export interface QRCodeStats {
  totalQrCodes: number;
  totalScans: number;
  activeQrCodes: number;
  dynamicQrCodes: number;
}

export interface CreateQRCodeData {
  title: string;
  description?: string;
  qr_type: 'url' | 'wifi' | 'text' | 'vcard' | 'event' | 'file';
  is_dynamic: boolean;
  content: QRCodeContent;
  customization: QRCodeCustomization;
  expires_at?: string | null;
}

interface QRCodesContextType {
  qrCodes: QRCode[];
  stats: QRCodeStats;
  isLoading: boolean;
  isInitializing: boolean; // New state for initial data fetch
  error: Error | null;
  createQrCode: (qrData: CreateQRCodeData) => Promise<QRCode | null>;
  updateQrCode: (id: number, qrData: Partial<CreateQRCodeData>) => Promise<QRCode | null>;
  deleteQrCode: (id: number) => Promise<boolean>;
  toggleQrCodeStatus: (id: number) => Promise<boolean>;
  downloadQrCode: (id: number, title?: string) => Promise<void>;
  uploadFile: (file: File) => Promise<{ file_url: string; file_name: string; file_size: number; file_type: string }>;
  refetch: () => Promise<void>;
  refetchStats: () => Promise<void>;
  hasInitialized: boolean;
}

const QRCodesContext = createContext<QRCodesContextType | undefined>(undefined);

export function QRCodesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, getValidAccessToken } = useAuth();
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [stats, setStats] = useState<QRCodeStats>({
    totalQrCodes: 0,
    totalScans: 0,
    activeQrCodes: 0,
    dynamicQrCodes: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Get QR analytics hook for refreshing analytics data
  const { mutate: refreshQRAnalytics } = useQRAnalytics("30d");
  
  // Get dashboard data context for refreshing all dashboard data
  const { refetchAll: refreshDashboardData } = useDashboardData();

  const fetchQrCodes = useCallback(async () => {
    const token = await getValidAccessToken();
    if (!token) {
      setError(new Error('No access token'));
      return;
    }

    setIsLoading(true);
    setError(null);

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
      setQrCodes(data.results || data);
      setHasInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch QR codes'));
    } finally {
      setIsLoading(false);
    }
  }, [getValidAccessToken]);

  const fetchStats = useCallback(async () => {
    const token = await getValidAccessToken();
    if (!token) {
      setError(new Error('No access token'));
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.QR_STATS}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch QR code stats: ${response.status}`);
      }

      const data = await response.json();
      setStats({
        totalQrCodes: data.total_qr_codes || 0,
        totalScans: data.total_scans || 0,
        activeQrCodes: data.active_qr_codes || 0,
        dynamicQrCodes: data.dynamic_qr_codes || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch QR code stats'));
    }
  }, [getValidAccessToken]);

  const createQrCode = useCallback(async (qrData: CreateQRCodeData): Promise<QRCode | null> => {
    const token = await getValidAccessToken();
    if (!token) {
      throw new Error('No access token');
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.QR_CODES}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(qrData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to create QR code: ${response.status}`);
      }

      const newQrCode = await response.json();
      setQrCodes(prev => {
        // Ensure prev is always an array
        const prevArray = Array.isArray(prev) ? prev : [];
        return [newQrCode, ...prevArray];
      });
      await fetchStats();
      refreshQRAnalytics();
      refreshDashboardData(); // Refresh all dashboard data
      return newQrCode;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create QR code');
    }
  }, [getValidAccessToken, fetchStats, refreshQRAnalytics, refreshDashboardData]);

  const updateQrCode = useCallback(async (id: number, qrData: Partial<CreateQRCodeData>): Promise<QRCode | null> => {
    const token = await getValidAccessToken();
    if (!token) {
      throw new Error('No access token');
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.QR_CODES}${id}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(qrData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update QR code: ${response.status}`);
      }

      const updatedQrCode = await response.json();
      setQrCodes(prev => {
        const prevArray = Array.isArray(prev) ? prev : [];
        return prevArray.map(qr => qr.id === id ? updatedQrCode : qr);
      });
      return updatedQrCode;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update QR code');
    }
  }, [getValidAccessToken]);

  const deleteQrCode = useCallback(async (id: number): Promise<boolean> => {
    const token = await getValidAccessToken();
    if (!token) {
      throw new Error('No access token');
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.QR_CODES}${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete QR code: ${response.status}`);
      }

      setQrCodes(prev => {
        const prevArray = Array.isArray(prev) ? prev : [];
        return prevArray.filter(qr => qr.id !== id);
      });
      await fetchStats();
      refreshQRAnalytics();
      refreshDashboardData(); // Refresh all dashboard data
      return true;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete QR code');
    }
  }, [getValidAccessToken, fetchStats, refreshQRAnalytics, refreshDashboardData]);

  const toggleQrCodeStatus = useCallback(async (id: number): Promise<boolean> => {
    const token = await getValidAccessToken();
    if (!token) {
      throw new Error('No access token');
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/qr/codes/${id}/toggle_status/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to toggle QR code status: ${response.status}`);
      }

      const updatedQrCode = await response.json();
      setQrCodes(prev => {
        const prevArray = Array.isArray(prev) ? prev : [];
        return prevArray.map(qr => 
          qr.id === id 
            ? { ...qr, status: updatedQrCode.status, status_display: updatedQrCode.status_display }
            : qr
        );
      });
      
      // Refresh stats and analytics after status change
      await fetchStats();
      refreshQRAnalytics();
      refreshDashboardData(); // Refresh all dashboard data
      
      return true;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to toggle QR code status');
    }
  }, [getValidAccessToken, fetchStats, refreshQRAnalytics, refreshDashboardData]);

  const downloadQrCode = useCallback(async (id: number, title?: string): Promise<void> => {
    const token = await getValidAccessToken();
    if (!token) {
      throw new Error('No access token');
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.QR_CODES}${id}/download/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download QR code: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const filename = title ? `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr.png` : 'qr_code.png';
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to download QR code');
    }
  }, [getValidAccessToken]);

  const uploadFile = useCallback(async (file: File): Promise<{ file_url: string; file_name: string; file_size: number; file_type: string }> => {
    const token = await getValidAccessToken();
    if (!token) {
      throw new Error('No access token');
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.QR_FILE_UPLOAD}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to upload file: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to upload file');
    }
  }, [getValidAccessToken]);

  // Pre-fetch data as soon as user is authenticated
  useEffect(() => {
    if (isAuthenticated && !hasInitialized) {
      setIsInitializing(true);
      Promise.all([fetchQrCodes(), fetchStats()]).finally(() => {
        setIsInitializing(false);
      });
    }
  }, [isAuthenticated, hasInitialized, fetchQrCodes, fetchStats]);

  const value: QRCodesContextType = {
    qrCodes,
    stats,
    isLoading,
    isInitializing,
    error,
    createQrCode,
    updateQrCode,
    deleteQrCode,
    toggleQrCodeStatus,
    downloadQrCode,
    uploadFile,
    refetch: fetchQrCodes,
    refetchStats: fetchStats,
    hasInitialized,
  };

  return (
    <QRCodesContext.Provider value={value}>
      {children}
    </QRCodesContext.Provider>
  );
}

export function useQrCodes() {
  const context = useContext(QRCodesContext);
  if (context === undefined) {
    throw new Error('useQrCodes must be used within a QRCodesProvider');
  }
  return context;
}
