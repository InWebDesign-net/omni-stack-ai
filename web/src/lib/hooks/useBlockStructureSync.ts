'use client';

import { useCallback } from 'react';
import type { ArticleBlock } from '@/components/article/blocks/blockTypes';
import { BLOCK_TYPES } from '@/components/article/blocks/blockTypes';

/**
 * Keeps the block *structure* aligned across locales while leaving content alone.
 *
 * `blocks` is a localized dynamic zone, so de and en hold independent lists and
 * will drift apart the moment one is edited — the seeded article already reads
 * five German blocks against one English. The agreed rule:
 *
 *  - adding a block inserts an empty block of the same component at the same
 *    position in the other locale, so the structures never diverge again;
 *  - removing a block removes the counterpart too, but the caller warns first
 *    when that counterpart still has content (see BlockListEditor);
 *  - text is never copied between locales. An empty container is honest;
 *    German text sitting in an English article is not.
 *
 * Media relations are copied, because a photograph is not language-specific and
 * re-picking it in every locale would be busywork.
 */

const RELATION_FIELDS = ['image', 'video'] as const;

/** An empty counterpart: same component, same relations, no text. */
export function emptyCounterpart(block: ArticleBlock): ArticleBlock {
  const meta = BLOCK_TYPES[block.__component];
  const fresh = meta ? meta.create() : ({ __component: block.__component } as ArticleBlock);
  for (const field of RELATION_FIELDS) {
    if (block[field] != null) fresh[field] = block[field];
  }
  return fresh;
}

export interface BlockStructureSync {
  /** Mirror an insertion at `index` into the other locale. */
  syncInsert: (other: ArticleBlock[], index: number, inserted: ArticleBlock) => ArticleBlock[];
  /** Mirror a removal at `index`. */
  syncRemove: (other: ArticleBlock[], index: number) => ArticleBlock[];
  /** Mirror a move. */
  syncMove: (other: ArticleBlock[], from: number, to: number) => ArticleBlock[];
  /** Append empty counterparts until both locales are the same length. */
  alignLength: (shorter: ArticleBlock[], longer: ArticleBlock[]) => ArticleBlock[];
}

export function useBlockStructureSync(): BlockStructureSync {
  const syncInsert = useCallback((other: ArticleBlock[], index: number, inserted: ArticleBlock) => {
    const next = [...other];
    next.splice(Math.min(index, next.length), 0, emptyCounterpart(inserted));
    return next;
  }, []);

  const syncRemove = useCallback((other: ArticleBlock[], index: number) => {
    if (index < 0 || index >= other.length) return other;
    return other.filter((_, i) => i !== index);
  }, []);

  const syncMove = useCallback((other: ArticleBlock[], from: number, to: number) => {
    if (from < 0 || from >= other.length || to < 0 || to >= other.length) return other;
    const next = [...other];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  }, []);

  const alignLength = useCallback((shorter: ArticleBlock[], longer: ArticleBlock[]) => {
    if (shorter.length >= longer.length) return shorter;
    return [...shorter, ...longer.slice(shorter.length).map(emptyCounterpart)];
  }, []);

  return { syncInsert, syncRemove, syncMove, alignLength };
}
