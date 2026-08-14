import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::notification.notification', ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user;
    if (!user?.id) {
      return ctx.unauthorized('Authentication required');
    }

    const data = await strapi.service('api::notification.notification').getUserNotifications(user.id);
    return ctx.send(data);
  },

  async markRead(ctx) {
    const user = ctx.state.user;
    if (!user?.id) {
      return ctx.unauthorized('Authentication required');
    }

    const { notificationIds, markAll } = ctx.request.body || {};
    const result = await strapi
      .service('api::notification.notification')
      .markAsRead(user.id, notificationIds, Boolean(markAll));

    return ctx.send(result);
  },

  async deleteOne(ctx) {
    const user = ctx.state.user;
    if (!user?.id) {
      return ctx.unauthorized('Authentication required');
    }

    const { id } = ctx.params;
    const result = await strapi
      .service('api::notification.notification')
      .deleteUserNotification(user.id, id);

    return ctx.send(result);
  },
}));
