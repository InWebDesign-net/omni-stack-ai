'use client';

import { jsonAuthHeaders } from '@/lib/affinity';

/**
 * Persisting the heart.
 *
 * The detail pages tracked a "like" in `localStorage` and told the reader it
 * had been added to their favourites, while `api::favorite.favorite` was never
 * written by anything — the collection only ever held seeded rows. This is what
 * makes the claim true.
 *
 * Callers pass the outcome they want rather than asking for a flip. The route
 * still supports flipping for anything that does not know its current state,
 * but a caller that does — the detail pages all hydrate from the server — must
 * not rely on it: a heart rendering empty while the record exists would remove
 * the favourite instead of adding one.
 */

type TargetId =
  | { videoId: number | string }
  | { imageId: number | string }
  | { articleId: number | string }
  | { feedItemId: number | string };

/** `desired` states the outcome, so a disagreement between button and database
 *  cannot invert the result. */
export type FavoriteTarget = TargetId & { desired?: boolean };

export interface FavoriteState {
  favoriteVideoIds: string[];
  favoriteImageIds: string[];
  favoriteArticleIds: string[];
  favoriteFeedItemIds: string[];
}

const EMPTY: FavoriteState = {
  favoriteVideoIds: [],
  favoriteImageIds: [],
  favoriteArticleIds: [],
  favoriteFeedItemIds: [],
};

export async function fetchFavoriteState(): Promise<FavoriteState> {
  try {
    const res = await fetch('/api/favorites', { headers: jsonAuthHeaders(), cache: 'no-store' });
    if (!res.ok) return EMPTY;
    const data = await res.json();
    return {
      favoriteVideoIds: data.favoriteVideoIds || [],
      favoriteImageIds: data.favoriteImageIds || [],
      favoriteArticleIds: data.favoriteArticleIds || [],
      favoriteFeedItemIds: data.favoriteFeedItemIds || [],
    };
  } catch {
    return EMPTY;
  }
}

/** Returns the resulting state, or null when the request did not go through. */
export async function toggleFavorite(target: FavoriteTarget): Promise<boolean | null> {
  try {
    const res = await fetch('/api/favorites', {
      method: 'POST',
      headers: { ...jsonAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(target),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Boolean(data.favorited);
  } catch {
    return null;
  }
}

export function isFavorited(state: FavoriteState, kind: 'video' | 'image' | 'article', id: unknown): boolean {
  if (id == null) return false;
  const list =
    kind === 'video' ? state.favoriteVideoIds : kind === 'image' ? state.favoriteImageIds : state.favoriteArticleIds;
  return list.includes(String(id));
}
