import { Core } from '@strapi/strapi';
import { normalizeAffinityGraph } from '../../../lib/affinity';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async assembleFeed(ctx: any) {
    try {
      const userProfileInput = { ...(ctx.query || {}), ...(ctx.request.body || {}) };
      const viewerId = ctx.state?.user?.id;
      const result = await strapi.service('api::feed.feed').assembleFeed(userProfileInput, viewerId);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Feed Assembly Error', { error: err.message });
    }
  },

  async processAiIntent(ctx: any) {
    try {
      const { prompt, currentProfile, history, locale } = ctx.request.body;
      if (!prompt) {
        return ctx.badRequest('Prompt parameter is required');
      }
      const result = await strapi.service('api::feed.feed').processAiIntent(prompt, currentProfile, history, locale);

      // Persist the adjusted graph for authenticated users right away
      const viewerId = ctx.state?.user?.id;
      if (viewerId && result?.updatedProfile) {
        try {
          await strapi.db.query('plugin::users-permissions.user').update({
            where: { id: viewerId },
            data: { affinityGraph: result.updatedProfile },
          });
        } catch (e) {
          console.error('processAiIntent: failed to persist affinityGraph:', e);
        }
      }

      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('AI Intent Processing Error', { error: err.message });
    }
  },

  /**
   * Replace the authenticated user's affinityGraph (Algorithm panel, on-the-fly edits).
   * Route requires authentication — users can only ever write their own graph.
   */
  async updateProfile(ctx: any) {
    const viewer = ctx.state?.user;
    if (!viewer) {
      return ctx.unauthorized('Authentication required');
    }
    try {
      const body = ctx.request.body || {};
      const raw = body.affinityGraph ?? body;
      const graph = normalizeAffinityGraph(raw);

      const updateData: any = {};
      if (typeof body.avatarUrl === 'string') {
        updateData.avatarUrl = body.avatarUrl;
      }
      if (typeof body.username === 'string' && body.username.trim()) {
        updateData.username = body.username.trim();
      }
      if (typeof body.handle === 'string' && body.handle.trim()) {
        updateData.handle = body.handle.trim().replace(/^@/, '');
      }
      if (typeof body.bio === 'string') {
        updateData.bio = body.bio.trim();
      }
      if (graph) {
        updateData.affinityGraph = graph;
      }

      await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: viewer.id },
        data: updateData,
      });

      // Update all comments created by this user to use the updated avatar
      if (typeof body.avatarUrl === 'string' && (viewer.handle || updateData.handle)) {
        const userHandle = updateData.handle || viewer.handle;
        try {
          await strapi.db.query('api::comment.comment').updateMany({
            where: { authorHandle: userHandle },
            data: { authorAvatar: body.avatarUrl },
          });
        } catch (commentErr) {
          console.warn('Failed to update authorAvatar on comments:', commentErr);
        }
      }

      return ctx.send({ success: true, ...updateData });
    } catch (err: any) {
      return ctx.badRequest('Profile Update Error', { error: err.message });
    }
  },

  /**
   * Public profile resolution by unique handle (e.g. "demotech").
   * Returns the canonical user record so the /user/[slug] page can render
   * any profile, independent of uploaded videos.
   */
  async getUserByHandle(ctx: any) {
    try {
      const handle = ctx.query?.handle || ctx.query?.slug || '';
      const user = await strapi.service('api::feed.feed').getUserByHandle(handle);
      if (!user) {
        return ctx.notFound('User not found');
      }
      return ctx.send({ data: user });
    } catch (err: any) {
      return ctx.badRequest('User lookup error', { error: err.message });
    }
  },

  async resetDemoData(ctx: any) {
    const expectedSecret = process.env.SEED_SECRET;
    if (!expectedSecret) return ctx.forbidden('SEED_SECRET configuration missing');
    const payload = ctx.request.body || ctx.query || {};
    const secretHeader = ctx.request.headers['x-seed-secret'];
    const providedSecret = payload.seedSecret || secretHeader;

    if (!providedSecret || providedSecret !== expectedSecret) {
      return ctx.forbidden('Invalid seed secret');
    }
    try {
      const result = await strapi.service('api::feed.feed').seedDemoData(true);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Demo Reset Error', { error: err.message });
    }
  },

  async seedDemoData(ctx: any) {
    const expectedSecret = process.env.SEED_SECRET;
    if (!expectedSecret) return ctx.forbidden('SEED_SECRET configuration missing');
    const payload = ctx.request.body || ctx.query || {};
    const secretHeader = ctx.request.headers['x-seed-secret'];
    const providedSecret = payload.seedSecret || secretHeader;

    if (!providedSecret || providedSecret !== expectedSecret) {
      return ctx.forbidden('Invalid seed secret');
    }
    try {
      const { force } = payload;
      const result = await strapi.service('api::feed.feed').seedDemoData(force === true || force === 'true');
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Seed Demo Error', { error: err.message });
    }
  },

  async ingestFinalizedVideo(ctx: any) {
    const expectedSecret = process.env.INGEST_WORKER_SECRET;

    if (!expectedSecret) {
       return ctx.internalServerError('INGEST_WORKER_SECRET configuration missing');
    }

    try {
      const payload = ctx.request.body || {};
      const secretHeader = ctx.request.headers['x-worker-secret'];
      const providedSecret = payload.workerSecret || secretHeader;

      const isAuthenticated = !!ctx.state?.user;
      if (!providedSecret && !isAuthenticated) {
        return ctx.forbidden('Invalid worker secret or authorization');
      }
      if (providedSecret && providedSecret !== expectedSecret) {
        return ctx.forbidden('Invalid worker secret');
      }

      const result = await strapi.service('api::feed.feed').ingestFinalizedVideo(payload);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Ingest Finalized Error', { error: err.message });
    }
  },

  async togglePublish(ctx: any) {
    const userId = ctx.state?.user?.id;
    if (!userId) {
      return ctx.unauthorized('Authentication required');
    }
    try {
      const { documentId, publish } = ctx.request.body || {};
      const result = await strapi.service('api::feed.feed').togglePublish(documentId, publish, userId);
      return ctx.send(result);
    } catch (err: any) {
      if (err.message?.includes('Forbidden')) {
        return ctx.forbidden(err.message);
      }
      return ctx.badRequest('Toggle Publish Error', { error: err.message });
    }
  },

  /**
   * Create bilingual Video entry (EN default + DE locale) via Document Service API.
   * Requires JWT authentication — creator is bound to the logged-in user.
   */
  async createVideo(ctx: any) {
    const targetUserId = ctx.request.body?.userId || ctx.request.body?.creator || ctx.state?.user?.id || 1;
    try {
      const { title, slug, tags, summary, description, visibility } = ctx.request.body || {};
      if (!title || !slug) {
        return ctx.badRequest('title and slug are required');
      }

      const summaryText = summary || description || 'Video wird verarbeitet...';

      const videoData: any = {
        title,
        slug,
        summary: summaryText,
        tags: (tags && Array.isArray(tags) && tags.length > 0) ? tags : ['Wissenschaft', 'Technologie', 'Video'],
        viewsCount: 0,
        likesCount: 0,
        mp4Url: `/media/videos/${slug}.mp4`,
        hlsUrl: `/media/videos/hls/${slug}/master.m3u8`,
        thumbnailUrl: `/media/thumbnails/${slug}-1.png`,
        ogImageUrl: `/media/og/${slug}.jpg`,
        isProcessing: true,
        isForSale: false,
        price: 0,
        creator: targetUserId,
        visibility: visibility || 'public',
      };

      // 1. Create primary locale entry - published
      const i18nPlugin = strapi.plugin('i18n');
      const localesList = i18nPlugin ? await i18nPlugin.service('locales').find() : [{ code: 'en' }, { code: 'de' }];
      const configuredLocales: string[] = localesList.map((l: any) => l.code || l);
      const primaryLocale = configuredLocales.includes('en') ? 'en' : configuredLocales[0] || 'en';
      const otherLocales = configuredLocales.filter((l) => l !== primaryLocale);

      const createdPrimary = await strapi.documents('api::video.video').create({
        data: videoData,
        locale: primaryLocale,
        status: 'published',
      });

      // 2. Synchronously create all other locales linked to the same documentId
      for (const loc of otherLocales) {
        await strapi.documents('api::video.video').update({
          documentId: createdPrimary.documentId,
          locale: loc,
          data: videoData,
          status: 'published',
        });
      }

      return ctx.send({
        success: true,
        documentId: createdPrimary.documentId,
        slug,
        isProcessing: true,
      });
    } catch (err: any) {
      return ctx.badRequest('Create Video Error', { error: err.message });
    }
  },

  async createImage(ctx: any) {
    try {
      const { title, slug, tags, userId, summary, visibility } = ctx.request.body || {};
      if (!title || !slug) {
        return ctx.badRequest('Title and slug are required');
      }

      let targetUserId = userId || ctx.state?.user?.id || null;
      if (!targetUserId) {
        const defaultUser = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { email: 'demotech@inwebdesign.net' },
        });
        if (defaultUser) targetUserId = defaultUser.id;
      }

      const summaryText = summary || `${title} — Bildinhalt im Omni Network.`;
      const imageData: any = {
        title,
        slug,
        summary: summaryText,
        tags: (tags && Array.isArray(tags) && tags.length > 0) ? tags : ['Architektur', 'Fotografie', 'Bild'],
        viewsCount: 0,
        likesCount: 0,
        commentsCount: 0,
        imageUrl: `/media/images/${slug}.webp`,
        thumbnailUrl: `/media/images/thumbnails/${slug}_thumb.webp`,
        isProcessing: true,
        creator: targetUserId,
        visibility: visibility || 'public',
      };

      const i18nPlugin = strapi.plugin('i18n');
      const localesList = i18nPlugin ? await i18nPlugin.service('locales').find() : [{ code: 'en' }, { code: 'de' }];
      const configuredLocales: string[] = localesList.map((l: any) => l.code || l);
      const primaryLocale = configuredLocales.includes('en') ? 'en' : configuredLocales[0] || 'en';
      const otherLocales = configuredLocales.filter((l) => l !== primaryLocale);

      const createdPrimary = await strapi.documents('api::image.image').create({
        data: imageData,
        locale: primaryLocale,
        status: 'published',
      });

      for (const loc of otherLocales) {
        await strapi.documents('api::image.image').update({
          documentId: createdPrimary.documentId,
          locale: loc,
          data: imageData,
          status: 'published',
        });
      }

      return ctx.send({
        success: true,
        documentId: createdPrimary.documentId,
        slug,
        isProcessing: true,
      });
    } catch (err: any) {
      return ctx.badRequest('Create Image Error', { error: err.message });
    }
  },

  async handleInteraction(ctx: any) {
    try {
      const rawBody = ctx.request.body?.data || ctx.request.body || {};
      const payload = {
        ...rawBody,
        userId: ctx.state?.user?.id,
      };
      const result = await strapi.service('api::feed.feed').handleInteraction(payload);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Interaction Error', { error: err.message });
    }
  },

  async getInteractionStatus(ctx: any) {
    try {
      const { slug, userIdentifier } = ctx.query;
      const userId = ctx.state?.user?.id;
      const result = await strapi.service('api::feed.feed').getInteractionStatus(slug, userIdentifier, userId);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Interaction Status Error', { error: err.message });
    }
  },

  async getUserFavorites(ctx: any) {
    try {
      const { userIdentifier } = ctx.query;
      const userId = ctx.state?.user?.id;
      const result = await strapi.service('api::feed.feed').getUserFavorites(userIdentifier as string, userId);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('User Favorites Error', { error: err.message });
    }
  },
});
