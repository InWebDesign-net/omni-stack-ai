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
import { useApp } from '@/context/AppContext';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  totalCount: number;
  loading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  refreshNotifications: () => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsRead: (id: number | string) => Promise<void>;
  toggleRead: (id: number | string, isRead: boolean) => Promise<void>;
  deleteNotification: (id: number | string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useApp();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const refreshNotifications = useCallback(async () => {
    setLoading(true);
    const data = await fetchNotificationsFromApi(1, 30);
    setNotifications(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
    setTotalCount(data.totalCount || (data.notifications || []).length);
    setPage(1);
    setHasMore((data.notifications || []).length >= 30);
    setLoading(false);
  }, []);

  const loadMoreNotifications = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const data = await fetchNotificationsFromApi(nextPage, 30);
    const incoming = data.notifications || [];
    if (incoming.length < 30) {
      setHasMore(false);
    }
    if (incoming.length > 0) {
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const filtered = incoming.filter((n) => !existingIds.has(n.id));
        return [...prev, ...filtered];
      });
      setPage(nextPage);
    }
    if (typeof data.totalCount === 'number') {
      setTotalCount(data.totalCount);
    }
    setIsLoadingMore(false);
  }, [page, hasMore, isLoadingMore]);

  // Re-fetch notifications whenever user logs in, logs out, or session changes
  useEffect(() => {
    refreshNotifications();
  }, [currentUser?.id, currentUser?.username, currentUser?.handle, refreshNotifications]);

  // WebSocket real-time listener & 30s fallback polling
  useEffect(() => {
    const socket = getSocket();

    const handleNewNotification = (notification: NotificationItem) => {
      console.log('⚡ Real-time notification received via WebSocket:', notification);
      setNotifications((prev) => [notification, ...prev.filter((n) => n.id !== notification.id)]);
      setUnreadCount((prev) => prev + 1);
    };

    if (socket) {
      socket.on('notification:new', handleNewNotification);
    }

    // 30-second interval fallback poll
    const interval = setInterval(() => {
      refreshNotifications();
    }, 30000);

    return () => {
      if (socket) {
        socket.off('notification:new', handleNewNotification);
      }
      clearInterval(interval);
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
    if (data && Array.isArray(data.notifications)) {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount ?? 0);
    }
  };

  const markAsRead = async (id: number | string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id || n.documentId === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    const data = await markNotificationsAsRead([id], false, true);
    if (data && Array.isArray(data.notifications)) {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount ?? 0);
    }
  };

  const toggleRead = async (id: number | string, isRead: boolean) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id || n.documentId === id ? { ...n, isRead } : n))
    );
    setUnreadCount((prev) => {
      const target = notifications.find((n) => n.id === id || n.documentId === id);
      if (target && target.isRead !== isRead) {
        return Math.max(0, isRead ? prev - 1 : prev + 1);
      }
      return prev;
    });
    const data = await markNotificationsAsRead([id], false, isRead);
    if (data && Array.isArray(data.notifications)) {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount ?? 0);
    }
  };

  const deleteNotification = async (id: number | string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id && n.documentId !== id));
    setUnreadCount((prev) => {
      const target = notifications.find((n) => n.id === id || n.documentId === id);
      if (target && !target.isRead) {
        return Math.max(0, prev - 1);
      }
      return prev;
    });
    const data = await deleteNotificationFromApi(id);
    if (data && Array.isArray(data.notifications)) {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount ?? 0);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        totalCount,
        loading,
        hasMore,
        isLoadingMore,
        refreshNotifications,
        loadMoreNotifications,
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
