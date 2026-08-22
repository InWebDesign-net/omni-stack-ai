'use client';

import { jsonAuthHeaders } from '@/lib/affinity';

/**
 * Persisting the heart.
 *
 * The detail pages tracked a "like" in `localStorage` and told the reader it
 * had been added to their likes, while `api::like.like` was never
 * written by anything — the collection only ever held seeded rows. This is what
 * makes the claim true.
 *
 * Callers pass the outcome they want rather than asking for a flip. The route
 * still supports flipping for anything that does not know its current state,
 * but a caller that does — the detail pages all hydrate from the server — must
 * not rely on it: a heart rendering empty while the record exists would remove
 * the like instead of adding one.
 */

type TargetId =
  | { videoId: number | string }
  | { imageId: number | string }
  | { articleId: number | string }
  | { feedItemId: number | string };

/** `desired` states the outcome, so a disagreement between button and database
 *  cannot invert the result. */
export type LikeTarget = TargetId & { desired?: boolean };

export interface LikeState {
  likedVideoIds: string[];
  likedImageIds: string[];
  likedArticleIds: string[];
  likedFeedItemIds: string[];
}

const EMPTY: LikeState = {
  likedVideoIds: [],
  likedImageIds: [],
  likedArticleIds: [],
  likedFeedItemIds: [],
};

export async function fetchLikeState(): Promise<LikeState> {
  try {
    const res = await fetch('/api/likes', { headers: jsonAuthHeaders(), cache: 'no-store' });
    if (!res.ok) return EMPTY;
    const data = await res.json();
    return {
      likedVideoIds: data.likedVideoIds || [],
      likedImageIds: data.likedImageIds || [],
      likedArticleIds: data.likedArticleIds || [],
      likedFeedItemIds: data.likedFeedItemIds || [],
    };
  } catch {
    return EMPTY;
  }
}

/** Returns the resulting state, or null when the request did not go through. */
export async function toggleLike(target: LikeTarget): Promise<boolean | null> {
  try {
    const res = await fetch('/api/likes', {
      method: 'POST',
      headers: { ...jsonAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(target),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Boolean(data.liked);
  } catch {
    return null;
  }
}

export function isLiked(state: LikeState, kind: 'video' | 'image' | 'article', id: unknown): boolean {
  if (id == null) return false;
  const list =
    kind === 'video' ? state.likedVideoIds : kind === 'image' ? state.likedImageIds : state.likedArticleIds;
  return list.includes(String(id));
}
