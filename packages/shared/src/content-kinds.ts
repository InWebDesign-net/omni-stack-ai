/**
 * The single declaration of every content kind the platform serves.
 *
 * Anything that would otherwise be written once per kind — API routes, list
 * hooks, list pages, edit modals, CMS controllers — derives from this table, so
 * adding a fourth kind means adding an entry here plus its kind-specific
 * renderer, and nothing else.
 *
 * `feed-item` is deliberately absent: it is a container type with a different
 * shape, not a content kind in this sense.
 */
export const CONTENT_KINDS = {
  video: {
    uid: 'api::video.video',
    plural: 'videos',
    route: 'video',
    listRoute: 'videos',
    ownerField: 'creator',
    media: 'hls',
  },
  article: {
    uid: 'api::article.article',
    plural: 'articles',
    route: 'article',
    listRoute: 'articles',
    ownerField: 'creator',
    media: 'none',
  },
  image: {
    uid: 'api::image.image',
    plural: 'images',
    route: 'image',
    listRoute: 'images',
    ownerField: 'creator',
    media: 'webp',
  },
} as const;

export type ContentKind = keyof typeof CONTENT_KINDS;
export const isContentKind = (v: string): v is ContentKind => v in CONTENT_KINDS;
