import { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  ...require('./feed-assembly').default({ strapi }),
  ...require('./ai-intent').default({ strapi }),
  ...require('./ai-stream').default({ strapi }),
  ...require('./video-ingest').default({ strapi }),
  ...require('./seed').default({ strapi }),
  ...require('./interaction').default({ strapi }),
});
