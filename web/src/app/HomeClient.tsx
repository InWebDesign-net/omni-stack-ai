'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Search, ArrowRight, Play, Eye, Heart, Film, Image as ImageIcon, Users, ChevronLeft, ChevronRight, MessageSquare, Clock, BookOpen } from 'lucide-react';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { useChat } from '@/context/ChatContext';
import { useContentList, ImageItem, VideoItem, ArticleItem } from '@/lib/hooks/useContentList';
import Image from 'next/image';
import { AVATAR_PLACEHOLDER, resolveAvatarUrl } from '@/lib/avatar';

interface ChannelItem {
  id: string | number;
  username: string;
  handle: string;
  avatarUrl: string;
  bio?: string;
  subscribersCount?: number;
  hasNewContent?: boolean;
}

export default function HomeClient() {
  const router = useRouter();
  const { t, lang, openChannelModal, currentUser } = useApp();
  const { createRoom, openChat } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [channels, setChannels] = useState<ChannelItem[]>([]);

  // Hook for Articles: affinity for logged-in, createdatasc for guests
  const { items: rawArticles = [], isLoading: isLoadingArticles } = useContentList<ArticleItem>('article', {
    currentPage: 1,
    pageSize: 6,
    sort: currentUser ? 'affinity' : 'createdatasc',
    lang,
    enabled: true,
  });

  // Hook for Videos: affinity for logged-in, createdatasc for guests
  const { items: rawVideos = [], isLoading: isLoadingVideos } = useContentList<VideoItem>('video', {
    currentPage: 1,
    pageSize: 6,
    sort: currentUser ? 'affinity' : 'createdatasc',
    lang,
    enabled: true,
  });

  // Hook for Images: affinity for logged-in, createdatasc for guests
  const { items: rawImages = [], isLoading: isLoadingImages } = useContentList<ImageItem>('image', {
    currentPage: 1,
    pageSize: 6,
    sort: currentUser ? 'affinity' : 'createdatasc',
    lang,
    enabled: true,
  });

  // Dynamic random rotation for guest users (rotates every 5 mins so guests see varied content)
  const articles = useMemo(() => {
    if (currentUser || !rawArticles.length) return rawArticles;
    const copy = [...rawArticles];
    const seed = Math.floor(Date.now() / 300000);
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.abs((seed + i * 13) % (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, [rawArticles, currentUser]);

  // Dynamic random rotation for guest users (rotates every 5 mins so guests see varied content)
  const videos = useMemo(() => {
    if (currentUser || !rawVideos.length) return rawVideos;
    const copy = [...rawVideos];
    const seed = Math.floor(Date.now() / 300000);
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.abs((seed + i * 17) % (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, [rawVideos, currentUser]);

  const images = useMemo(() => {
    if (currentUser || !rawImages.length) return rawImages;
    const copy = [...rawImages];
    const seed = Math.floor(Date.now() / 300000);
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.abs((seed + i * 23) % (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, [rawImages, currentUser]);

  const channelScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await fetch('/api/creators');
      if (res.ok) {
        const data = await res.json();
        const creators = data.creators || [];
        if (creators.length > 0) {
          const mapped: ChannelItem[] = creators.map((c: any) => ({
            id: String(c.id),
            documentId: c.documentId,
            username: c.username || 'Creator',
            handle: c.handle || `@${(c.username || 'creator').toLowerCase()}`,
            avatarUrl: resolveAvatarUrl(c.avatarUrl),
            bio: c.bio || '',
            subscribersCount: Number(c.subscribersCount || 0),
            hasNewContent: false,
          }));
          setChannels(mapped);
          return;
        }
      }
    } catch (e) {
      console.error('Error loading channels:', e);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Direct search query to video catalog or open AI assistant
    router.push(`/videos?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleAiSearchOpen = async () => {
    openChat();
    if (searchQuery.trim()) {
      await createRoom({
        name: 'Omni KI-Assistent',
        type: 'ai',
      });
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (channelScrollRef.current) {
      const amount = direction === 'left' ? -280 : 280;
      channelScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const updateScrollState = () => {
    if (channelScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = channelScrollRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
    }
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-base text-primary font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      <Header />

      <main className="flex-1 w-full max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <section className="relative rounded-3xl bg-gradient-to-b from-surface via-base to-base border border-subtle p-8 sm:p-12 shadow-2xl overflow-hidden text-center space-y-6">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
            <span>{t.home?.heroBadge || 'Hyper-Personalisiertes KI Mediennetzwerk'}</span>
          </div>

          <h1 className="relative text-3xl sm:text-5xl font-extrabold tracking-tight text-primary max-w-3xl mx-auto leading-tight">
            {t.home?.heroTitle || 'Was möchtest du heute entdecken?'}
          </h1>

          <p className="relative text-sm sm:text-base text-muted max-w-xl mx-auto leading-relaxed">
            {t.home?.heroSubtitle || 'Nutze die KI-Suche oder stöbere in un-gefiltertem Content direkt aus dem Omni Network.'}
          </p>

          <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto">
            <div className="relative flex items-center bg-surface-raised border border-subtle rounded-2xl p-2 shadow-2xl focus-within:border-indigo-500 transition-all">
              <Search className="w-5 h-5 text-muted ml-3 shrink-0" />
              <input
                id="home-hero-search-input"
                type="text"
                aria-label={t.home?.searchPlaceholder || 'Titel, Themen oder KI-Intents suchen'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.home?.searchPlaceholder || 'Titel, Themen oder KI-Intents suchen...'}
                className="w-full bg-transparent px-3 py-2.5 text-sm text-primary placeholder-slate-500 outline-none focus:outline-none focus:ring-0 ring-0 border-none shadow-none"
              />
              <button
                type="button"
                onClick={handleAiSearchOpen}
                aria-label={t.home?.askAiTitle || 'KI-Assistenten fragen'}
                className="px-3.5 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 font-semibold text-xs border border-indigo-500/30 flex items-center gap-1.5 transition-colors shrink-0 mr-1"
                title={t.home?.askAiTitle || 'KI-Assistenten fragen'}
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden sm:inline">{t.home?.askAiChat || 'KI-Chat'}</span>
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition-all shrink-0 active:scale-95"
              >
                <span>{t.home?.searchBtn || 'Suchen'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-center flex-wrap gap-2 text-xs">
              {[
                {
                  tags: 'Natur,Nature,Trees,Landscape,Bäume,Garden,Garten,Wald,Pflanzen,Plants,Tiere,Forest,Animals,Blumen,Flowers,Gras,Landscapes,Sonne,Umwelt',
                  label: t.home?.tags?.nature || '🌿 Natur & Umwelt',
                },
                {
                  tags: 'Kulinarik,Küche,Rezepte,Zubereitung,Kochen,Cooking,Food,Essen,Gerichte,Gourmet,Baking,Backen,Chef,Rezept,Pasta,Pizza,Salat',
                  label: t.home?.tags?.cooking || '🍝 Kulinarik & Zubereitung',
                },
                {
                  tags: 'Architektur,Städte,City,Architecture,Gebäude,Building,Metropole,Urban,Design,Skyline,Stadttour,Wohnen,Bauwerk,Museum,Brücke',
                  label: t.home?.tags?.cities || '🏙️ Architektur & Städte',
                },
                {
                  tags: 'Wissen,Schule,Wissenschaft,Science,Lernen,Tutorial,Bildung,Education,Tech,Doku,Dokumentation,Physik,Mathe,Geschichte,Forschung',
                  label: t.home?.tags?.education || '📚 Schule & Wissen',
                },
              ].map(({ tags, label }) => (
                <Link
                  key={label}
                  href={`/videos?page=1&includetag=${encodeURIComponent(tags)}`}
                  className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-raised border border-subtle text-muted hover:text-primary transition-all"
                >
                  {label}
                </Link>
              ))}
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0 mt-0.5 sm:mt-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="space-y-0.5">
                <h2 className="font-extrabold text-base sm:text-lg text-primary tracking-tight">{t.home?.creatorsTitle || 'Empfohlene Creator & Kanäle'}</h2>
                <p className="text-xs text-muted leading-normal">{t.home?.creatorsSubtitle || 'Kanäle mit frischem Content werden bevorzugt dargestellt'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                className="p-2 rounded-xl bg-surface hover:bg-surface-raised border border-subtle text-muted hover:text-primary disabled:opacity-30 transition-all cursor-pointer"
                aria-label="Nach links scrollen"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                className="p-2 rounded-xl bg-surface hover:bg-surface-raised border border-subtle text-muted hover:text-primary disabled:opacity-30 transition-all cursor-pointer"
                aria-label="Nach rechts scrollen"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={channelScrollRef}
            onScroll={updateScrollState}
            // pt-2 is not decoration: setting overflow-x makes overflow-y stop
            // being visible, so the cards' hover lift was clipped at the top edge.
            // The padding gives the transform somewhere to go.
            className="flex items-stretch gap-4 overflow-x-auto pt-2 pb-2 scrollbar-none scroll-smooth"
          >
            {channels.map((channel: any) => {
              const isChannelOwner = Boolean(
                currentUser &&
                  (currentUser.id === channel.id ||
                    currentUser.username === channel.username ||
                    (currentUser.handle && channel.handle && currentUser.handle.toLowerCase() === channel.handle.toLowerCase()))
              );
              const channelAvatar = (isChannelOwner && typeof currentUser?.avatarUrl !== 'undefined')
                ? (currentUser.avatarUrl || channel.avatarUrl)
                : channel.avatarUrl;

              return (
                <div
                  key={channel.id}
                  onClick={() => openChannelModal(channel)}
                  className="group w-64 sm:w-72 shrink-0 bg-surface hover:bg-surface-raised border border-subtle hover:border-indigo-500/40 rounded-2xl p-4 shadow-sm transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      {/* ⚡ Bolt Optimization: Added loading="lazy" to defer loading of off-screen avatars, saving bandwidth. */}
                      <Image
                        src={channelAvatar}
                        alt={channel.username}
                        width={44}
                        height={44}
                        loading="lazy"
                        className="w-11 h-11 rounded-xl object-cover border border-subtle group-hover:scale-105 transition-transform"
                        unoptimized
                      />
                      {channel.hasNewContent && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-teal-400 border-2 border-base" title={t.home?.newContentBadge || 'Neue Inhalte veröffentlicht!'} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-primary truncate group-hover:text-indigo-400 transition-colors">
                        {channel.username}
                      </h3>
                      <p className="text-xs font-mono text-indigo-400 truncate">
                        {channel.handle}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-muted mt-2.5 line-clamp-2 leading-relaxed">
                    {channel.bio}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-subtle flex items-center justify-between text-[11px] text-faint font-mono">
                    <span>{(channel.subscribersCount || 0).toLocaleString()} {t.home?.subscribers || 'Abonnenten'}</span>
                    <span className="text-indigo-400 font-semibold group-hover:underline">{t.home?.viewChannel || 'Kanal ansehen →'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Articles Section */}
        <section className="space-y-6 pt-4 border-t border-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0 mt-0.5 sm:mt-0">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-extrabold text-base sm:text-lg text-primary tracking-tight">{t.home?.articlesTitle || 'Aktuelle Artikel & Magazine im Network'}</h2>
                  <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border shrink-0 ${
                    currentUser
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  }`}>
                    {currentUser ? '✨ Für dich empfohlen' : '🎲 Zufällige Entdeckungen'}
                  </span>
                </div>
                <p className="text-xs text-muted leading-normal">{t.home?.articlesSubtitle || 'Entdecke fundierte Analysen, Tech-Tutorials & Berichte'}</p>
              </div>
            </div>

            <Link
              href="/articles"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors self-start sm:self-center shrink-0"
            >
              <span>{t.home?.viewAllArticles || 'Alle Artikel ansehen'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* INVARIANT: Item count (6) must be evenly divisible by the column count at every breakpoint (2, 3, 6). */}
          {isLoadingArticles ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="animate-pulse flex flex-col space-y-2">
                  <div className="aspect-video bg-surface-raised/80 rounded-xl w-full" />
                  <div className="space-y-1.5 pt-1">
                    <div className="h-3.5 bg-surface-raised/60 rounded w-3/4" />
                    <div className="h-3 bg-surface-raised/40 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-6">
              {articles.slice(0, 6).map((item: any) => {
                const creator = item.creator || item.author;
                const creatorName = creator?.username || creator?.handle || item.authorName || 'Omni Creator';
                const isItemOwner = Boolean(
                  currentUser &&
                    (currentUser.id === creator?.id ||
                      currentUser.username === creatorName ||
                      (currentUser.handle && (creator?.handle || item.authorHandle) && currentUser.handle.toLowerCase() === (creator?.handle || item.authorHandle).toLowerCase()))
                );
                const rawCreatorAvatar = creator?.avatarUrl || resolveAvatarUrl(item.authorAvatar);
                const creatorAvatar = (isItemOwner && typeof currentUser?.avatarUrl !== 'undefined')
                  ? (currentUser.avatarUrl || rawCreatorAvatar)
                  : rawCreatorAvatar;

                return (
                  <div
                    key={item.documentId || item.slug || item.id}
                    className="group flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    {/* Article Thumbnail / Fallback */}
                    <Link href={`/article/${item.slug}`} className="relative aspect-video w-full overflow-hidden rounded-xl block bg-surface shadow-md">
                      {item.thumbnail || item.thumbnailUrl ? (
                        <Image
                          src={item.thumbnail || item.thumbnailUrl}
                          alt={item.title}
                          loading="lazy"
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-purple-950 via-indigo-950 to-slate-900 flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-purple-400/50 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                    </Link>

                    {/* Card Details */}
                    <div className="pt-2.5 flex-1 flex flex-col justify-between gap-1.5">
                      <div>
                        <Link
                          href={`/article/${item.slug}`}
                          className="font-semibold text-primary group-hover:text-purple-400 text-xs sm:text-sm line-clamp-2 transition-colors leading-snug"
                        >
                          {item.title}
                        </Link>
                      </div>

                      {/* Creator & Meta */}
                      <div className="flex items-center justify-between text-[11px] text-muted">
                        <Link href={creator?.handle || creator?.id ? `/user/${creator.handle || creator.id}` : '#'} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity min-w-0">
                          <Image
                            src={creatorAvatar}
                            alt={creatorName}
                            width={20}
                            height={20}
                            loading="lazy"
                            className="w-5 h-5 rounded-full object-cover border border-subtle shrink-0"
                            unoptimized
                          />
                          <span className="truncate max-w-[70px] sm:max-w-[120px] text-muted font-medium">{creatorName}</span>
                        </Link>

                        <div className="flex items-center gap-2 text-muted shrink-0 font-mono text-[10px]">
                          {item.viewsCount !== undefined && (
                            <div className="flex items-center gap-0.5" title="Aufrufe">
                              <Eye className="w-3 h-3 text-muted" />
                              <span>{item.viewsCount.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-0.5" title="Likes">
                            <Heart className="w-3 h-3 text-rose-400" />
                            <span>{(item.likesCount || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-6 pt-4 border-t border-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0 mt-0.5 sm:mt-0">
                <Film className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-extrabold text-base sm:text-lg text-primary tracking-tight">{t.home?.videosTitle || 'Aktuelle Videos im Network'}</h2>
                  <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border shrink-0 ${
                    currentUser
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  }`}>
                    {currentUser ? '✨ Für dich empfohlen' : '🎲 Zufällige Entdeckungen'}
                  </span>
                </div>
                <p className="text-xs text-muted leading-normal">{t.home?.videosSubtitle || 'Entdecke die neusten Veröffentlichungen im Katalog'}</p>
              </div>
            </div>

            <Link
              href="/videos"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors self-start sm:self-center shrink-0"
            >
              <span>{t.home?.viewAllVideos || 'Alle Videos ansehen'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* INVARIANT: Item count (6) must be evenly divisible by the column count at every breakpoint (2, 3, 6). */}
          {isLoadingVideos ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="animate-pulse flex flex-col space-y-2">
                  <div className="aspect-video bg-surface-raised/80 rounded-xl w-full" />
                  <div className="space-y-1.5 pt-1">
                    <div className="h-3.5 bg-surface-raised/60 rounded w-3/4" />
                    <div className="h-3 bg-surface-raised/40 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-6">
              {videos.map((item: any) => {
                const creator = item.creator || item.author;
                const creatorName = creator?.username || creator?.handle || item.authorName || 'Omni Creator';
                const isItemOwner = Boolean(
                  currentUser &&
                    (currentUser.id === creator?.id ||
                      currentUser.username === creatorName ||
                      (currentUser.handle && (creator?.handle || item.authorHandle) && currentUser.handle.toLowerCase() === (creator?.handle || item.authorHandle).toLowerCase()))
                );
                const rawCreatorAvatar = creator?.avatarUrl || resolveAvatarUrl(item.authorAvatar);
                const creatorAvatar = (isItemOwner && typeof currentUser?.avatarUrl !== 'undefined')
                  ? (currentUser.avatarUrl || rawCreatorAvatar)
                  : rawCreatorAvatar;

                return (
                  <div
                    key={item.documentId || item.slug || item.id}
                    className="group flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    {/* Video Thumbnail & Play Overlay */}
                    <Link href={`/video/${item.slug}`} className="relative aspect-video w-full overflow-hidden rounded-xl block bg-surface shadow-md">
                      <Image
                        src={item.thumbnailUrl || '/media/thumbnails/default.png'}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                      {/* Play Icon Badge */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="p-2 sm:p-2.5 rounded-full bg-indigo-600/90 text-white shadow-lg backdrop-blur-md transform group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white ml-0.5" />
                        </div>
                      </div>

                      {/* Duration Badge */}
                      {Boolean(item.duration && item.duration > 0) && (
                        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-surface-raised/80 backdrop-blur-md border border-subtle text-[9px] sm:text-[10px] font-mono text-primary flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-indigo-400" />
                          <span>{formatDuration(item.duration)}</span>
                        </div>
                      )}
                    </Link>

                    {/* Card Details */}
                    <div className="pt-2.5 flex-1 flex flex-col justify-between gap-1.5">
                      <div>
                        <Link
                          href={`/video/${item.slug}`}
                          className="font-semibold text-primary group-hover:text-indigo-300 text-xs sm:text-sm line-clamp-2 transition-colors leading-snug"
                        >
                          {item.title}
                        </Link>
                      </div>

                      {/* Creator & Meta */}
                      <div className="flex items-center justify-between text-[11px] text-muted">
                        <Link href={creator?.handle || creator?.id ? `/user/${creator.handle || creator.id}` : '#'} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity min-w-0">
                          <Image
                            src={creatorAvatar}
                            alt={creatorName}
                            width={20}
                            height={20}
                            loading="lazy"
                            className="w-5 h-5 rounded-full object-cover border border-subtle shrink-0"
                            unoptimized
                          />
                          <span className="truncate max-w-[70px] sm:max-w-[120px] text-muted font-medium">{creatorName}</span>
                        </Link>

                        <div className="flex items-center gap-2 text-muted shrink-0 font-mono text-[10px]">
                          {item.viewsCount !== undefined && (
                            <div className="flex items-center gap-0.5" title="Aufrufe">
                              <Eye className="w-3 h-3 text-muted" />
                              <span>{item.viewsCount.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-0.5" title="Kommentare">
                            <MessageSquare className="w-3 h-3 text-indigo-400" />
                            <span>{(item.commentsCount || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-0.5" title="Likes">
                            <Heart className="w-3 h-3 text-rose-400" />
                            <span>{(item.likesCount || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-6 pt-4 border-t border-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 shrink-0 mt-0.5 sm:mt-0">
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-extrabold text-base sm:text-lg text-primary tracking-tight">Aktuelle Bilder & Galerie im Network</h2>
                  <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border shrink-0 ${
                    currentUser
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      : 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                  }`}>
                    {currentUser ? '✨ Für dich empfohlen' : '🎲 Zufällige Entdeckungen'}
                  </span>
                </div>
                <p className="text-xs text-muted leading-normal">Entdecke Kunstwerke, Renderings & Fotografie im WebP-Format</p>
              </div>
            </div>

            <Link
              href="/images"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors self-start sm:self-center shrink-0"
            >
              <span>Alle Bilder ansehen</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoadingImages ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="animate-pulse flex flex-col space-y-2">
                  <div className="aspect-[4/3] bg-surface-raised/80 rounded-xl w-full" />
                  <div className="space-y-1.5 pt-1">
                    <div className="h-3.5 bg-surface-raised/60 rounded w-3/4" />
                    <div className="h-3 bg-surface-raised/40 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-6">
              {images.slice(0, 6).map((img) => (
                <Link
                  key={img.id || img.documentId}
                  href={`/image/${img.slug}`}
                  className="group relative flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="relative aspect-[4/3] bg-surface rounded-xl overflow-hidden shadow-md">
                    <Image
                      src={img.thumbnailUrl || img.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80'}
                      alt={img.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                  </div>
                  <div className="pt-2 flex flex-col gap-0.5">
                    <h3 className="font-semibold text-xs text-primary group-hover:text-teal-400 transition-colors line-clamp-1">
                      {img.title}
                    </h3>
                    <span className="text-[10px] text-muted font-mono truncate">
                      {img.creator?.username || 'Creator'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
