export default {
  routes: [
    {
      method: 'GET',
      path: '/articles/filtered',
      handler: 'article.filtered',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/articles/tags',
      handler: 'article.tags',
      config: { policies: [] },
    },
  ],
};
