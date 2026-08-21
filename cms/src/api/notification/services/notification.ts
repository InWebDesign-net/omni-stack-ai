import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::notification.notification', ({ strapi }) => ({
  async getUserNotifications(userId: number, limit = 50, offset = 0) {
    if (!userId) return { notifications: [], unreadCount: 0, totalCount: 0 };

    const notifications = await strapi.db.query('api::notification.notification').findMany({
      where: { recipient: { id: userId } },
      orderBy: { createdAt: 'DESC' },
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
      populate: ['sender'],
    });

    const totalCount = await strapi.db.query('api::notification.notification').count({
      where: { recipient: { id: userId } },
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
      totalCount,
    };
  },

  async markAsRead(userId: number, notificationIds?: (number | string)[], markAll = false, targetIsRead = true) {
    if (!userId) return { success: false };

    let whereClause: any = { recipient: { id: userId } };

    if (!markAll && Array.isArray(notificationIds) && notificationIds.length > 0) {
      const numIds = notificationIds.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0);
      const strIds = notificationIds.map((id) => String(id));

      const orConds: any[] = [];
      if (numIds.length > 0) orConds.push({ id: { $in: numIds } });
      if (strIds.length > 0) orConds.push({ documentId: { $in: strIds } });

      if (orConds.length > 0) {
        whereClause = {
          recipient: { id: userId },
          $or: orConds,
        };
      }
    }

    const matches = await strapi.db.query('api::notification.notification').findMany({
      where: whereClause,
      select: ['id'],
    });

    const targetIds = matches.map((m: any) => m.id);

    if (targetIds.length > 0) {
      await strapi.db.query('api::notification.notification').updateMany({
        where: { id: { $in: targetIds } },
        data: { isRead: Boolean(targetIsRead) },
      });
    }

    return this.getUserNotifications(userId);
  },

  async deleteUserNotification(userId: number, notificationId: number | string) {
    if (!userId || !notificationId) return { success: false };

    const numId = Number(notificationId);
    const strId = String(notificationId);

    const matches = await strapi.db.query('api::notification.notification').findMany({
      where: {
        recipient: { id: userId },
        $or: [
          ...(!isNaN(numId) && numId > 0 ? [{ id: numId }] : []),
          { documentId: strId },
        ],
      },
      select: ['id'],
    });

    const targetIds = matches.map((m: any) => m.id);

    if (targetIds.length > 0) {
      await strapi.db.query('api::notification.notification').deleteMany({
        where: { id: { $in: targetIds } },
      });
    }

    return this.getUserNotifications(userId);
  },

  async createNotification(params: {
    recipientId: number;
    senderId?: number;
    type: 'chat_message' | 'comment_reply' | 'new_comment' | 'new_video' | 'new_subscriber';
    title: string;
    message: string;
    link?: string;
  }) {
    const { recipientId, senderId, type, title, message, link } = params;
    if (!recipientId) return null;

    if (senderId && Number(senderId) === Number(recipientId)) return null;

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

  async createOrBucketNotification(params: {
    recipientId: number;
    senderId?: number;
    senderUsername?: string;
    type: 'chat_message' | 'comment_reply' | 'new_comment' | 'new_video' | 'new_subscriber';
    title: string;
    message: string;
    link?: string;
    contentTitle?: string;
  }) {
    const { recipientId, senderId, senderUsername, type, title, message, link, contentTitle } = params;
    if (!recipientId) return null;

    if (senderId && Number(senderId) === Number(recipientId)) return null;

    const cleanLink = link || '';
    const baseLink = cleanLink.split('#')[0];

    if (baseLink && (type === 'comment_reply' || type === 'new_comment')) {
      const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const existing = await strapi.db.query('api::notification.notification').findMany({
        where: {
          recipient: { id: recipientId },
          isRead: false,
          createdAt: { $gte: oneDayAgo },
        },
        orderBy: { createdAt: 'DESC' },
        limit: 10,
      });

      const match = (existing || []).find((n: any) => n.link && n.link.split('#')[0] === baseLink);

      if (match) {
        const existingSenders: string[] = match.message.match(/@[\w.-]+/g) || [];
        const newSenderTag = senderUsername ? `@${senderUsername.replace(/^@/, '')}` : (senderId ? `@user${senderId}` : 'Jemand');
        
        let sendersList = existingSenders;
        if (!sendersList.includes(newSenderTag)) {
          sendersList = [newSenderTag, ...sendersList];
        }

        const totalCount = sendersList.length;
        let bucketMessage = message;
        if (totalCount === 1) {
          bucketMessage = `${sendersList[0]} hat ${contentTitle ? `"${contentTitle}"` : 'deinen Inhalt'} kommentiert`;
        } else if (totalCount === 2) {
          bucketMessage = `${sendersList[0]} und ${sendersList[1]} haben ${contentTitle ? `"${contentTitle}"` : 'deinen Inhalt'} kommentiert`;
        } else {
          bucketMessage = `${sendersList[0]}, ${sendersList[1]} und ${totalCount - 2} weitere haben ${contentTitle ? `"${contentTitle}"` : 'deinen Inhalt'} kommentiert`;
        }

        await strapi.db.query('api::notification.notification').update({
          where: { id: match.id },
          data: {
            message: bucketMessage,
            link: cleanLink,
            createdAt: new Date().toISOString(),
          },
        });

        return match;
      }
    }

    return this.createNotification({ recipientId, senderId, type, title, message, link: cleanLink });
  },
}));

