'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  NotificationItem,
  fetchNotificationsFromApi,
  markNotificationsAsRead,
  deleteNotificationFromApi,
} from '@/lib/notifications';
import { updateFaviconBadge } from '@/lib/faviconBadge';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsRead: (id: number | string) => Promise<void>;
  deleteNotification: (id: number | string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const refreshNotifications = useCallback(async () => {
    setLoading(true);
    const data = await fetchNotificationsFromApi();
    setNotifications(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshNotifications();
    // Poll for new notifications every 15 seconds
    const interval = setInterval(refreshNotifications, 15000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  // Gmail-style Document Title & Dynamic Favicon Badge update
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Clean any prior count prefix from title
    let titleClean = document.title;
    if (titleClean.match(/^\(\d+\+?\)\s*/)) {
      titleClean = titleClean.replace(/^\(\d+\+?\)\s*/, '');
    }

    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${titleClean}`;
    } else if (titleClean) {
      document.title = titleClean;
    }

    // Canvas Favicon badge
    updateFaviconBadge(unreadCount);
  }, [unreadCount]);

  const markAllAsRead = async () => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    const data = await markNotificationsAsRead(undefined, true);
    setNotifications(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
  };

  const markAsRead = async (id: number | string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id || n.documentId === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    const data = await markNotificationsAsRead([id], false);
    setNotifications(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
  };

  const deleteNotification = async (id: number | string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id && n.documentId !== id));
    const data = await deleteNotificationFromApi(id);
    setNotifications(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refreshNotifications,
        markAllAsRead,
        markAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
