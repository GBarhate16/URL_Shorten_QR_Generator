"use client";
import React, { useEffect, useState } from 'react';
import { useNotifications } from '@/contexts/notification-context';
import { NotificationToast } from './notification-toast';

export function NotificationContainer() {
  const { notifications } = useNotifications();
  const [activeNotifications, setActiveNotifications] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Add new notifications to active set (ES5-compatible iteration)
    const current = new Set<number>();
    activeNotifications.forEach(id => current.add(id));
    const toAdd = notifications.filter(n => !current.has(n.id)).map(n => n.id);
    if (toAdd.length > 0) {
      setActiveNotifications(prev => {
        const merged = new Set<number>();
        prev.forEach(id => merged.add(id));
        toAdd.forEach(id => merged.add(id));
        return merged;
      });
    }
  }, [notifications, activeNotifications]);

  const handleClose = (id: number) => {
    setActiveNotifications(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const activeNotificationList = notifications.filter(n => activeNotifications.has(n.id));

  return (
    <div className="fixed top-4 left-4 z-50 space-y-2">
      {activeNotificationList.map((notification, index) => (
        <div
          key={notification.id}
          style={{
            transform: `translateY(${index * 20}px)`,
          }}
        >
          <NotificationToast
            notification={notification}
            onClose={() => handleClose(notification.id)}
          />
        </div>
      ))}
    </div>
  );
}
