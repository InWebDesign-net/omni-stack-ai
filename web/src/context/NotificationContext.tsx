'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  NotificationItem,
  fetchNotificationsFromApi,
  markNotificationsAsRead,
  deleteNotificationFromApi,
} from '@/lib/notifications';
import { updateFaviconBadge } from '@/lib/faviconBadge';

import { getSocket } from '@/lib/socket';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsRead: (id: number | string) => Promise<void>;
  toggleRead: (id: number | string, isRead: boolean) => Promise<void>;
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

    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (notification: NotificationItem) => {
      console.log('⚡ Real-time notification received via WebSocket:', notification);
      setNotifications((prev) => [notification, ...prev.filter((n) => n.id !== notification.id)]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
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
    const data = await markNotificationsAsRead(undefined, true, true);
    setNotifications(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
  };

  const markAsRead = async (id: number | string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id || n.documentId === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    const data = await markNotificationsAsRead([id], false, true);
    setNotifications(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
  };

  const toggleRead = async (id: number | string, isRead: boolean) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id || n.documentId === id ? { ...n, isRead } : n))
    );
    setUnreadCount((prev) => Math.max(0, isRead ? prev - 1 : prev + 1));
    const data = await markNotificationsAsRead([id], false, isRead);
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
        toggleRead,
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
