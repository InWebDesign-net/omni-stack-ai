'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  Music,
  Plus,
  Volume2,
  VolumeX,
  Send,
  X,
  Play,
  Pause,
  Sparkles,
  Flame,
  Film,
  Pencil,
  Trash2,
  Check,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { FeedItem, getAuthorName, getAuthorHandle, getAuthorAvatar } from '@/lib/feed';
import { jsonAuthHeaders } from '@/lib/affinity';
import { tracker } from '@/lib/tracking';
import Image from 'next/image';
import { AVATAR_PLACEHOLDER, resolveAvatarUrl } from '@/lib/avatar';
import {
  fetchCommentsForSlug,
  createCommentInStrapi,
  updateCommentInStrapi,
  deleteCommentFromStrapi,
  CommentItem,
} from '@/lib/comments';
import { useHlsSource } from '@/lib/hooks/useHlsSource';
import { AddToPlaylistModal } from '@/components/playlist/AddToPlaylistModal';
import { usePlaylists } from '@/lib/hooks/usePlaylists';

function ShortVideoPlayer({
  short,
  isActive,
  isMuted,
}: {
  short: FeedItem;
  isActive: boolean;
  isMuted: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Both come from the API. There is deliberately no slug-derived fallback:
  // the previous one guessed `/media/hls/<slug>.m3u8` while the real layout is
  // `/media/videos/hls/<slug>/master.m3u8`, so every short loaded a manifest
  // that 404s — and because the guessed string was truthy, the player took the
  // HLS branch and never fell back to the MP4.
  const hlsUrl = short.hlsUrl || null;
  const mp4Url = short.mp4Url || short.mediaUrl || null;

  useHlsSource(videoRef, {
    hlsUrl,
    mp4Url,
    enabled: isActive,
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isActive]);

  return (
    /*
     * Cropped, at every breakpoint, against a 9:16 frame.
     *
     * This used to crop on phones and switch to `object-contain` from `sm` up,
     * which letterboxed — and since the converter fits every video into 16:9,
     * what that letterboxing revealed was the blurred background it pads
     * portrait footage with. The vertical view showed those bars on every
     * screen wider than a phone.
     *
     * Cropping is not a compromise here: the converter fits the source with
     * `force_original_aspect_ratio=decrease`, so a 9:16 clip sits in a centred
     * strip exactly `height * 9/16` wide. Cropping to 9:16 at full height is
     * precisely that strip — measured at 39 dB PSNR against the source, which
     * is re-encoding noise rather than a difference in content. Portrait
     * material comes back exactly as shot; landscape material loses its sides,
     * and the standard player is where the full frame lives.
     */
    <div className="h-full w-full flex items-center justify-center">
      <video
        ref={videoRef}
        poster={short.thumbnailUrl}
        loop
        muted={isMuted}
        playsInline
        className="h-full w-auto aspect-[9/16] object-cover"
      />
    </div>
  );
}


/**
 * One video, as the vertical feed needs it.
 *
 * Three sources feed this surface — a playlist, the affinity ranking and the
 * plain catalogue — and they used to be mapped in three places. `videoUrl`,
 * `hlsPlaylistUrl` and `dashManifestUrl` are not fields of `api::video.video`;
 * it has `hlsUrl` and `mp4Url`, and both are carried through under their real
 * names so the player can prefer HLS and keep the MP4 as its fallback.
 */
/**
 * Below this many items, the ranked feed is topped up from the catalogue.
 *
 * A vertical feed that ends after eight videos is a worse experience than a
 * less precisely ranked one that keeps going.
 */
const TOP_UP_BELOW = 20;

function toFeedItem(v: any): FeedItem {
  return {
    id: v.id || v.documentId,
    documentId: v.documentId,
    slug: v.slug,
    title: v.title || '',
    summary: typeof v.summary === 'string' ? v.summary : '',
    content: '',
    relevanceScore: v.relevanceScore || 0,
    mediaType: 'short',
    mediaUrl: v.mp4Url || v.hlsUrl,
    videoUrl: v.mp4Url,
    thumbnailUrl: v.thumbnailUrl,
    hlsUrl: v.hlsUrl,
    mp4Url: v.mp4Url,
    hlsPlaylistUrl: v.hlsUrl,
    duration: v.duration,
    likesCount: v.likesCount || 0,
    viewsCount: v.viewsCount || 0,
    commentsCount: v.commentsCount || 0,
    creator: v.creator,
    author: v.author,
    tags: Array.isArray(v.tags) ? v.tags : [],
    createdAt: v.createdAt,
  } as FeedItem;
}

export default function ShortsFeedPage() {
  const router = useRouter();
  const params = useParams();
  const initialSlug = params?.slug as string;
  const { lang, currentUser, openAuthModal, t } = useApp();

  // Dynamic shorts list from real video catalog
  const [shortsList, setShortsList] = useState<FeedItem[]>([]);

  useEffect(() => {
    /*
     * Guards against a superseded run finishing last.
     *
     * This effect runs again when the session resolves — `currentUser` is null
     * on the first render and set a moment later — so two loads are in flight
     * at once: the anonymous one and the ranked one. Whichever answered last
     * used to win, and it was usually the anonymous one, which is why the
     * ranked feed appeared to be ignored even though it had been fetched.
     */
    let active = true;

    const fetchShorts = async () => {
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

      /*
       * Where the feed comes from, most specific first (#146).
       *
       *   1. `?list=` — a playlist, at the position named by the slug in the
       *      path. Arriving from a playlist continues that list.
       *   2. the affinity ranking, for a signed-in visitor — the same ranking
       *      the rest of the app uses, rather than a second idea of relevance.
       *   3. the plain catalogue, which always answers.
       *
       * Whatever the source, the video named in the path is guaranteed to be in
       * the feed: it is fetched on its own and put in front when the feed does
       * not already contain it. That is what closes #145 — the feed used to be
       * one page of 50, and anything past it left `activeIndex` at 0, so the
       * reader silently got a different video than the link named.
       */
      const listId = urlParams?.get('list') || null;

      const loadPlaylist = async (): Promise<FeedItem[] | null> => {
        try {
          const res = await fetch(`/api/playlists/${listId}`, { credentials: 'same-origin' });
          if (!res.ok) return null;
          const { playlist } = await res.json();
          const videos = playlist?.videos || [];
          return videos.length > 0 ? videos.map(toFeedItem) : null;
        } catch (e) {
          console.error('[shorts] failed to load playlist feed:', e);
          return null;
        }
      };

      const loadRanked = async (): Promise<FeedItem[] | null> => {
        try {
          const res = await fetch('/api/strapi-feed', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lang, limit: 50 }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          const videos = (data?.feed || []).filter((item: any) => item?.mediaType === 'video' && item?.slug);
          return videos.length > 0 ? videos.map(toFeedItem) : null;
        } catch (e) {
          console.error('[shorts] failed to load ranked feed:', e);
          return null;
        }
      };

      const loadCatalogue = async (): Promise<FeedItem[]> => {
        try {
          const res = await fetch('/api/content/video/list?pageSize=50', {
            headers: { ...jsonAuthHeaders() },
          });
          if (!res.ok) return [];
          const data = await res.json();
          // The list endpoint answers { data, meta }. This read `data.items`,
          // which is always undefined — so the feed never populated at all.
          const items: any[] = Array.isArray(data?.data) ? data.data : [];
          return items.map(toFeedItem);
        } catch (e) {
          console.error('[shorts] failed to load shorts feed:', e);
          return [];
        }
      };

      /** The video named in the path, fetched on its own so it always exists. */
      const loadEntryVideo = async (): Promise<FeedItem | null> => {
        if (!initialSlug) return null;
        try {
          // `list` ignores a slug parameter and answers with its first page,
          // which would prepend the wrong video and make #145 worse rather
          // than better. `by-slug` filters upstream and re-checks the answer.
          const res = await fetch(`/api/content/video/by-slug?slug=${encodeURIComponent(initialSlug)}&lang=${lang}`, {
            headers: { ...jsonAuthHeaders() },
          });
          if (!res.ok) return null;
          const data = await res.json();
          const item = (Array.isArray(data?.data) ? data.data : [])[0];
          return item ? toFeedItem(item) : null;
        } catch {
          return null;
        }
      };

      let feed: FeedItem[] | null = null;
      if (listId) feed = await loadPlaylist();
      if (!feed && currentUser) feed = await loadRanked();

      /*
       * The ranking answers with what it considers relevant, which is a dozen
       * items at most — fine for a page of cards, far too few for a surface you
       * scroll through. The catalogue tops it up behind the ranked items, so
       * the order still reflects the profile while the feed does not simply
       * end.
       */
      if (!feed) {
        feed = await loadCatalogue();
      } else if (!listId && feed.length < TOP_UP_BELOW) {
        const seen = new Set(feed.map((item) => item.slug));
        const catalogue = (await loadCatalogue()).filter((item) => !seen.has(item.slug));
        feed = [...feed, ...catalogue];
      }

      const entry = await loadEntryVideo();
      if (entry && !feed.some((item) => item.slug === entry.slug)) {
        feed = [entry, ...feed];
      }

      if (!active) return;
      if (feed.length > 0) setShortsList(feed);
    };
    fetchShorts();

    return () => {
      active = false;
    };
  }, [initialSlug, currentUser, lang]);

  /**
   * The playlist this feed is playing, if any.
   *
   * Kept in state rather than re-read from the URL each time, because the URL
   * is rewritten on every scroll and the parameter has to survive that — it is
   * what makes the way back to the standard view return to the same list.
   */
  const [listId, setListId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setListId(new URLSearchParams(window.location.search).get('list'));
  }, []);

  /** A path in this feed, carrying the list so scrolling does not lose it. */
  const feedPath = useCallback(
    (slug: string) => (listId ? `/shorts/${slug}?list=${encodeURIComponent(listId)}` : `/shorts/${slug}`),
    [listId]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});
  const [likesMap, setLikesMap] = useState<Record<number, number>>({});
  /*
   * Whether this video is in any of the reader's playlists — the real state
   * behind the save button, replacing a local map that was never persisted.
   * Only fetched for a signed-in reader; a guest has no lists to be in.
   */
  const { listsContaining } = usePlaylists(Boolean(currentUser));
  const [subscribedMap, setSubscribedMap] = useState<Record<string, boolean>>({});
  
  // Comments state connected to Strapi
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentItem[]>>({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [userData, setUserData] = useState<{ username: string; handle: string; avatarUrl: string } | null>(null);
  const [isPreviewActive, setIsPreviewActive] = useState(false);

  /**
   * Same shape as the other surfaces use. Sharing used to call `alert()`, which
   * is a modal the reader has to dismiss — on a feed you scroll with your thumb,
   * that is a wall, not a confirmation.
   */
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  /** The video the add-to-playlist overlay is open for, if any. */
  const [playlistForVideo, setPlaylistForVideo] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize active item index if initialSlug is provided
  useEffect(() => {
    if (initialSlug) {
      const idx = shortsList.findIndex((item) => item.slug === initialSlug);
      if (idx !== -1) {
        setActiveIndex(idx);
        if (containerRef.current) {
          const children = containerRef.current.children;
          if (children[idx]) {
            children[idx].scrollIntoView({ behavior: 'auto' });
          }
        }
      }
    }
  }, [initialSlug, shortsList]);

  // Track scrolling to update active item and dynamic URL
  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollPosition = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollPosition / itemHeight);

    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < shortsList.length) {
      setActiveIndex(newIndex);
      const currentShort = shortsList[newIndex];
      if (currentShort && typeof window !== 'undefined') {
        window.history.replaceState(null, '', feedPath(currentShort.slug));
      }
    }
  };

  // Keyboard navigation (Arrow Up / Down)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeIndex < shortsList.length - 1) {
          const nextIdx = activeIndex + 1;
          setActiveIndex(nextIdx);
          containerRef.current?.children[nextIdx]?.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeIndex > 0) {
          const prevIdx = activeIndex - 1;
          setActiveIndex(prevIdx);
          containerRef.current?.children[prevIdx]?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, shortsList.length]);

  useEffect(() => {
    const currentShort = shortsList[activeIndex];
    if (currentShort) {
      const tags = Array.isArray(currentShort.tags) && currentShort.tags.length > 0
        ? currentShort.tags
        : [(currentShort as any).category, currentShort.title].filter(Boolean);
      tracker.track('view', tags, 'short', (currentShort as any).creator?.id || (currentShort as any).author?.id);
    }
  }, [activeIndex, shortsList]);

  const activeShort = shortsList[activeIndex];

  // Load user profile & preview status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const statusParam = urlParams.get('status');
      const hasCookie = document.cookie.includes('__prerender_bypass');
      setIsPreviewActive(statusParam === 'draft' || (hasCookie && statusParam !== 'published'));
    }

  }, []);

  /*
   * Who is commenting comes from the session, not from `localStorage`.
   *
   * It used to read the cached `omni_user` and fall back to "Du (Benutzer)"
   * with no avatar — so a session restored from the cookie commented
   * anonymously, and a stale cache commented as whoever last signed in on this
   * browser. `currentUser` is resolved from the cookie by the app itself.
   */
  useEffect(() => {
    if (!currentUser) {
      setUserData(null);
      return;
    }
    setUserData({
      username: currentUser.username || 'Du',
      handle: (currentUser as any).handle || `@${(currentUser.username || 'du').toLowerCase()}`,
      avatarUrl: (currentUser as any).avatarUrl || '',
    });
  }, [currentUser]);

  // Fetch comments from Strapi for active short
  useEffect(() => {
    if (!activeShort) return;
    const slug = activeShort.slug;
    
    const loadComments = async () => {
      setLoadingComments(true);
      const fetched = await fetchCommentsForSlug(slug, lang);
      setCommentsMap((prev) => ({ ...prev, [slug]: fetched }));
      setLoadingComments(false);
    };

    loadComments();
  }, [activeShort?.slug, commentsOpen]);

  const activeComments = (activeShort && commentsMap[activeShort.slug]) || [];

  const toggleLike = (id: number, currentLikes: number) => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    setLikedMap((prev) => {
      const currentlyLiked = !!prev[id];
      setLikesMap((l) => ({ ...l, [id]: (l[id] ?? currentLikes) + (currentlyLiked ? -1 : 1) }));

      if (activeShort && activeShort.id === id) {
        const tags = Array.isArray(activeShort.tags) && activeShort.tags.length > 0
          ? activeShort.tags
          : [(activeShort as any).category, activeShort.title].filter(Boolean);
        tracker.track(currentlyLiked ? 'unlike' : 'like', tags, 'short', (activeShort as any).creator?.id || (activeShort as any).author?.id);
      }

      return { ...prev, [id]: !currentlyLiked };
    });
  };

  const toggleSubscribe = (handle: string) => {
    setSubscribedMap((prev) => ({ ...prev, [handle]: !prev[handle] }));
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmittingComment || !activeShort) return;

    setIsSubmittingComment(true);
    const slug = activeShort.slug;
    const authorName = userData?.username || 'Du (Benutzer)';
    const authorHandle = userData?.handle || '@du';
    const authorAvatar = resolveAvatarUrl(userData?.avatarUrl);

    const created = await createCommentInStrapi({
      feedSlug: slug,
      text: commentText.trim(),
      authorName,
      authorHandle,
      authorAvatar,
    });

    const newCommentItem: CommentItem = created || {
      id: Date.now(),
      documentId: String(Date.now()),
      text: commentText.trim(),
      authorName,
      authorHandle,
      authorAvatar,
      isEdited: false,
      feedSlug: slug,
      createdAt: 'Gerade eben',
      isCurrentUser: true,
    };

    setCommentsMap((prev) => ({
      ...prev,
      [slug]: [newCommentItem, ...(prev[slug] || [])],
    }));

    setCommentText('');
    setIsSubmittingComment(false);
  };

  const handleStartEdit = (comment: CommentItem) => {
    setEditingCommentId(comment.documentId || comment.id);
    setEditCommentText(comment.text);
  };

  const handleSaveEdit = async (commentId: string | number) => {
    if (!editCommentText.trim() || !activeShort) return;
    const slug = activeShort.slug;

    await updateCommentInStrapi(commentId, editCommentText.trim());
    setCommentsMap((prev) => ({
      ...prev,
      [slug]: (prev[slug] || []).map((c) =>
        c.documentId === commentId || c.id === commentId
          ? { ...c, text: editCommentText.trim(), isEdited: true }
          : c
      ),
    }));
    setEditingCommentId(null);
    setEditCommentText('');
  };

  const handleDeleteComment = async (commentId: string | number) => {
    if (!activeShort) return;
    const slug = activeShort.slug;

    await deleteCommentFromStrapi(commentId);
    setCommentsMap((prev) => ({
      ...prev,
      [slug]: (prev[slug] || []).filter((c) => c.documentId !== commentId && c.id !== commentId),
    }));
  };

  return (
    <div className="relative h-screen w-screen bg-black text-white overflow-hidden flex flex-col font-sans select-none">
      {isPreviewActive && (
        <div className="bg-gradient-to-r from-[#8083ff] via-[#44e2cd] to-[#8083ff] text-white text-xs py-2 px-4 flex items-center justify-between z-50 sticky top-0 shadow-xl font-sans">
          <div className="flex items-center gap-2 font-bold tracking-wide">
            {/* Not spinning: nothing is loading, and a permanent spinner reads
                as a page that never finishes. */}
            <Sparkles className="h-4 w-4 text-yellow-300 shrink-0" />
            <span>{t.shorts.draftModeActive}</span>
          </div>
          <a
            href={`/api/exit-preview?redirect=${encodeURIComponent(activeShort ? `/shorts/${activeShort.slug}` : '/shorts')}`}
            className="bg-black/50 hover:bg-black/80 text-white px-3 py-1 rounded-lg font-bold text-[11px] border border-white/20 transition-all shrink-0"
          >
            {t.shorts.exitPreview}
          </a>
        </div>
      )}
      
      {/* ── Top Floating Navigation Overlay ─────────────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 z-40 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-xs font-semibold text-white backdrop-blur-md transition-all"
        >
          <ArrowLeft className="h-4 w-4 text-indigo-400" />
          <span>Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 px-3 py-1 rounded-full backdrop-blur-md">
            <Flame className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span className="text-xs font-extrabold tracking-wide">Omni Shorts</span>
          </div>

          {activeShort && (
            <Link
              href={listId ? `/video/${activeShort.slug}?list=${encodeURIComponent(listId)}` : `/video/${activeShort.slug}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-xs font-semibold text-white backdrop-blur-md transition-all"
              title="Standard View / Detailansicht"
            >
              <Film className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Standard View</span>
            </Link>
          )}
        </div>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2.5 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white backdrop-blur-md transition-all"
          title={isMuted ? 'Ton einschalten' : 'Stummschalten'}
        >
          {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-teal-400" />}
        </button>
      </header>

      {/* ── Vertical Snap Scroll Container ──────────────────────────────────── */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-screen w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth custom-scrollbar"
      >
        {shortsList.map((short, idx) => {
          const isActive = idx === activeIndex;
          const isLiked = !!likedMap[short.id];
          const likesCount = likesMap[short.id] ?? short.likesCount;
          const isBookmarked = Boolean(short.documentId) && listsContaining(short.documentId as string).length > 0;
          const authorHandle = getAuthorHandle(short);
          const isSubscribed = !!subscribedMap[authorHandle];

          return (
            <section
              key={short.id}
              className="snap-start snap-always h-screen w-full relative flex items-center justify-center bg-black overflow-hidden"
            >
              {/* Video Player */}
              <ShortVideoPlayer
                short={short}
                isActive={isActive}
                isMuted={isMuted}
              />

              {/* Dark Gradient Overlays for readable text */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

              {/* Right Floating Action Sidebar */}
              <aside className="absolute right-3 sm:right-6 bottom-20 z-30 flex flex-col items-center gap-5">
                {/* Author Avatar with Subscribe Badge */}
                <div className="relative">
                  <Image
                    src={getAuthorAvatar(short)}
                    alt={getAuthorName(short)}
                    className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-xl"
                  />
                  <button
                    onClick={() => toggleSubscribe(authorHandle)}
                    className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-md ${
                      isSubscribed
                        ? 'bg-teal-400 text-black'
                        : 'bg-indigo-600 text-white hover:scale-110'
                    }`}
                    title={isSubscribed ? t.videoDetail.subscribedBtn : t.videoDetail.subscribeBtn}
                  >
                    {isSubscribed ? '✓' : '+'}
                  </button>
                </div>

                {/* Like Button */}
                <button
                  onClick={() => toggleLike(short.id, short.likesCount)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className={`p-3 rounded-full backdrop-blur-md border transition-all ${
                    isLiked
                      ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/40 scale-110'
                      : 'bg-black/50 border-white/10 text-white hover:bg-black/80'
                  }`}>
                    <Heart className={`h-6 w-6 ${isLiked ? 'fill-current' : ''}`} />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-white shadow-sm">
                    {likesCount}
                  </span>
                </button>

                {/* Comments Button */}
                <button
                  onClick={() => setCommentsOpen(true)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="p-3 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white backdrop-blur-md transition-all">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-white shadow-sm">
                    {activeComments.length}
                  </span>
                </button>

                {/* Bookmark Button */}
                {/*
                  Saving something now means putting it somewhere (#152). This
                  used to flip a local boolean that was never persisted and was
                  gone on the next reload — the button looked like it worked and
                  did nothing.
                */}
                <button
                  onClick={() => setPlaylistForVideo(short.documentId || null)}
                  className="flex flex-col items-center gap-1 group"
                  title={(t as any).playlists?.addTo || 'Zu Playlist hinzufügen'}
                >
                  <div className={`p-3 rounded-full backdrop-blur-md border transition-all ${
                    isBookmarked
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-black/50 border-white/10 text-white hover:bg-black/80'
                  }`}>
                    <Bookmark className={`h-6 w-6 ${isBookmarked ? 'fill-current' : ''}`} />
                  </div>
                </button>

                {/* Share Button */}
                <button
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.origin + `/shorts/${short.slug}`);
                      showToast(t.shorts.shortLinkCopied);
                    }
                  }}
                  className="p-3 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white backdrop-blur-md transition-all"
                  title={t.common.share}
                >
                  <Share2 className="h-6 w-6" />
                </button>

                {/* Spinning Music Disc Icon */}
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-teal-400 p-0.5 shadow-lg">
                  <div className="h-full w-full rounded-full bg-black flex items-center justify-center">
                    <Music className="h-4 w-4 text-white" />
                  </div>
                </div>
              </aside>

              {/* Bottom Left Info Panel */}
              <div className="absolute left-4 sm:left-6 bottom-6 right-20 z-30 flex flex-col gap-2 max-w-lg">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white drop-shadow-md">{getAuthorName(short)}</span>
                  <span className="text-xs font-mono font-semibold text-indigo-400 bg-black/50 border border-indigo-500/40 px-2 py-0.5 rounded-md">
                    {authorHandle}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-white leading-snug drop-shadow-md">
                  {short.title}
                </h3>

                <p className="text-xs text-white/90 line-clamp-2 leading-relaxed opacity-90">
                  {short.summary}
                </p>

                {/* Hashtags & AI Bucket */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {/* Guarded: a video without tags used to throw here and take
                      the whole feed down with it, which is how the empty
                      scroller under `?list=` was found. */}
                  {(short.tags || []).map((t) => (
                    <span key={t} className="text-[10px] font-mono font-bold text-teal-400 bg-black/60 px-2 py-0.5 rounded-md border border-teal-500/30">
                      #{t}
                    </span>
                  ))}
                  <span className="text-[10px] font-mono text-amber-400 bg-black/60 px-2 py-0.5 rounded-md border border-amber-500/30">
                    ⚡ {short.bucketSource || 'Omni AI Short'}
                  </span>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* ── Slide-over Comments Drawer ───────────────────────────────────────── */}
      {commentsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fadeIn">
          <div className="w-full max-w-md bg-surface-raised border-l border-subtle h-full flex flex-col p-5 shadow-2xl animate-slideDown">
            <div className="flex items-center justify-between pb-4 border-b border-subtle">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-400" />
                <span>{lang === 'de' ? `${t.shorts.commentsLabel} (${activeComments.length})` : `${t.shorts.commentsLabel} (${activeComments.length})`}</span>
              </h3>
              <button
                type="button"
                onClick={() => setCommentsOpen(false)}
                className="p-1 text-muted hover:text-primary rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar py-4 flex flex-col gap-3">
              {loadingComments ? (
                <div className="py-6 text-center text-xs text-muted font-mono animate-pulse">
                  {t.common.loadingComments}
                </div>
              ) : activeComments.length === 0 ? (
                <div className="py-6 text-center text-xs text-faint font-mono">
                  {t.common.noCommentsYet}
                </div>
              ) : (
                activeComments.map((c) => {
                  const commentKey = c.documentId || String(c.id);
                  const isEditing = editingCommentId === commentKey;
                  const isOwner = c.isCurrentUser || c.authorHandle === '@du' || (userData && c.authorHandle === userData.handle);

                  return (
                    <div key={commentKey} className="bg-surface p-3 rounded-xl border border-subtle flex gap-3 group transition-all">
                      <Image src={c.authorAvatar} alt={c.authorName} className="h-7 w-7 rounded-full object-cover border border-subtle shrink-0" />
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-primary">{c.authorName}</span>
                            <span className="font-mono text-indigo-400 text-[10px]">{c.authorHandle}</span>
                            {c.isEdited && (
                              <span className="text-[9px] text-muted italic font-mono">{t.common.edited}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-faint">{c.createdAt}</span>
                            {isOwner && !isEditing && (
                              <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(c)}
                                  title={t.common.commentEdit}
                                  className="p-1 text-muted hover:text-indigo-400 rounded hover:bg-surface-raised transition-all"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(commentKey)}
                                  title={t.common.commentDelete}
                                  className="p-1 text-muted hover:text-rose-400 rounded hover:bg-surface-raised transition-all"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="flex flex-col gap-2 mt-1">
                            <textarea
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              className="w-full bg-canvas border border-indigo-500 rounded-lg p-2 text-xs text-primary focus:outline-none resize-y min-h-[50px]"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingCommentId(null)}
                                className="px-2.5 py-1 rounded bg-surface hover:bg-surface-raised text-[10px] text-muted font-medium transition-all"
                              >
                                {t.common.cancel}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(commentKey)}
                                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-[10px] text-white font-medium flex items-center gap-1 transition-all"
                              >
                                <Check className="h-3 w-3" />
                                <span>{t.common.save}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-primary leading-relaxed break-words">{c.text}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleAddComment} className="pt-3 border-t border-subtle flex gap-2">
              <input
                id="shorts-comment-input"
                type="text"
                aria-label={lang === 'de' ? 'Kommentar schreiben' : 'Write comment'}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  userData
                    ? (lang === 'de' ? `Als ${userData.username} kommentieren...` : `Comment as ${userData.username}...`)
                    : (t.common.commentPlaceholder)
                }
                className="flex-1 bg-surface border border-subtle rounded-xl px-3 py-2 text-xs text-primary placeholder-faint focus:outline-none"
                disabled={isSubmittingComment}
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !commentText.trim()}
                aria-label={lang === 'de' ? 'Kommentar absenden' : 'Submit comment'}
                title={lang === 'de' ? 'Kommentar absenden' : 'Submit comment'}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0 transition-all"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sharing confirms without blocking the feed. */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-black/85 border border-white/15 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl animate-fadeIn flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <AddToPlaylistModal
        videoDocumentId={playlistForVideo || ''}
        isOpen={Boolean(playlistForVideo)}
        onClose={() => setPlaylistForVideo(null)}
      />
    </div>
  );
}
