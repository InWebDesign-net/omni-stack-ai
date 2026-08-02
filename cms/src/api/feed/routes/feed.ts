export default {
  routes: [
    {
      method: 'POST',
      path: '/feed/assembly',
      handler: 'feed.assembleFeed',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/feed/assembly',
      handler: 'feed.assembleFeed',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/feed/ai-intent',
      handler: 'feed.processAiIntent',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/feed/demo-reset',
      handler: 'feed.resetDemoData',
      config: {
        auth: false,
      },
    },
  ],
};
