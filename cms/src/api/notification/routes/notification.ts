export default {
  routes: [
    {
      method: 'GET',
      path: '/notifications',
      handler: 'api::notification.notification.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/notifications/mark-read',
      handler: 'api::notification.notification.markRead',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/notifications/:id',
      handler: 'api::notification.notification.deleteOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/notifications',
      handler: 'api::notification.notification.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
