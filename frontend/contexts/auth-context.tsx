"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'user';
  is_verified: boolean;
  is_premium: boolean;
  premium_expires_at?: string;
  date_joined: string;
  last_login?: string;
  is_superuser?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (accessToken: string, refreshToken: string, userData: User) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  isAdmin: boolean;
  refreshAccessToken: () => Promise<string | null>;
  getValidAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeExp(token: string | null): number | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload?.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  // Function to refresh access token
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (isRefreshing) return null; // Prevent multiple simultaneous refresh attempts
    
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
      setIsRefreshing(true);
      
      // Check if refresh token is expired
      const refreshExp = decodeExp(refreshToken);
      const nowSec = Math.floor(Date.now() / 1000);
      
      if (refreshExp !== null && refreshExp <= nowSec) {
        // Refresh token expired, logout user
        logout();
        return null;
      }

      // Call refresh endpoint
      const response = await fetch('/api/users/token/refresh/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      const newAccessToken = data.access;
      
      // Update stored access token
      localStorage.setItem('accessToken', newAccessToken);
      
      return newAccessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // Function to get valid access token (with automatic refresh)
  const getValidAccessToken = useCallback(async (): Promise<string | null> => {
    const accessToken = localStorage.getItem('accessToken');
    
    if (!accessToken) return null;

    // Check if access token is expired or about to expire (within 1 minute)
    const accessExp = decodeExp(accessToken);
    const nowSec = Math.floor(Date.now() / 1000);
    
    if (accessExp !== null && accessExp <= nowSec + 60) {
      // Token expired or expiring soon, try to refresh
      return await refreshAccessToken();
    }
    
    return accessToken;
  }, [refreshAccessToken]);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userData = localStorage.getItem('userData');

    const nowSec = Math.floor(Date.now() / 1000);
    const refreshExp = decodeExp(refreshToken);

    const clearAuth = () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');
      setUser(null);
    };

    try {
      if (!refreshToken || (refreshExp !== null && refreshExp <= nowSec)) {
        // Refresh token missing or expired -> force logged-out state
        clearAuth();
        setLoading(false);
        // Redirect quietly to landing/login depending on route
        if (window.location.pathname.startsWith('/dashboard')) {
          router.replace('/login');
        }
        return;
      }

      if (accessToken && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        } catch {
          clearAuth();
        }
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  const login = (accessToken: string, refreshToken: string, userData: User) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userData', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    setUser(null);
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('userData', JSON.stringify(updatedUser));
    }
  };

  const isAdmin = user?.role === 'admin' || user?.is_superuser === true;

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    updateUser,
    isAdmin,
    refreshAccessToken,
    getValidAccessToken, // Expose this for components to use
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
