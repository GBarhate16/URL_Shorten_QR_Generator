import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

interface NotificationPayload {
  id: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  created_at: string;
  is_read: boolean;
}

interface WebSocketMessage {
  type: string;
  notification?: NotificationPayload;
  url_id?: number;
  click_count?: number;
  message?: string;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  sendMessage: (message: unknown) => void;
  lastMessage: WebSocketMessage | null;
}

export function useWebSocket(): UseWebSocketReturn {
  const { isAuthenticated, user } = useAuth();
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const reconnectTimer = useRef<number | null>(null);

  // Feature flag: disable WS unless explicitly enabled
  const wsEnabled = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_WS_ENABLED === 'true';

  const connect = useCallback(() => {
    if (!wsEnabled) return; // disabled
    if (!isAuthenticated || !user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const qs = token ? `?token=${encodeURIComponent(token)}` : '';
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/notifications/${qs}`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        setLastMessage(data);
      } catch {
        // ignore
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      if (!wsEnabled) return;
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = window.setTimeout(() => connect(), 3000);
    };

    ws.current.onerror = () => {
      setIsConnected(false);
    };
  }, [isAuthenticated, user, wsEnabled]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: unknown) => {
    if (!wsEnabled) return;
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, [wsEnabled]);

  useEffect(() => {
    if (wsEnabled && isAuthenticated && user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [wsEnabled, isAuthenticated, user, connect, disconnect]);

  // Reconnect on focus
  useEffect(() => {
    const handleFocus = () => {
      if (wsEnabled && isAuthenticated && user && !isConnected) {
        connect();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [wsEnabled, isAuthenticated, user, isConnected, connect]);

  return {
    isConnected,
    sendMessage,
    lastMessage,
  };
}
