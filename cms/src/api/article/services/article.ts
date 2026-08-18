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

    if (!filters.visibility) {
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

    const docQueryLocale = (targetLocale === '*' || Boolean(searchTerm)) ? '*' : targetLocale;

    let items = await strapi.documents('api::article.article').findMany({
      locale: docQueryLocale,
      status: 'published',
      filters,
      populate: ['creator', 'blocks'],
      sort: strapiSort,
    });

    if ((!items || items.length === 0) && docQueryLocale !== '*') {
      items = await strapi.documents('api::article.article').findMany({
        locale: '*',
        status: 'published',
        filters,
        populate: ['creator', 'blocks'],
        sort: strapiSort,
      });
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
