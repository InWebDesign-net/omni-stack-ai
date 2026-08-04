export default {
  routes: [
    {
      method: 'POST',
      path: '/tracking/batch',
      handler: 'tracking.processBatch',
      config: {
        auth: false,
      },
    },
  ],
};
