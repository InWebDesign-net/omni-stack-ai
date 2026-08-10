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
    const sortMapping: Record<string, string> = {
      createdatasc: 'createdAt:desc',  // Newest first
      createdatdesc: 'createdAt:asc',   // Oldest first
      titleasc: 'title:asc',
      titledesc: 'title:desc',
      durationasc: 'duration:asc',
      durationdesc: 'duration:desc',
    };
    const strapiSort = sortMapping[sortStr.toLowerCase()] || 'createdAt:desc';

    // Query published videos for the target locale
    const filters: any = {
      visibility: { $eq: 'public' },
      isProcessing: { $ne: true },
    };

    if (searchTerm) {
      filters.title = { $containsi: searchTerm };
    }

    // Fetch candidate document set for target locale
    // In Strapi 5, fetching targetLocale returns exactly 1 item per document
    let items = await strapi.documents('api::video.video').findMany({
      locale: targetLocale,
      status: 'published',
      filters,
      populate: ['creator'],
      sort: strapiSort,
    });

    // Fallback: If no items found for targetLocale, fetch default locale ('de')
    if ((!items || items.length === 0) && targetLocale !== 'de') {
      items = await strapi.documents('api::video.video').findMany({
        locale: 'de',
        status: 'published',
        filters,
        populate: ['creator'],
        sort: strapiSort,
      });
    }

    // Also collect tags across all localizations of each document for robust matching
    // (e.g. if user matches 'Architecture' or 'Natur')
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
   * Aggregates all unique tags across video items with their frequency.
   * Reads only the `tags` column (cheap, no full video payloads) and counts
   * occurrences. This powers the filter tag-cloud in the frontend.
   * A tag can only exist if it is attached to at least one video.
   */
  async getAllTags() {
    const items = await strapi.db.query('api::video.video').findMany({
      select: ['tags' as any],
    });

    const counts: Record<string, number> = {};
    for (const it of items as Array<{ tags?: string[] | null }>) {
      for (const raw of it.tags || []) {
        const t = (raw || '').trim();
        if (t) counts[t] = (counts[t] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  },
}));
