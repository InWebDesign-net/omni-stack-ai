export default {
  routes: [
    {
      method: 'GET',
      path: '/images/filtered',
      handler: 'api::image.image.filtered',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/images/tags',
      handler: 'api::image.image.tags',
      config: {
        auth: false,
      },
    },
  ],
};
