"use client";
import React, { useEffect, useState } from 'react';
import { Card, CardBody } from '@heroui/react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useNotifications } from '@/contexts/notification-context';

interface NotificationToastProps {
  notification: {
    id: number;
    type: string;
    title: string;
    message: string;
    data: Record<string, unknown>;
    created_at: string;
    is_read: boolean;
  };
  onClose: () => void;
}

export function NotificationToast({ notification, onClose }: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { markAsRead } = useNotifications();

  useEffect(() => {
    const inTimer = setTimeout(() => setIsVisible(true), 100);
    // Auto-dismiss after 5s
    const outTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        markAsRead(notification.id);
        onClose();
      }, 300);
    }, 5000);
    return () => {
      clearTimeout(inTimer);
      clearTimeout(outTimer);
    };
  }, [markAsRead, notification.id, onClose]);

  const getIcon = () => {
    switch (notification.type) {
      case 'url_created':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'url_clicked':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'url_expired':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getColor = () => {
    switch (notification.type) {
      case 'url_created':
        return 'border-green-200 bg-green-50';
      case 'url_clicked':
        return 'border-blue-200 bg-blue-50';
      case 'url_expired':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div
      className={`fixed top-4 left-4 z-50 transform transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
      }`}
    >
      <Card className={`w-80 shadow-lg border ${getColor()}`}>
        <CardBody className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                {notification.title}
              </h4>
              <p className="text-sm text-gray-600 mb-2">
                {notification.message}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {new Date(notification.created_at).toLocaleTimeString()}
                </span>
                {/* Manual close disabled per request */}
                <span className="text-xs text-muted-foreground">Auto-closing…</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
