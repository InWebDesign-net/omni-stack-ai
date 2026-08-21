import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::notification.notification', ({ strapi }) => ({
  async find(ctx) {
    let userId = ctx.state.user?.id;
    if (!userId) {
      const qUserId = ctx.query.userId || ctx.query.recipientId;
      if (qUserId) userId = Number(qUserId);
    }
    if (!userId) {
      return ctx.unauthorized('Authentication required');
    }

    const limit = Number(ctx.query.pageSize || ctx.query.limit) || 50;
    const page = Number(ctx.query.page) || 1;
    const offset = Number(ctx.query.offset) || (page - 1) * limit;

    const data = await strapi
      .service('api::notification.notification')
      .getUserNotifications(Number(userId), limit, offset);
    return ctx.send(data);
  },

  async markRead(ctx) {
    let userId = ctx.state.user?.id;
    const body = ctx.request.body || {};
    if (!userId) {
      const targetUser = body.userId || body.recipientId;
      if (targetUser) userId = Number(targetUser);
    }
    if (!userId) {
      return ctx.unauthorized('Authentication required');
    }

    const { notificationIds, markAll, isRead } = body;
    const targetIsRead = isRead !== undefined ? Boolean(isRead) : true;

    const result = await strapi
      .service('api::notification.notification')
      .markAsRead(Number(userId), notificationIds, Boolean(markAll), targetIsRead);

    return ctx.send(result);
  },

  async deleteOne(ctx) {
    let userId = ctx.state.user?.id;
    if (!userId) {
      const qUserId = ctx.query.userId || ctx.query.recipientId;
      if (qUserId) userId = Number(qUserId);
    }
    if (!userId) {
      return ctx.unauthorized('Authentication required');
    }

    const { id } = ctx.params;
    const result = await strapi
      .service('api::notification.notification')
      .deleteUserNotification(Number(userId), id);

    return ctx.send(result);
  },

  async create(ctx) {
    const user = ctx.state.user;
    const body = ctx.request.body?.data || ctx.request.body || {};
    const { recipient, recipientId, recipientHandle, targetUserHandle, type, title, message, link, contentTitle } = body;

    let targetRecipientId = recipientId || recipient;

    if (!targetRecipientId && (recipientHandle || targetUserHandle)) {
      const normHandle = String(recipientHandle || targetUserHandle).replace(/^@/, '').toLowerCase();
      const matchedUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: {
          $or: [
            { handle: { $eq: `@${normHandle}` } },
            { handle: { $eq: normHandle } },
            { username: { $eq: normHandle } },
          ],
        },
      });
      if (matchedUser) {
        targetRecipientId = matchedUser.id;
      }
    }

    if (!targetRecipientId || !title || !message) {
      return ctx.badRequest('recipient, title and message required');
    }

    const notification = await strapi.service('api::notification.notification').createOrBucketNotification({
      recipientId: Number(targetRecipientId),
      senderId: user?.id ? Number(user.id) : undefined,
      senderUsername: user?.username || user?.handle,
      type: type || 'chat_message',
      title,
      message,
      link,
      contentTitle,
    });

    return ctx.send({ notification });
  },
}));
