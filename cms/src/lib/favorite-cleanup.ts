/**
 * Removes favourites whose target has been deleted.
 *
 * `api::favorite.favorite` holds a relation per content kind. Deleting the
 * content clears that relation and leaves the favourite row behind, pointing at
 * nothing: nineteen of twenty-nine rows in this instance were in that state.
 * They make the favourites tab's count disagree with what it renders, and they
 * accumulate — one per user per deleted item, forever.
 *
 * The work is split across two hooks on purpose. By `afterDelete` the relation
 * is already gone, so nothing can be found by it any more; the rows have to be
 * identified while the content still exists and removed once it does not.
 */

/** Favourite field name per content-type UID. */
const FAVORITE_FIELD: Record<string, string> = {
  'api::video.video': 'video',
  'api::image.image': 'image',
  'api::article.article': 'article',
  'api::feed-item.feed-item': 'feedItem',
};

const STATE_KEY = '__omniFavoriteIds';

async function resolveDocumentId(uid: string, event: any): Promise<string | null> {
  const where = event?.params?.where || {};
  const direct = where.documentId || event?.result?.documentId;
  if (typeof direct === 'string') return direct;
  if (direct && typeof direct === 'object') return direct.$eq || direct.$in?.[0] || null;

  // `beforeDelete` is often addressed by primary key; read the document id off
  // the row that is about to go.
  if (where.id != null) {
    try {
      const row = await strapi.db.query(uid).findOne({ where: { id: where.id }, select: ['documentId'] });
      return row?.documentId || null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Note which favourites point at this document, while the relation still exists. */
export async function rememberFavoritesFor(uid: string, event: any): Promise<void> {
  const field = FAVORITE_FIELD[uid];
  if (!field) return;

  try {
    const documentId = await resolveDocumentId(uid, event);
    if (!documentId) return;

    // Collected unconditionally: at this point every row still exists — a
    // `deleteMany` has not removed any of them yet — so counting here cannot
    // tell a single-locale delete from a whole-document one. That decision
    // belongs in the `after` hook, once the deletion has actually happened.
    const rows = await strapi.db.query('api::favorite.favorite').findMany({
      where: { [field]: { documentId } },
      select: ['id'],
    });
    if (rows.length) {
      event.state = event.state || {};
      event.state[STATE_KEY] = rows.map((r: any) => r.id);
      event.state.__omniDocumentId = documentId;
    }
  } catch (err: any) {
    strapi.log.error(`[favorites] could not collect favourites for ${uid}: ${err?.message || err}`);
  }
}

/** Remove what the previous hook noted, now that the content is gone. */
export async function cleanupFavoritesFor(uid: string, event: any): Promise<void> {
  const ids: number[] | undefined = event?.state?.[STATE_KEY];
  const documentId: string | undefined = event?.state?.__omniDocumentId;
  if (!ids?.length || !documentId) return;

  try {
    /*
     * Deleting one locale is not deleting the document, and the two need
     * opposite treatment.
     *
     * The relation points at a single localized row, not at the document, so
     * removing one language clears it even while the others survive — the
     * favourite is orphaned on the spot. Deleting it would lose a favourite for
     * content that still exists; leaving it keeps a row that renders nothing.
     * Neither is right, so it is re-pointed at a surviving row instead.
     */
    const survivor = await strapi.db
      .query(uid)
      .findOne({ where: { documentId }, select: ['id'] });

    if (survivor) {
      const field = FAVORITE_FIELD[uid];
      for (const id of ids) {
        await strapi.db.query('api::favorite.favorite').update({
          where: { id },
          data: { [field]: survivor.id },
        });
      }
      strapi.log.info(
        `[favorites] re-pointed ${ids.length} favourite(s) to a surviving locale of ${uid} ${documentId}`
      );
      return;
    }

    await strapi.db.query('api::favorite.favorite').deleteMany({ where: { id: { $in: ids } } });
    strapi.log.info(`[favorites] removed ${ids.length} favourite(s) for deleted ${uid}`);
  } catch (err: any) {
    // A failed cleanup must never fail the delete that triggered it.
    strapi.log.error(`[favorites] cleanup for ${uid} failed: ${err?.message || err}`);
  }
}
