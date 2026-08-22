'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const PAGE_SIZE = 24;

/**
 * The likes tab's list, paginated.
 *
 * Separate from `useProfileTabList` on purpose: a like joins four content types
 * through `/api/likes`, which the filtered services behind
 * `/api/content/{kind}/list` do not cover. It has no sort or search for the
 * same reason — those are the filtered services' features, and inventing a
 * second implementation of them here would be worse than not having them.
 */
export function useProfileLikesTab({
  userId,
  active,
  initialTotal,
}: {
  userId: number | string | null | undefined;
  active: boolean;
  initialTotal?: number;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState<number>(initialTotal ?? 0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const generation = useRef(0);

  const fetchPage = useCallback(
    async (targetPage: number, append: boolean) => {
      if (userId == null || userId === '') return;
      const mine = ++generation.current;
      append ? setIsLoadingMore(true) : setIsLoading(true);
      try {
        const res = await fetch(
          `/api/profile/likes?userId=${encodeURIComponent(String(userId))}&page=${targetPage}&pageSize=${PAGE_SIZE}`,
          { cache: 'no-store' }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (mine !== generation.current) return;

        const batch: any[] = Array.isArray(json?.data) ? json.data : [];
        const pagination = json?.meta?.pagination ?? {};
        setTotal(typeof pagination.total === 'number' ? pagination.total : batch.length);
        setPageCount(typeof pagination.pageCount === 'number' ? pagination.pageCount : 1);
        setPage(targetPage);
        setItems((prev) => {
          if (!append) return batch;
          const seen = new Set(prev.map((i) => `${i.mediaType}-${i.documentId || i.slug}`));
          return [...prev, ...batch.filter((i) => !seen.has(`${i.mediaType}-${i.documentId || i.slug}`))];
        });
      } catch {
        if (mine === generation.current && !append) setItems([]);
      } finally {
        if (mine === generation.current) {
          append ? setIsLoadingMore(false) : setIsLoading(false);
        }
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!active) return;
    fetchPage(1, false);
  }, [active, fetchPage]);

  const hasMore = page < pageCount;

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || isLoadingMore) return;
    fetchPage(page + 1, true);
  }, [hasMore, isLoading, isLoadingMore, page, fetchPage]);

  return { items, total, isLoading, isLoadingMore, hasMore, loadMore };
}
