import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::video.video', ({ strapi }) => ({
  /**
   * Native Strapi 5 database filtering & pagination service.
   * Handles locale selection, title search (q), sorting, and tag include/exclude/matchmode
   * directly in Strapi, returning exact 24-item paginated payloads.
   */
  async findFilteredVideos(params: any = {}) {
    const page = Math.max(1, parseInt(params.page || params['pagination[page]'] || '1', 10));
    const pageSize = Math.max(1, parseInt(params.pageSize || params['pagination[pageSize]'] || '24', 10));
    const targetLocale = params.lang || params.locale || 'de';
    const sortStr = params.sort || 'createdatasc';
    const searchTerm = params.q || params.searchTerm || '';

    // Tag filters
    const includetag = params.includetag || '';
    const excludetag = params.excludetag || '';
    const matchmode = params.matchmode || 'any';

    const includeList = includetag
      ? includetag.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
      : [];
    const excludeList = excludetag
      ? excludetag.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
      : [];

    // Map sort parameter to Strapi sort format
    const sortMapping: Record<string, any> = {
      createdatasc: 'createdAt:desc',  // Newest first
      newest: 'createdAt:desc',
      createdatdesc: 'createdAt:asc',   // Oldest first
      oldest: 'createdAt:asc',
      mostliked: 'likesCount:desc',
      mostcommented: 'viewsCount:desc',
      mostpopular: 'viewsCount:desc',
      trending: ['likesCount:desc', 'createdAt:desc'],
      titleasc: 'title:asc',
      titledesc: 'title:desc',
      durationasc: 'duration:asc',
      durationdesc: 'duration:desc',
    };
    const strapiSort = sortMapping[sortStr.toLowerCase()] || 'createdAt:desc';

    // Query published videos for the target locale
    const filters: any = {};

    // Merge structured filters object if passed in params
    if (params.filters && typeof params.filters === 'object') {
      Object.assign(filters, params.filters);
    }

    // Handle flat query string keys (e.g. filters[slug][$eq], filters[slug][$ne])
    for (const [key, value] of Object.entries(params)) {
      if (typeof key === 'string' && key.startsWith('filters[')) {
        const match = key.match(/^filters\[([^\]]+)\](?:\[([^\]]+)\])?$/);
        if (match) {
          const field = match[1];
          const op = match[2];
          if (field) {
            if (op) {
              if (!filters[field] || typeof filters[field] !== 'object') filters[field] = {};
              filters[field][op] = value;
            } else {
              filters[field] = value;
            }
          }
        }
      }
    }

    const allowPrivate = params.allowPrivate === 'true' || params.includePrivate === 'true' || params.allowPrivate === true;

    if (!filters.visibility && !allowPrivate) {
      filters.visibility = { $eq: 'public' };
    }
    if (!filters.isProcessing) {
      filters.isProcessing = { $ne: true };
    }

    if (params.excludeSlug) {
      const excludes = Array.isArray(params.excludeSlug)
        ? params.excludeSlug
        : String(params.excludeSlug).split(',').map((s: string) => s.trim()).filter(Boolean);
      if (excludes.length > 0) {
        if (!filters.slug || typeof filters.slug !== 'object') filters.slug = {};
        filters.slug.$notIn = excludes;
      }
    }

    if (searchTerm) {
      filters.title = { $containsi: searchTerm };
    }

    // Filter by user favorites if favsOnly is requested
    // Note: 'fav' is a deprecated alias for favsOnly
    const isFavsOnly = params.favsOnly === 'true' || params.favsOnly === true || params.fav === 'true' || params.fav === true;
    if (isFavsOnly) {
      const koaCtx = strapi.requestContext ? strapi.requestContext.get() : null;
      const headerUserId = koaCtx?.header?.['x-omni-user-id'] || koaCtx?.request?.header?.['x-omni-user-id'];
      const queryUserId = koaCtx?.query?.omniUserId || koaCtx?.request?.query?.omniUserId;
      const userId = koaCtx?.state?.user?.id || (headerUserId ? Number(headerUserId) : (queryUserId ? Number(queryUserId) : (params.userId ? Number(params.userId) : null)));

      if (userId) {
        const userFavs = await strapi.documents('api::favorite.favorite').findMany({
          filters: {
            $or: [
              { user: { id: { $eq: userId } } },
              { userIdentifier: { $eq: `user-${userId}` } },
            ],
          },
          populate: ['video'],
        });
        const favDocIds = (userFavs as any[])
          .map((f) => f.video?.documentId || f.video?.id)
          .filter(Boolean);

        if (!filters.documentId || typeof filters.documentId !== 'object') {
          filters.documentId = {};
        }
        filters.documentId.$in = favDocIds.length > 0 ? favDocIds : ['__none__'];
      } else {
        if (!filters.documentId || typeof filters.documentId !== 'object') {
          filters.documentId = {};
        }
        filters.documentId.$in = ['__none__'];
      }
    }

    // Determine target locale query (if targetLocale === '*', fetch all localizations)
    const docQueryLocale = targetLocale === '*' ? '*' : targetLocale;
    const statusQuery = allowPrivate ? (params.status || undefined) : 'published';

    // Fetch candidate document set for target locale
    let items = await strapi.documents('api::video.video').findMany({
      locale: docQueryLocale,
      status: statusQuery,
      filters,
      populate: ['creator'],
      sort: strapiSort,
    });

    // Fallback: If no items found for targetLocale, fetch default locale ('de')
    if ((!items || items.length === 0) && targetLocale !== 'de' && targetLocale !== '*') {
      items = await strapi.documents('api::video.video').findMany({
        locale: 'de',
        status: statusQuery,
        filters,
        populate: ['creator'],
        sort: strapiSort,
      });
    }

    // Deduplicate by documentId so duplicate localizations never appear in search
    const seenDocIds = new Set<string>();
    items = (items as any[]).filter((it) => {
      const docId = it.documentId || it.id || it.slug;
      if (docId && seenDocIds.has(docId)) return false;
      if (docId) seenDocIds.add(docId);
      return true;
    });

    // Also collect tags across all localizations of each document for robust matching
    if (includeList.length > 0 || excludeList.length > 0) {
      const docIds = (items as any[]).map((it) => it.documentId).filter(Boolean);
      let allLocaleItems: any[] = [];
      if (docIds.length > 0) {
        allLocaleItems = await strapi.documents('api::video.video').findMany({
          filters: { documentId: { $in: docIds } },
          locale: '*',
          status: 'published',
        });
      }

      const docTagsMap = new Map<string, string[]>();
      for (const it of allLocaleItems) {
        const key = it.documentId || it.slug;
        if (!docTagsMap.has(key)) docTagsMap.set(key, []);
        const list = docTagsMap.get(key)!;
        for (const t of it.tags || []) {
          if (t && typeof t === 'string') list.push(t.trim().toLowerCase());
        }
      }

      items = (items as any[]).filter((it) => {
        const key = it.documentId || it.slug;
        const itemTags =
          docTagsMap.get(key) ||
          (it.tags || []).map((t: string) => (t || '').trim().toLowerCase());

        // Exclude check
        if (excludeList.length > 0) {
          if (excludeList.some((ex: string) => itemTags.includes(ex))) return false;
        }

        // Include check
        if (includeList.length > 0) {
          if (matchmode === 'all') {
            if (!includeList.every((inc: string) => itemTags.includes(inc))) return false;
          } else {
            if (!includeList.some((inc: string) => itemTags.includes(inc))) return false;
          }
        }

        return true;
      });
    }

    // Custom ranking algorithms for trending, discussion and personal interest affinity
    const lowerSort = sortStr.toLowerCase();
    if (lowerSort === 'trending') {
      const now = Date.now();
      const ONE_DAY_MS = 86400000;
      items = (items as any[]).sort((a, b) => {
        const getTrendScore = (it: any) => {
          const likes = it.likesCount || 0;
          const comments = it.commentsCount || 0;
          const views = it.viewsCount || 0;
          const ageDays = Math.max(0.1, (now - new Date(it.createdAt || Date.now()).getTime()) / ONE_DAY_MS);
          return (likes * 10 + comments * 15 + views) / Math.pow(ageDays + 1, 1.2);
        };
        return getTrendScore(b) - getTrendScore(a);
      });
    } else if (lowerSort === 'discussion' || lowerSort === 'comments') {
      items = (items as any[]).sort((a, b) => {
        const commentsA = Number(a.commentsCount || 0);
        const commentsB = Number(b.commentsCount || 0);
        if (commentsB !== commentsA) return commentsB - commentsA;
        return new Date(b.createdAt || Date.now()).getTime() - new Date(a.createdAt || Date.now()).getTime();
      });
    } else if (lowerSort === 'affinity' || lowerSort === 'personal') {
      const userTopics = (params.userTopics || '').split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean);
      const userTopicScores: Record<string, number> = {};

      if (params.userTopicScores) {
        try {
          Object.assign(userTopicScores, JSON.parse(params.userTopicScores));
        } catch (e) { /* malformed userTopicScores param — ranking falls back to no topic weighting */ }
      } else {
        userTopics.forEach((topic: string, index: number) => {
          userTopicScores[topic] = Math.max(10, 100 - index * 5);
        });
      }

      items = (items as any[]).sort((a, b) => {
        const getAffinityScore = (it: any) => {
          let score = 0;
          const itemTags = (it.tags || []).map((t: string) => (t || '').trim().toLowerCase());
          itemTags.forEach((t: string) => {
            if (userTopicScores[t]) score += userTopicScores[t];
          });
          return score;
        };
        const scoreA = getAffinityScore(a);
        const scoreB = getAffinityScore(b);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.createdAt || Date.now()).getTime() - new Date(a.createdAt || Date.now()).getTime();
      });
    }

    // Calculate exact pagination
    const total = items.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), pageCount);
    const start = (safePage - 1) * pageSize;
    const pagedItems = (items as any[]).slice(start, start + pageSize);

    return {
      data: pagedItems,
      meta: {
        pagination: {
          page: safePage,
          pageSize,
          total,
          pageCount,
        },
      },
    };
  },

  /**
   * Aggregates all unique tags across video items with their frequency for the specified language.
   */
  async getAllTags(params: any = {}) {
    const targetLocale = params.lang || params.locale || 'de';
    const whereClause: any = {
      visibility: 'public',
      isProcessing: false,
      publishedAt: { $notNull: true },
    };
    if (targetLocale !== '*') {
      whereClause.locale = targetLocale;
    }

    const items = await strapi.db.query('api::video.video').findMany({
      select: ['documentId', 'tags' as any],
      where: whereClause,
    });

    // Deduplicate tags per document to avoid counting multiple localizations
    const docTagsMap = new Map<string, Set<string>>();

    for (const it of items as Array<{ documentId?: string; tags?: string[] | null }>) {
      const docId = it.documentId || Math.random().toString();
      if (!docTagsMap.has(docId)) {
        docTagsMap.set(docId, new Set());
      }
      const tagSet = docTagsMap.get(docId)!;
      for (const raw of it.tags || []) {
        const t = (raw || '').trim();
        if (t) tagSet.add(t);
      }
    }

    const counts: Record<string, number> = {};
    for (const tagSet of docTagsMap.values()) {
      for (const t of tagSet) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  },
}));
