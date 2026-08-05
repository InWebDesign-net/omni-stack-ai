'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  CheckCircle2,
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
  User,
} from 'lucide-react';
import { FeedItem, FALLBACK_FEED_ITEMS, getAuthorName, getAuthorHandle, getAuthorAvatar } from '@/lib/feed';

export default function ShortsFeedPage() {
  const router = useRouter();
  const params = useParams();
  const initialSlug = params?.slug as string;

  // Filter all shorts from dataset
  const shortsList = React.useMemo(() => {
    const allShorts = FALLBACK_FEED_ITEMS.filter((item) => item.mediaType === 'short');
    return allShorts.length > 0 ? allShorts : FALLBACK_FEED_ITEMS;
  }, []);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});
  const [likesMap, setLikesMap] = useState<Record<number, number>>({});
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<number, boolean>>({});
  const [subscribedMap, setSubscribedMap] = useState<Record<string, boolean>>({});
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activeComments, setActiveComments] = useState<Array<{ id: number; author: string; handle: string; text: string }>>([
    { id: 1, author: 'Astro', handle: '@astro', text: 'Klasse Video! Das muss ich gleich ausprobieren 🔥' },
    { id: 2, author: 'DemoGourmet', handle: '@demogourmet', text: 'Super knackig erklärt 👍' },
  ]);
  const [commentText, setCommentText] = useState('');

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
        window.history.replaceState(null, '', `/shorts/${currentShort.slug}`);
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

  const toggleLike = (id: number, currentLikes: number) => {
    setLikedMap((prev) => {
      const currentlyLiked = !!prev[id];
      setLikesMap((l) => ({ ...l, [id]: (l[id] ?? currentLikes) + (currentlyLiked ? -1 : 1) }));
      return { ...prev, [id]: !currentlyLiked };
    });
  };

  const toggleSubscribe = (handle: string) => {
    setSubscribedMap((prev) => ({ ...prev, [handle]: !prev[handle] }));
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setActiveComments((prev) => [
      { id: Date.now(), author: 'Du', handle: '@du', text: commentText.trim() },
      ...prev,
    ]);
    setCommentText('');
  };

  return (
    <div className="relative h-screen w-screen bg-black text-white overflow-hidden flex flex-col font-sans select-none">
      
      {/* ── Top Floating Navigation Overlay ─────────────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 z-40 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-xs font-semibold text-white backdrop-blur-md transition-all"
        >
          <ArrowLeft className="h-4 w-4 text-[#8083ff]" />
          <span>Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#8083ff]/20 border border-[#8083ff]/40 text-[#c0c1ff] px-3 py-1 rounded-full backdrop-blur-md">
            <Flame className="h-3.5 w-3.5 text-[#ffb783] animate-pulse" />
            <span className="text-xs font-extrabold tracking-wide">Omni Shorts</span>
          </div>
        </div>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2.5 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white backdrop-blur-md transition-all"
          title={isMuted ? 'Ton einschalten' : 'Stummschalten'}
        >
          {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-[#44e2cd]" />}
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
          const isBookmarked = !!bookmarkedMap[short.id];
          const authorHandle = getAuthorHandle(short);
          const isSubscribed = !!subscribedMap[authorHandle];

          return (
            <section
              key={short.id}
              className="snap-start snap-always h-screen w-full relative flex items-center justify-center bg-black overflow-hidden"
            >
              {/* Video Player */}
              <video
                src={short.mediaUrl}
                poster={short.thumbnailUrl}
                loop
                muted={isMuted}
                autoPlay={isActive}
                playsInline
                className="h-full w-full object-cover sm:object-contain max-w-md mx-auto"
              />

              {/* Dark Gradient Overlays for readable text */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

              {/* Right Floating Action Sidebar */}
              <aside className="absolute right-3 sm:right-6 bottom-20 z-30 flex flex-col items-center gap-5">
                {/* Author Avatar with Subscribe Badge */}
                <div className="relative">
                  <img
                    src={getAuthorAvatar(short)}
                    alt={getAuthorName(short)}
                    className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-xl"
                  />
                  <button
                    onClick={() => toggleSubscribe(authorHandle)}
                    className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-md ${
                      isSubscribed
                        ? 'bg-[#44e2cd] text-black'
                        : 'bg-[#8083ff] text-white hover:scale-110'
                    }`}
                    title={isSubscribed ? 'Abonniert' : 'Abonnieren'}
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
                      ? 'bg-[#ff6b81] border-[#ff6b81] text-white shadow-lg shadow-[#ff6b81]/40 scale-110'
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
                <button
                  onClick={() => setBookmarkedMap((prev) => ({ ...prev, [short.id]: !prev[short.id] }))}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className={`p-3 rounded-full backdrop-blur-md border transition-all ${
                    isBookmarked
                      ? 'bg-[#8083ff] border-[#8083ff] text-white'
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
                      alert('Short Link kopiert!');
                    }
                  }}
                  className="p-3 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white backdrop-blur-md transition-all"
                  title="Teilen"
                >
                  <Share2 className="h-6 w-6" />
                </button>

                {/* Spinning Music Disc Icon */}
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#8083ff] to-[#44e2cd] p-0.5 animate-spin-slow shadow-lg">
                  <div className="h-full w-full rounded-full bg-black flex items-center justify-center">
                    <Music className="h-4 w-4 text-white" />
                  </div>
                </div>
              </aside>

              {/* Bottom Left Info Panel */}
              <div className="absolute left-4 sm:left-6 bottom-6 right-20 z-30 flex flex-col gap-2 max-w-lg">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white drop-shadow-md">{getAuthorName(short)}</span>
                  <span className="text-xs font-mono font-semibold text-[#8083ff] bg-black/50 border border-[#8083ff]/40 px-2 py-0.5 rounded-md">
                    {authorHandle}
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-[#44e2cd]" />
                </div>

                <h3 className="text-sm font-semibold text-white leading-snug drop-shadow-md">
                  {short.title}
                </h3>

                <p className="text-xs text-[#dae2fd] line-clamp-2 leading-relaxed opacity-90">
                  {short.summary}
                </p>

                {/* Hashtags & AI Bucket */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {short.tags.map((t) => (
                    <span key={t} className="text-[10px] font-mono font-bold text-[#44e2cd] bg-black/60 px-2 py-0.5 rounded-md border border-[#44e2cd]/30">
                      #{t}
                    </span>
                  ))}
                  <span className="text-[10px] font-mono text-[#ffb783] bg-black/60 px-2 py-0.5 rounded-md border border-[#ffb783]/30">
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
          <div className="w-full max-w-md bg-[#0d1528] border-l border-white/10 h-full flex flex-col p-5 shadow-2xl animate-slideDown">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#8083ff]" />
                <span>Kommentare ({activeComments.length})</span>
              </h3>
              <button
                onClick={() => setCommentsOpen(false)}
                className="p-1 text-[#9ba4bf] hover:text-white rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar py-4 flex flex-col gap-3">
              {activeComments.map((c) => (
                <div key={c.id} className="bg-[#080e1e] p-3 rounded-xl border border-white/5 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{c.author}</span>
                    <span className="font-mono text-[#8083ff] text-[10px]">{c.handle}</span>
                  </div>
                  <p className="text-xs text-[#dae2fd]">{c.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} className="pt-3 border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Kommentar schreiben..."
                className="flex-1 bg-[#080e1e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-[#5c657d] focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#8083ff] hover:bg-[#6b6eff] text-white px-4 py-2 rounded-xl text-xs font-semibold"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
