import { Core } from '@strapi/strapi';

const dailyViewsSet = new Set<string>();

export default ({ strapi }: { strapi: Core.Strapi }) => ({


  async getInteractionStatus(slug: string, userIdentifier: string = 'anonymous', userId?: number | string) {
    const today = new Date().toISOString().split('T')[0];
    const viewKey = `view:${slug}:${userIdentifier}:${today}`;
    const hasViewedToday = dailyViewsSet.has(viewKey);

    let viewsCount = 0;
    let likesCount = 0;
    let isLiked = false;

    let targetVideoDocId: string | null = null;
    let targetFeedItemDocId: string | null = null;

    try {
      const videoMatches = await strapi.documents('api::video.video').findMany({
        filters: { slug: slug },
        locale: '*',
      });
      if (videoMatches && videoMatches.length > 0) {
        viewsCount = Number((videoMatches[0] as any).viewsCount || 0);
        likesCount = Number((videoMatches[0] as any).likesCount || 0);
        targetVideoDocId = (videoMatches[0] as any).documentId;
      } else {
        const feedMatches = await strapi.documents('api::feed-item.feed-item').findMany({
          filters: { slug: slug },
          locale: '*',
        });
        if (feedMatches && feedMatches.length > 0) {
          viewsCount = Number((feedMatches[0] as any).viewsCount || 0);
          likesCount = Number((feedMatches[0] as any).likesCount || 0);
          targetFeedItemDocId = (feedMatches[0] as any).documentId;
        }
      }
    } catch (e) {}

    // Query Fav collection relation in database
    try {
      const favFilters: any[] = [{ userIdentifier: { $eq: userIdentifier } }];
      if (userId) favFilters.push({ user: { id: { $eq: userId } } });

      const favQuery: any = {
        filters: {
          $or: favFilters,
        },
      };

      if (targetVideoDocId) {
        favQuery.filters.video = { documentId: { $eq: targetVideoDocId } };
      } else if (targetFeedItemDocId) {
        favQuery.filters.feedItem = { documentId: { $eq: targetFeedItemDocId } };
      }

      const favs = await strapi.documents('api::fav.fav').findMany(favQuery);
      if (favs && favs.length > 0) {
        isLiked = true;
      }
    } catch (e) {}

    return {
      slug,
      isLiked,
      hasViewedToday,
      viewsCount,
      likesCount,
    };
  },

  async handleInteraction(payload: {
    slug: string;
    type: 'view' | 'like' | 'unlike';
    watchTimeSeconds?: number;
    userIdentifier?: string;
    userId?: number | string;
  }) {
    console.log('[handleInteraction] incoming payload:', JSON.stringify(payload));
    const slug = (payload?.slug || '').trim();
    const type = payload?.type;
    const watchTimeSeconds = Number(payload?.watchTimeSeconds || 0);
    let userId = payload?.userId;
    const userIdentifier = payload?.userIdentifier || 'anonymous';

    if (!userId && userIdentifier && userIdentifier !== 'anonymous') {
      try {
        const cleanIdent = String(userIdentifier).trim().replace(/^@/, '');
        const foundUser = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: {
            $or: [
              { handle: cleanIdent },
              { username: cleanIdent },
              { email: cleanIdent },
            ],
          },
        });
        if (foundUser) {
          userId = foundUser.id;
        }
      } catch (e) {}
    }

    const today = new Date().toISOString().split('T')[0];
    const viewKey = `view:${slug}:${userIdentifier}:${today}`;

    if (!slug) {
      return { success: false, error: 'Slug is required' };
    }

    let videoMatches: any[] = [];
    let feedMatches: any[] = [];
    let imageMatches: any[] = [];
    try {
      videoMatches = await strapi.documents('api::video.video').findMany({
        filters: { slug: { $eq: slug } },
        status: 'published',
        locale: '*',
      });
      if (videoMatches.length === 0) {
        videoMatches = await strapi.db.query('api::video.video').findMany({ where: { slug } });
      }

      imageMatches = await strapi.documents('api::image.image').findMany({
        filters: { slug: { $eq: slug } },
        status: 'published',
        locale: '*',
      });
      if (imageMatches.length === 0) {
        imageMatches = await strapi.db.query('api::image.image').findMany({ where: { slug } });
      }

      feedMatches = await strapi.documents('api::feed-item.feed-item').findMany({
        filters: { slug: { $eq: slug } },
        status: 'published',
        locale: '*',
      });
      if (feedMatches.length === 0) {
        feedMatches = await strapi.db.query('api::feed-item.feed-item').findMany({ where: { slug } });
      }
    } catch (e: any) {
      console.error('Error in handleInteraction findMany:', e.message || e);
    }

    if (videoMatches.length === 0 && feedMatches.length === 0 && imageMatches.length === 0) {
      return { success: false, error: 'Entity not found' };
    }

    const currentItem = videoMatches[0] || imageMatches[0] || feedMatches[0];
    let currentViewsCount = Number(currentItem?.viewsCount || 0);
    let currentLikesCount = Number(currentItem?.likesCount || 0);
    const targetVideoId = videoMatches[0]?.id || null;
    const targetVideoDocId = videoMatches[0]?.documentId || null;
    const targetImageId = imageMatches[0]?.id || null;
    const targetImageDocId = imageMatches[0]?.documentId || null;
    const targetFeedItemId = feedMatches[0]?.id || null;
    const targetFeedItemDocId = feedMatches[0]?.documentId || null;
    const tags: string[] = currentItem?.tags || ['Community'];

    if (type === 'view') {
      const mediaType = currentItem?.mediaType || (imageMatches.length > 0 ? 'image' : 'video');
      const requiredDuration = (mediaType === 'video' || mediaType === 'short') ? 5 : 3;

      if (mediaType !== 'image' && watchTimeSeconds < requiredDuration) {
        return {
          success: true,
          counted: false,
          reason: 'duration_below_threshold',
          requiredDuration,
          currentViewsCount,
          currentLikesCount,
        };
      }

      if (dailyViewsSet.has(viewKey)) {
        return {
          success: true,
          counted: false,
          reason: 'already_viewed_today',
          currentViewsCount,
          currentLikesCount,
        };
      }

      dailyViewsSet.add(viewKey);
      currentViewsCount += 1;

      for (const doc of videoMatches) {
        try {
          await strapi.documents('api::video.video').update({
            documentId: doc.documentId,
            locale: doc.locale || 'de',
            status: 'published',
            data: { viewsCount: currentViewsCount } as any,
          });
        } catch (e) {}
      }

      for (const doc of imageMatches) {
        try {
          await strapi.documents('api::image.image').update({
            documentId: doc.documentId,
            locale: doc.locale || 'de',
            status: 'published',
            data: { viewsCount: currentViewsCount } as any,
          });
        } catch (e) {}
      }

      for (const doc of feedMatches) {
        try {
          await strapi.documents('api::feed-item.feed-item').update({
            documentId: doc.documentId,
            locale: doc.locale || 'de',
            status: 'published',
            data: { viewsCount: currentViewsCount } as any,
          });
        } catch (e) {}
      }

      if (userId) {
        try {
          await strapi.service('api::tracking.tracking').processBatch(userId, [
            { type: 'view', tags, mediaType },
          ]);
        } catch (e) {}
      }

      return {
        success: true,
        counted: true,
        viewsCount: currentViewsCount,
        likesCount: currentLikesCount,
      };
    }

    if (type === 'like') {
      // 1. Check existing Fav relation
      let existingFavs: any[] = [];
      try {
        const favFilters: any[] = [{ userIdentifier: { $eq: userIdentifier } }];
        if (userId) favFilters.push({ user: { id: { $eq: userId } } });

        const favQuery: any = {
          filters: {
            $or: favFilters,
          },
        };
        if (targetVideoDocId) favQuery.filters.video = { documentId: { $eq: targetVideoDocId } };
        else if (targetImageDocId) favQuery.filters.image = { documentId: { $eq: targetImageDocId } };
        else if (targetFeedItemDocId) favQuery.filters.feedItem = { documentId: { $eq: targetFeedItemDocId } };

        try {
          existingFavs = await strapi.documents('api::favorite.favorite').findMany(favQuery);
        } catch (e) {
          existingFavs = await strapi.db.query('api::favorite.favorite').findMany(favQuery);
        }
      } catch (e) {}

      if (existingFavs.length === 0) {
        // Create Favorite relation
        let createdSuccess = false;

        // Attempt 1: DB Query (direct integer relation mapping)
        try {
          const dbData: any = { userIdentifier };
          if (userId) dbData.user = userId;
          if (targetVideoId) dbData.video = targetVideoId;
          if (targetImageId) dbData.image = targetImageId;
          if (targetFeedItemId) dbData.feedItem = targetFeedItemId;

          await strapi.db.query('api::favorite.favorite').create({
            data: dbData,
          });
          createdSuccess = true;
        } catch (dbErr: any) {
          console.warn('DB Query favorite creation warning:', dbErr?.message || dbErr);
        }

        // Attempt 2: Document Service fallback
        if (!createdSuccess) {
          try {
            const favData: any = { userIdentifier };
            if (userId) favData.user = userId;
            if (targetVideoDocId) favData.video = targetVideoDocId;
            if (targetImageDocId) favData.image = targetImageDocId;
            if (targetFeedItemDocId) favData.feedItem = targetFeedItemDocId;

            await strapi.documents('api::favorite.favorite').create({
              data: favData,
            });
            createdSuccess = true;
          } catch (docErr: any) {
            console.error('Document Service favorite creation error:', docErr?.message || docErr);
          }
        }

        currentLikesCount += 1;

        // Update Published entities
        for (const doc of videoMatches) {
          try {
            await strapi.documents('api::video.video').update({
              documentId: doc.documentId,
              locale: doc.locale || 'de',
              status: 'published',
              data: { likesCount: currentLikesCount } as any,
            });
          } catch (e) {}
        }

        for (const doc of imageMatches) {
          try {
            await strapi.documents('api::image.image').update({
              documentId: doc.documentId,
              locale: doc.locale || 'de',
              status: 'published',
              data: { likesCount: currentLikesCount } as any,
            });
          } catch (e) {}
        }

        for (const doc of feedMatches) {
          try {
            await strapi.documents('api::feed-item.feed-item').update({
              documentId: doc.documentId,
              locale: doc.locale || 'de',
              status: 'published',
              data: { likesCount: currentLikesCount } as any,
            });
          } catch (e) {}
        }

        if (userId) {
          try {
            await strapi.service('api::tracking.tracking').processBatch(userId, [
              { type: 'like', tags, mediaType: currentItem?.mediaType || 'image' },
            ]);
          } catch (e) {}
        }
      }

      return {
        success: true,
        isLiked: true,
        viewsCount: currentViewsCount,
        likesCount: currentLikesCount,
      };
    }

    if (type === 'unlike') {
      // Find & delete Fav relation
      try {
        const favFilters: any[] = [{ userIdentifier: { $eq: userIdentifier } }];
        if (userId) favFilters.push({ user: { id: { $eq: userId } } });

        const favQuery: any = {
          filters: {
            $or: favFilters,
          },
        };
        if (targetVideoDocId) favQuery.filters.video = { documentId: { $eq: targetVideoDocId } };
        else if (targetImageDocId) favQuery.filters.image = { documentId: { $eq: targetImageDocId } };
        else if (targetFeedItemDocId) favQuery.filters.feedItem = { documentId: { $eq: targetFeedItemDocId } };

        let existingFavs: any[] = [];
        try {
          existingFavs = await strapi.documents('api::favorite.favorite').findMany(favQuery);
          for (const fav of existingFavs) {
            await strapi.documents('api::favorite.favorite').delete({
              documentId: fav.documentId,
            });
          }
        } catch (e) {
          existingFavs = await strapi.documents('api::fav.fav').findMany(favQuery);
          for (const fav of existingFavs) {
            await strapi.documents('api::fav.fav').delete({
              documentId: fav.documentId,
            });
          }
        }
      } catch (e) {}

      currentLikesCount = Math.max(0, currentLikesCount - 1);

      for (const doc of videoMatches) {
        try {
          await strapi.documents('api::video.video').update({
            documentId: doc.documentId,
            locale: doc.locale || 'de',
            status: 'published',
            data: { likesCount: currentLikesCount } as any,
          });
        } catch (e) {}
      }

      for (const doc of imageMatches) {
        try {
          await strapi.documents('api::image.image').update({
            documentId: doc.documentId,
            locale: doc.locale || 'de',
            status: 'published',
            data: { likesCount: currentLikesCount } as any,
          });
        } catch (e) {}
      }

      for (const doc of feedMatches) {
        try {
          await strapi.documents('api::feed-item.feed-item').update({
            documentId: doc.documentId,
            locale: doc.locale || 'de',
            status: 'published',
            data: { likesCount: currentLikesCount } as any,
          });
        } catch (e) {}
      }

      if (userId) {
        try {
          await strapi.service('api::tracking.tracking').processBatch(userId, [
            { type: 'unlike', tags, mediaType: currentItem?.mediaType || 'image' },
          ]);
        } catch (e) {}
      }

      return {
        success: true,
        isLiked: false,
        viewsCount: currentViewsCount,
        likesCount: currentLikesCount,
      };
    }

    return { success: false, error: 'Invalid interaction type' };
  },

  async getUserFavorites(userIdentifier: string, userId?: number | string) {
    try {
      const favFilters: any[] = [];
      if (userIdentifier) favFilters.push({ userIdentifier: { $eq: userIdentifier } });
      if (userId) favFilters.push({ user: { id: { $eq: userId } } });

      if (favFilters.length === 0) {
        return { success: false, error: 'userIdentifier or userId is required' };
      }

      let favs: any[] = [];
      try {
        favs = await strapi.documents('api::favorite.favorite').findMany({
          filters: {
            $or: favFilters,
          },
          populate: ['video', 'feedItem', 'image'],
        });
      } catch (e) {
        favs = await strapi.documents('api::fav.fav').findMany({
          filters: {
            $or: favFilters,
          },
          populate: ['video', 'feedItem', 'image'],
        });
      }

      return {
        success: true,
        favorites: favs,
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Resolve a user profile by its unique handle (e.g. "demotech").
   * Used by the public /user/[slug] page so any profile is reachable
   * regardless of whether it has uploaded videos. Runs server-side with
   * the API token, so it is not bound by the public role's user permissions.
   */
  async getUserByHandle(handle: string) {
    if (!handle) return null;
    const clean = String(handle).trim().replace(/^@/, '');
    if (!clean) return null;

    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { handle: clean },
    });

    if (!user) return null;

    return {
      id: user.id,
      documentId: user.documentId || String(user.id),
      username: user.username || clean,
      handle: user.handle,
      avatarUrl: user.avatarUrl || null,
      bio: user.bio || null,
      subscribersCount: user.subscribersCount || 0,
      createdAt: user.createdAt || null,
    };
  },
});
