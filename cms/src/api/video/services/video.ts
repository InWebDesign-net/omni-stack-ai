import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::video.video', ({ strapi }) => ({
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
