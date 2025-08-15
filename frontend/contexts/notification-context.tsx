"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';
import { safeArray, safeSlice, safeMap, safeFilter } from "@/lib/safe-arrays";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  created_at: string;
  is_read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  markAsRead: (id: number) => void;
  clearNotifications: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => safeSlice([notification, ...safeArray(prev)], 0, 10));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => safeMap(safeArray(prev), n => (n.id === id ? { ...n, is_read: true } : n)));
  }, []);

  const clearNotifications = useCallback(() => setNotifications([]), []);

  const unreadCount = safeFilter(notifications, n => !n.is_read).length;

  const value: NotificationContextType = {
    notifications,
    addNotification,
    markAsRead,
    clearNotifications,
    unreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
