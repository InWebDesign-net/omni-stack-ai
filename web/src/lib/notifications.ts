import { jsonAuthHeaders } from './affinity';

export interface NotificationItem {
  id: number | string;
  documentId: string;
  type: 'chat_message' | 'comment_reply' | 'new_video' | 'new_subscriber';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    id: number;
    username: string;
    avatarUrl?: string;
  } | null;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

export async function fetchNotificationsFromApi(): Promise<NotificationsResponse> {
  try {
    const res = await fetch('/api/notifications', {
      headers: jsonAuthHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return { notifications: [], unreadCount: 0 };
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return { notifications: [], unreadCount: 0 };
  }
}

export async function markNotificationsAsRead(
  notificationIds?: (number | string)[],
  markAll = false,
  isRead = true
): Promise<NotificationsResponse> {
  try {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ notificationIds, markAll, isRead }),
    });
    if (!res.ok) return { notifications: [], unreadCount: 0 };
    return await res.json();
  } catch (error) {
    console.error('Failed to mark notifications read:', error);
    return { notifications: [], unreadCount: 0 };
  }
}

export async function deleteNotificationFromApi(id: number | string): Promise<NotificationsResponse> {
  try {
    const res = await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: jsonAuthHeaders(),
    });
    if (!res.ok) return { notifications: [], unreadCount: 0 };
    return await res.json();
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return { notifications: [], unreadCount: 0 };
  }
}
