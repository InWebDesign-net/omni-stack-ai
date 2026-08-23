'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from '@/components/common/LocaleLink';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Share2,
  ListPlus,
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
import { toggleLike as persistLike } from '@/lib/likes';
import { shareContent } from '@/lib/share';
import { UnifiedCommentsSection } from '@/components/comments/UnifiedCommentsSection';
import { Toast, useToast } from '@/components/common/Toast';
import SubscribeButton from '@/components/SubscribeButton';

function ShortVideoPlayer({
  short,
  isActive,
  isMuted,
  playLabel,
}: {
  short: FeedItem;
  isActive: boolean;
  isMuted: boolean;
  playLabel: string;
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

  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      /*
       * A refused autoplay must show the play button, not a frozen frame.
       *
       * The browser blocks autoplay with sound until the reader has interacted
       * with the page, so the first slide of a fresh visit often does not
       * start. Relying on the `pause` event alone missed this: the video never
       * played, so it never paused, and the overlay that would explain the
       * still image never appeared.
       */
      video.play().then(() => setIsPaused(false)).catch(() => setIsPaused(true));
    } else {
      video.pause();
      video.currentTime = 0;
      setIsPaused(false);
      setProgress(0);
    }
  }, [isActive]);

  /* Progress for the bar at the bottom. `timeupdate` fires a few times a
     second, which is enough for a 2px line and cheaper than an animation
     frame loop per slide. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => {
      if (video.duration > 0) setProgress((video.currentTime / video.duration) * 100);
    };
    const onPlay = () => setIsPaused(false);
    const onPause = () => setIsPaused(true);

    video.addEventListener('timeupdate', onTime);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  /**
   * Tap the video to pause, tap again to resume — the gesture people already
   * know from every other vertical feed. The state comes from the element's own
   * events rather than from this handler, so the icon still matches when
   * something else pauses it.
   */
  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

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
      <div className="relative h-full w-auto aspect-[9/16]">
        <video
          ref={videoRef}
          poster={short.thumbnailUrl}
          loop
          muted={isMuted}
          playsInline
          onClick={togglePlayback}
          className="h-full w-full object-cover cursor-pointer"
        />

        {/* Shown only while paused, the way a video player does it — a
            permanent overlay would sit on top of the content. */}
        {isPaused && isActive && (
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={playLabel}
            className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer focus:outline-none"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/20 shadow-2xl">
              <Play className="h-9 w-9 text-white fill-current translate-x-0.5" />
            </span>
          </button>
        )}

        {/* A thin line rather than a scrub bar: this surface is scrolled, not
            seeked, and a draggable control here would fight the swipe. */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/15">
          <div
            className="h-full bg-white/80 transition-[width] duration-150 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
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
  const { lang, currentUser, openAuthModal, openChannelModal, t } = useApp();

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
  
  // Comments state connected to Strapi
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [isPreviewActive, setIsPreviewActive] = useState(false);

  const { message: toastMessage, showToast } = useToast();

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



  /* Reported by the comments component, so the badge and the panel cannot
     disagree about how many there are. */
  const [commentCount, setCommentCount] = useState(0);

  /*
   * The same write the standard player makes.
   *
   * This used to move a local boolean and send a tracking event, and that was
   * all — the like was gone on reload and the profile never saw it. What
   * happens behind the two views should not differ; only how they look does.
   */
  const toggleLike = (id: number, currentLikes: number) => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    const currentlyLiked = !!likedMap[id];
    const nextLiked = !currentlyLiked;

    setLikedMap((prev) => ({ ...prev, [id]: nextLiked }));
    setLikesMap((l) => ({ ...l, [id]: Math.max(0, (l[id] ?? currentLikes) + (nextLiked ? 1 : -1)) }));

    void persistLike({ videoId: id, desired: nextLiked });

    if (activeShort && activeShort.id === id) {
      const tags = Array.isArray(activeShort.tags) && activeShort.tags.length > 0
        ? activeShort.tags
        : [(activeShort as any).category, activeShort.title].filter(Boolean);
      tracker.track(nextLiked ? 'like' : 'unlike', tags, 'short', (activeShort as any).creator?.id || (activeShort as any).author?.id);
    }
  };

  /* Which of these videos the reader has already liked, so the heart is right
     before they touch it. */
  useEffect(() => {
    if (!currentUser) {
      setLikedMap({});
      return;
    }
    let active = true;
    fetch('/api/likes', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        const ids: string[] = data.likedVideoIds || [];
        setLikedMap(Object.fromEntries(ids.map((likedId) => [Number(likedId), true])));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [currentUser]);






  return (
    /*
     * The context menu is suppressed here: this is a player surface, and the
     * browser's menu on a fullscreen video offers "save video as" and "loop"
     * over content whose access we control. It stays available everywhere else
     * in the app.
     */
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="relative h-screen w-screen bg-black text-white overflow-hidden flex flex-col font-sans select-none"
    >
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
          const isInPlaylist = Boolean(short.documentId) && listsContaining(short.documentId as string).length > 0;
          const authorHandle = getAuthorHandle(short);
          const creatorId = (short as any).creator?.id || (short as any).author?.id;

          return (
            <section
              key={short.id}
              className="snap-start snap-always h-screen w-full relative flex items-center justify-center bg-black overflow-hidden"
            >
              {/*
                The overlays belong to the video, not to the viewport.
                Since the frame is a centred 9:16 column, positioning them
                against the window left the creator, the title and the tags
                stranded on the black margin on any wide screen. This box has
                the same geometry as the video, so everything sits on it.
              */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="relative h-full w-auto aspect-[9/16] max-w-full" data-shorts-frame />
              </div>

              {/* Video Player */}
              <ShortVideoPlayer
                short={short}
                isActive={isActive}
                isMuted={isMuted}
                playLabel={t?.player?.play || 'Abspielen'}
              />

              {/* Dark Gradient Overlays for readable text */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

              {/* Right Floating Action Sidebar */}
              {/* Lifted clear of the chat bubble for the same reason — the
                  column used to end right on top of it. */}
              <aside
                style={{
                  bottom: `calc(5rem + var(--chat-dock-height, 0px))`,
                  right: `max(0.75rem, calc((100vw - 100vh * 9 / 16) / 2 + 0.75rem))`,
                }}
                className="absolute z-30 flex flex-col items-center gap-5"
              >
                {/* Author Avatar with Subscribe Badge */}
                <div className="relative">
                  {/* Same destination as the creator badge on the standard
                      page: the avatar is the way into the channel. */}
                  <button
                    type="button"
                    onClick={() => openChannelModal((short as any).creator || (short as any).author || short)}
                    className="block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer"
                    title={getAuthorName(short)}
                    aria-label={getAuthorName(short)}
                  >
                    <Image
                      src={getAuthorAvatar(short)}
                      alt={getAuthorName(short)}
                      className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-xl"
                    />
                  </button>
                  {/*
                    The subscribe control the rest of the app uses, in its
                    icon-only size. What sat here was a second implementation of
                    it — and before that a third, which only moved a local map
                    and never told the server at all. The component already
                    knows the current state, the self-check and the failure
                    handling; the only thing this surface needs to decide is
                    where it sits.
                  */}
                  {creatorId && (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                      <SubscribeButton
                        targetId={String(creatorId)}
                        iconOnly
                        size="sm"
                        className="!p-1 !rounded-full shadow-md scale-90"
                      />
                    </span>
                  )}
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
                    {commentCount}
                  </span>
                </button>

                {/* Playlist — the one "save" this surface has. The bookmark
                    button next to it did nothing and is gone; two controls that
                    both mean "keep this" is one too many. */}
                <button
                  onClick={() => setPlaylistForVideo(short.documentId || null)}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                  title={(t as any).playlists?.addTo || 'Zu Playlist hinzufügen'}
                >
                  <div className={`p-3 rounded-full backdrop-blur-md border transition-all ${
                    isInPlaylist
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-black/50 border-white/10 text-white hover:bg-black/80'
                  }`}>
                    <ListPlus className="h-6 w-6" />
                  </div>
                </button>

                {/* Share Button */}
                <button
                  onClick={() => shareContent({ path: `/video/${short.slug}`, title: short.title }, showToast, t.common.linkCopied || t.shorts.shortLinkCopied)}
                  className="p-3 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white backdrop-blur-md transition-all cursor-pointer"
                  title={t.common.share}
                >
                  <Share2 className="h-6 w-6" />
                </button>
              </aside>

              {/* Bottom Left Info Panel */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-6 z-30 flex flex-col gap-2 w-[min(100%,calc(100vh*9/16))] px-4 pr-20 sm:px-5 sm:pr-24">
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
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* ── Slide-over Comments Drawer ───────────────────────────────────────── */}
      {commentsOpen && activeShort && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fadeIn">
          {/*
            The same comments as every other surface, not a second
            implementation of them. The one that used to live here was a flat
            list: no threads, no replies, no editing, no paging — so a
            conversation looked different depending on which view you opened it
            in.

            The drawer is deliberately a bare container: `UnifiedCommentsSection`
            brings its own heading, count and card, and wrapping that in a
            second heading and a second card is what a straight swap produced.
            Padded at the bottom by whatever the chat occupies in that corner,
            because the drawer runs the full height and its input sat
            underneath the chat bubble.
          */}
          <div
            style={{ paddingBottom: `calc(1rem + var(--chat-dock-height, 0px))` }}
            className="w-full max-w-md h-full flex flex-col bg-canvas border-l border-subtle shadow-2xl animate-slideDown overflow-y-auto"
          >
            <div className="flex justify-end p-3 shrink-0">
              <button
                type="button"
                onClick={() => setCommentsOpen(false)}
                className="p-2 text-muted hover:text-primary rounded-lg hover:bg-surface transition-colors cursor-pointer"
                aria-label={t?.common?.close || 'Schließen'}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 px-3 pb-3">
              <UnifiedCommentsSection
                slug={activeShort.slug}
                lang={lang}
                t={t}
                onCommentsCountChange={setCommentCount}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sharing confirms without blocking the feed. */}
      <Toast message={toastMessage} variant="overlay" />

      <AddToPlaylistModal
        videoDocumentId={playlistForVideo || ''}
        isOpen={Boolean(playlistForVideo)}
        onClose={() => setPlaylistForVideo(null)}
      />
    </div>
  );
}
