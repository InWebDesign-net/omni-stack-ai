import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::article.article', ({ strapi }) => ({
  async findFilteredArticles(params: any = {}) {
    const page = Math.max(1, parseInt(params.page || params['pagination[page]'] || '1', 10));
    const pageSize = Math.max(1, parseInt(params.pageSize || params['pagination[pageSize]'] || '24', 10));
    const targetLocale = params.lang || params.locale || 'de';
    const sortStr = params.sort || 'createdatasc';
    const searchTerm = params.q || params.searchTerm || '';
    const includetag = params.includetag || '';
    const excludetag = params.excludetag || '';
    const matchmode = params.matchmode || 'any';

    const includeList = includetag
      ? includetag.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
      : [];
    const excludeList = excludetag
      ? excludetag.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
      : [];

    const sortMapping: Record<string, any> = {
      createdatasc: 'createdAt:desc',
      newest: 'createdAt:desc',
      createdatdesc: 'createdAt:asc',
      oldest: 'createdAt:asc',
      mostliked: 'likesCount:desc',
      mostcommented: 'commentsCount:desc',
      mostpopular: 'viewsCount:desc',
      trending: ['likesCount:desc', 'createdAt:desc'],
      titleasc: 'title:asc',
      titledesc: 'title:desc',
    };
    const strapiSort = sortMapping[sortStr.toLowerCase()] || 'createdAt:desc';

    const filters: any = {};

    if (params.filters && typeof params.filters === 'object') {
      Object.assign(filters, params.filters);
    }

    // An explicit creator filter hands the decision to the visibility
    // middleware, which knows the viewer: the creator sees their own private
    // items, everyone else sees only public ones. Forcing `public` here would
    // hide an author's own unpublished work on their own profile.
    const scopedToCreator = Boolean(filters.creator);
    if (!filters.visibility && params.includeProcessing !== 'true' && !params.q && !params.slug && !scopedToCreator) {
      filters.visibility = { $eq: 'public' };
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
      filters.$or = [
        { title: { $containsi: searchTerm } },
        { slug: { $containsi: searchTerm } },
        { summary: { $containsi: searchTerm } },
      ];
    }

    // Filter by user likes if favsOnly is requested
    // Note: 'fav' is a deprecated alias for favsOnly
    const isFavsOnly = params.favsOnly === 'true' || params.favsOnly === true || params.fav === 'true' || params.fav === true;
    if (isFavsOnly) {
      const koaCtx = strapi.requestContext ? strapi.requestContext.get() : null;
      const headerUserId = koaCtx?.header?.['x-omni-user-id'] || koaCtx?.request?.header?.['x-omni-user-id'];
      const queryUserId = koaCtx?.query?.omniUserId || koaCtx?.request?.query?.omniUserId;
      const userId = koaCtx?.state?.user?.id || (headerUserId ? Number(headerUserId) : (queryUserId ? Number(queryUserId) : (params.userId ? Number(params.userId) : null)));

      if (userId) {
        const userFavs = await strapi.documents('api::like.like').findMany({
          filters: {
            $or: [
              { user: { id: { $eq: userId } } },
              { userIdentifier: { $eq: `user-${userId}` } },
            ],
          },
          populate: ['article'],
        });
        const favDocIds = (userFavs as any[])
          .map((f) => f.article?.documentId || f.article?.id)
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

    const docQueryLocale = (targetLocale === '*' || Boolean(searchTerm)) ? '*' : targetLocale;
    const docQueryStatus = params.status || (params.includeProcessing === 'true' || Boolean(searchTerm) ? undefined : 'published');

    const articlePopulate: any = {
      creator: true,
      blocks: {
        on: {
          'shared.rich-text': { populate: '*' },
          'shared.headline': { populate: '*' },
          'shared.quote': { populate: '*' },
          'shared.video': {
            populate: {
              video: {
                populate: ['creator']
              }
            }
          },
          'shared.image': {
            populate: {
              image: {
                populate: ['creator']
              }
            }
          }
        }
      }
    };

    let items = await strapi.documents('api::article.article').findMany({
      locale: docQueryLocale,
      ...(docQueryStatus ? { status: docQueryStatus } : {}),
      filters,
      populate: articlePopulate,
      sort: strapiSort,
    });

    if ((!items || items.length === 0) && docQueryLocale !== '*') {
      items = await strapi.documents('api::article.article').findMany({
        locale: '*',
        ...(docQueryStatus ? { status: docQueryStatus } : {}),
        filters,
        populate: articlePopulate,
        sort: strapiSort,
      });
    }

    /*
     * One row per document, in the language the reader asked for.
     *
     * A search queries every locale on purpose, so a German term still finds an
     * article whose English title matches. Without collapsing the result the
     * same article came back twice — `/articles?q=Natur` listed
     * `nature-s-wonders` as both "Natur in aller Pracht" and "Nature's
     * Wonders".
     *
     * The requested locale wins where it exists, rather than whichever row the
     * database returned first: a German reader searching in German should get
     * the German article back even when it was the English title that matched.
     */
    const byDocument = new Map<string, any>();
    for (const item of (items as any[]) || []) {
      const docId = item.documentId || item.id || item.slug;
      if (!docId) continue;
      const existing = byDocument.get(docId);
      if (!existing) {
        byDocument.set(docId, item);
      } else if (item.locale === targetLocale && existing.locale !== targetLocale) {
        byDocument.set(docId, item);
      }
    }
    items = Array.from(byDocument.values());

    /*
     * A document can match the search in one language only — "Natur" hits the
     * German title of an article whose English title says nothing of the sort.
     * The reader still wants it in their own language, so the requested locale
     * is fetched for whatever came back in the wrong one.
     */
    if (targetLocale !== '*') {
      const wrongLocale = items.filter((it: any) => it.locale && it.locale !== targetLocale);
      if (wrongLocale.length > 0) {
        try {
          const replacements = await strapi.documents('api::article.article').findMany({
            filters: { documentId: { $in: wrongLocale.map((it: any) => it.documentId) } },
            locale: targetLocale,
            ...(docQueryStatus ? { status: docQueryStatus } : {}),
            populate: articlePopulate,
          } as any);
          const byId = new Map(replacements.map((r: any) => [r.documentId, r]));
          items = items.map((it: any) =>
            it.locale !== targetLocale && byId.has(it.documentId) ? byId.get(it.documentId) : it
          );
        } catch (e) {
          // Falling back to the matched language is better than dropping the hit.
          strapi.log.error('[article] could not resolve requested locale for search hits', e);
        }
      }
    }

    // Tag filtering
    if (includeList.length > 0 || excludeList.length > 0) {
      const docIds = (items as any[]).map((it) => it.documentId).filter(Boolean);
      let allLocaleItems: any[] = [];
      if (docIds.length > 0) {
        allLocaleItems = await strapi.documents('api::article.article').findMany({
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

        if (excludeList.length > 0) {
          if (excludeList.some((ex: string) => itemTags.includes(ex))) return false;
        }

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

    // Pagination
    const total = items.length;
    const start = (page - 1) * pageSize;
    const paginatedItems = items.slice(start, start + pageSize);

    return {
      data: paginatedItems,
      meta: {
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize),
        },
      },
    };
  },

  async getAllTags(params: any = {}) {
    const targetLocale = params.lang || params.locale || 'de';
    const localeFilter = targetLocale === '*' ? {} : { locale: targetLocale };

    const items = await strapi.documents('api::article.article').findMany({
      status: 'published',
      filters: { ...localeFilter, visibility: { $eq: 'public' } },
      locale: targetLocale === '*' ? '*' : targetLocale,
    });

    const tagCounts = new Map<string, number>();
    for (const item of items) {
      const tags = item.tags || [];
      for (const tag of tags) {
        if (tag && typeof tag === 'string') {
          const t = tag.trim();
          tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
        }
      }
    }

    const result = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    return result;
  },
}));
