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
    {
      method: 'POST',
      path: '/feed/seed-demo',
      handler: 'feed.seedDemoData',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/feed/test-i18n',
      handler: 'feed.testI18nLink',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/feed/ingest-finalized',
      handler: 'feed.ingestFinalizedVideo',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/feed/toggle-publish',
      handler: 'feed.togglePublish',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/feed/create-video',
      handler: 'feed.createVideo',
      config: {
        auth: false,
      },
    },
  ],
};
