import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { setNotificationHandler } from '@services/notificationService';
import { prepareAndroidNotifications } from '@services/androidNotifications';

export type NotificationType = 'success' | 'error' | 'info';
export type NotificationAnimation = 'slide' | 'fade' | 'scale';

export type NotificationPayload = {
  type?: NotificationType;
  title: string;
  message?: string;
  durationMs?: number;
  animation?: NotificationAnimation;
  scope?: string;
};

export type NotificationItem = NotificationPayload & {
  id: string;
  createdAt: number;
};

type NotificationContextValue = {
  notify: (payload: NotificationPayload) => void;
  notifications: NotificationItem[];
  dismiss: (id: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const counterRef = useRef(0);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    const timer = timersRef.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timersRef.current[id];
    }
  }, []);

  const notify = useCallback((payload: NotificationPayload) => {
    counterRef.current += 1;
    const durationMs = payload.durationMs ?? 2200;
    const next: NotificationItem = {
      id: `${Date.now()}-${counterRef.current}`,
      createdAt: Date.now(),
      durationMs,
      ...payload,
    };
    setNotifications((prev) => [...prev, next]);
    timersRef.current[next.id] = setTimeout(() => dismiss(next.id), durationMs + 260);
  }, [dismiss]);

  useEffect(() => {
    setNotificationHandler(notify);
    return () => setNotificationHandler(null);
  }, [notify]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void prepareAndroidNotifications();
  }, []);

  const value = useMemo(
    () => ({
      notify,
      notifications,
      dismiss,
    }),
    [dismiss, notifications, notify],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
