import type { LucideIcon } from 'lucide-react';
import { Heading1, AlignLeft, Quote, ImageIcon, Video } from 'lucide-react';

/**
 * The article dynamic zone, described once.
 *
 * `api::article.article.blocks` accepts these five components. Everything the
 * editor needs per type — how to create one, what to call it, how to summarise
 * it in a collapsed row — comes from this table, so adding a sixth component to
 * the Strapi schema means adding an entry here and its field editor, nothing else.
 */

export type BlockComponent =
  | 'shared.headline'
  | 'shared.rich-text'
  | 'shared.quote'
  | 'shared.image'
  | 'shared.video';

export interface ArticleBlock {
  /** Present on blocks that already exist in Strapi; absent on newly added ones. */
  id?: number;
  /**
   * Client-side identity for blocks that have no Strapi id yet. Keying React on
   * the array index instead would change the key whenever a new block is moved,
   * remounting its inputs and dropping focus mid-typing. Stripped before saving.
   */
  _uid?: string;
  __component: BlockComponent;
  [field: string]: unknown;
}

let uidCounter = 0;
const nextUid = () => `new-${Date.now().toString(36)}-${uidCounter++}`;

export interface BlockTypeMeta {
  component: BlockComponent;
  icon: LucideIcon;
  /** Dictionary key under `blocks.types`; the label falls back to this text. */
  labelKey: string;
  fallbackLabel: string;
  /** Fields a fresh block starts with. */
  create: () => ArticleBlock;
  /** One line describing the block's content, for the collapsed row. */
  summary: (block: ArticleBlock) => string;
  /** Media blocks are read-only until the picker lands (#61). */
  mediaOnly?: boolean;
}

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/**
 * Allowed values for `shared.headline.level`.
 *
 * Mirrors the enum in `cms/src/components/shared/headline.json`. It is *not*
 * h1-h6: the schema deliberately excludes h1, since an article already has one
 * as its title, and h5/h6 were never defined. Offering the full range meant
 * Strapi rejected the whole locale on save with a validation error.
 *
 * If the schema enum changes, change it here too — there is no runtime link.
 */
export const HEADLINE_LEVELS = ['h2', 'h3', 'h4'] as const;
export type HeadlineLevel = (typeof HEADLINE_LEVELS)[number];
export const DEFAULT_HEADLINE_LEVEL: HeadlineLevel = 'h2';

export const BLOCK_TYPES: Record<BlockComponent, BlockTypeMeta> = {
  'shared.headline': {
    component: 'shared.headline',
    icon: Heading1,
    labelKey: 'headline',
    fallbackLabel: 'Überschrift',
    create: () => ({ __component: 'shared.headline', _uid: nextUid(), title: '', level: 'h2', subtitle: '' }),
    summary: (b) => text(b.title) || text(b.subtitle),
  },
  'shared.rich-text': {
    component: 'shared.rich-text',
    icon: AlignLeft,
    labelKey: 'richText',
    fallbackLabel: 'Text',
    create: () => ({ __component: 'shared.rich-text', _uid: nextUid(), body: '' }),
    summary: (b) => text(b.body).replace(/\s+/g, ' '),
  },
  'shared.quote': {
    component: 'shared.quote',
    icon: Quote,
    labelKey: 'quote',
    fallbackLabel: 'Zitat',
    create: () => ({ __component: 'shared.quote', _uid: nextUid(), quote: '', author: '' }),
    summary: (b) => {
      const q = text(b.quote);
      const a = text(b.author);
      return a ? `${q} — ${a}` : q;
    },
  },
  'shared.image': {
    component: 'shared.image',
    icon: ImageIcon,
    labelKey: 'image',
    fallbackLabel: 'Bild',
    mediaOnly: true,
    create: () => ({ __component: 'shared.image', _uid: nextUid(), image: null, caption: '' }),
    summary: (b) => {
      const rel = b.image as { title?: string } | string | null;
      if (rel && typeof rel === 'object' && rel.title) return rel.title;
      return text(b.caption);
    },
  },
  'shared.video': {
    component: 'shared.video',
    icon: Video,
    labelKey: 'video',
    fallbackLabel: 'Video',
    mediaOnly: true,
    create: () => ({ __component: 'shared.video', _uid: nextUid(), video: null, caption: '' }),
    summary: (b) => {
      const rel = b.video as { title?: string } | string | null;
      if (rel && typeof rel === 'object' && rel.title) return rel.title;
      return text(b.caption);
    },
  },
};

/** Every component the schema accepts; all of them are insertable. */
export const INSERTABLE_TYPES: BlockComponent[] = [
  'shared.headline',
  'shared.rich-text',
  'shared.quote',
  'shared.image',
  'shared.video',
];

/**
 * Prepares blocks for `PUT /api/content/article/settings`.
 *
 * Two things matter, and both fail silently when missed:
 *  - relations come back from Strapi populated (`{ id, documentId, … }`) and must
 *    go back as a documentId, or the write is accepted and changes nothing;
 *  - an existing block keeps its `id` so Strapi updates that component row
 *    instead of replacing the zone.
 */
export function serializeBlocks(blocks: ArticleBlock[]): Record<string, unknown>[] {
  return blocks.map((block) => {
    const out: Record<string, unknown> = { __component: block.__component };
    if (typeof block.id === 'number') out.id = block.id;

    for (const [key, value] of Object.entries(block)) {
      if (key === 'id' || key === '__component' || key === '_uid') continue;
      if (value && typeof value === 'object' && 'documentId' in (value as object)) {
        out[key] = (value as { documentId: string }).documentId;
      } else {
        out[key] = value;
      }
    }
    return out;
  });
}

/** Stable across reorders: Strapi id when saved, client uid before that. */
export function blockKey(block: ArticleBlock): string {
  if (typeof block.id === 'number') return `id-${block.id}`;
  if (typeof block._uid === 'string') return block._uid;
  // Blocks loaded from Strapi always have an id; this is a defensive fallback.
  return `${block.__component}-unkeyed`;
}
