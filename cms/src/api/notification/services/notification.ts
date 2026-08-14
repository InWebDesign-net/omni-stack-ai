import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::notification.notification', ({ strapi }) => ({
  async getUserNotifications(userId: number) {
    if (!userId) return { notifications: [], unreadCount: 0 };

    const notifications = await strapi.db.query('api::notification.notification').findMany({
      where: { recipient: { id: userId } },
      orderBy: { createdAt: 'DESC' },
      limit: 50,
      populate: ['sender'],
    });

    const unreadCount = await strapi.db.query('api::notification.notification').count({
      where: {
        recipient: { id: userId },
        isRead: false,
      },
    });

    return {
      notifications: notifications.map((n: any) => ({
        id: n.id,
        documentId: n.documentId || String(n.id),
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        isRead: Boolean(n.isRead),
        createdAt: n.createdAt,
        sender: n.sender
          ? {
              id: n.sender.id,
              username: n.sender.username,
              avatarUrl: n.sender.avatarUrl,
            }
          : null,
      })),
      unreadCount,
    };
  },

  async markAsRead(userId: number, notificationIds?: (number | string)[], markAll = false) {
    if (!userId) return { success: false };

    if (markAll) {
      await strapi.db.query('api::notification.notification').updateMany({
        where: { recipient: { id: userId }, isRead: false },
        data: { isRead: true },
      });
    } else if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      await strapi.db.query('api::notification.notification').updateMany({
        where: {
          recipient: { id: userId },
          id: { $in: notificationIds },
        },
        data: { isRead: true },
      });
    }

    return this.getUserNotifications(userId);
  },

  async deleteUserNotification(userId: number, notificationId: number | string) {
    if (!userId || !notificationId) return { success: false };

    await strapi.db.query('api::notification.notification').delete({
      where: {
        id: notificationId,
        recipient: { id: userId },
      },
    });

    return this.getUserNotifications(userId);
  },

  async createNotification(params: {
    recipientId: number;
    senderId?: number;
    type: 'chat_message' | 'comment_reply' | 'new_video' | 'new_subscriber';
    title: string;
    message: string;
    link?: string;
  }) {
    const { recipientId, senderId, type, title, message, link } = params;
    if (!recipientId) return null;

    // Do not notify self
    if (senderId && senderId === recipientId) return null;

    const notification = await strapi.db.query('api::notification.notification').create({
      data: {
        recipient: recipientId,
        sender: senderId || null,
        type,
        title,
        message,
        link: link || '',
        isRead: false,
      },
    });

    return notification;
  },
}));
