'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Search, ArrowRight, Play, Eye, Heart, Film, Image as ImageIcon, Users, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { useChat } from '@/context/ChatContext';
import { useImages } from '@/lib/hooks/useImages';

interface VideoItem {
  id: string | number;
  slug: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  viewsCount: number;
  likesCount: number;
  creator?: {
    username?: string;
    handle?: string;
    avatarUrl?: string;
  };
}

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
  const { t, lang, openChannelModal } = useApp();
  const { createRoom, openChat } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);

  const { images, isLoading: isLoadingImages } = useImages({
    currentPage: 1,
    pageSize: 6,
    lang,
  });

  const channelScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    fetchChannels();
    fetchRecentVideos();
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await fetch('/api/profile?pageSize=20');
      if (res.ok) {
        const data = await res.json();
        const rawProfiles = data.profiles || data.users || [];
        if (rawProfiles.length > 0) {
          const mapped: ChannelItem[] = rawProfiles.map((p: any) => ({
            id: String(p.id),
            documentId: p.documentId,
            username: p.username || 'Creator',
            handle: p.handle || `@${(p.username || 'creator').toLowerCase()}`,
            avatarUrl: p.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
            bio: p.bio || '',
            subscribersCount: Number(p.subscribersCount || 0),
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

  const fetchRecentVideos = async () => {
    setIsLoadingVideos(true);
    try {
      const res = await fetch('/api/video/list?pageSize=12');
      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos || []);
      }
    } catch (e) {
      console.error('Error fetching videos:', e);
    } finally {
      setIsLoadingVideos(false);
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

  const formatDuration = (sec: number) => {
    if (!sec) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-[#080e1e] text-[#dae2fd] font-sans selection:bg-[#8083ff] selection:text-white flex flex-col">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <section className="relative rounded-3xl bg-gradient-to-b from-[#0d1528] via-[#080e1e] to-[#080e1e] border border-white/10 p-8 sm:p-12 shadow-2xl overflow-hidden text-center space-y-6">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
            <span>{t.home?.heroBadge || 'Hyper-Personalisiertes KI Mediennetzwerk'}</span>
          </div>

          <h1 className="relative text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
            {t.home?.heroTitle || 'Was möchtest du heute entdecken?'}
          </h1>

          <p className="relative text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            {t.home?.heroSubtitle || 'Nutze die KI-Suche oder stöbere in un-gefiltertem Content direkt aus dem Omni Network.'}
          </p>

          <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto">
            <div className="relative flex items-center bg-[#0b1222] border border-white/15 rounded-2xl p-2 shadow-2xl focus-within:border-indigo-500 transition-all">
              <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
              <input
                id="home-hero-search-input"
                type="text"
                aria-label={t.home?.searchPlaceholder || 'Titel, Themen oder KI-Intents suchen'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.home?.searchPlaceholder || 'Titel, Themen oder KI-Intents suchen...'}
                className="w-full bg-transparent px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:outline-none focus:ring-0 ring-0 border-none shadow-none"
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
                  className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all"
                >
                  {label}
                </Link>
              ))}
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-lg text-white">{t.home?.creatorsTitle || 'Empfohlene Creator & Kanäle'}</h2>
                <p className="text-xs text-slate-400">{t.home?.creatorsSubtitle || 'Kanäle mit frischem Content werden bevorzugt dargestellt'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={channelScrollRef}
            onScroll={updateScrollState}
            className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none scroll-smooth"
          >
            {channels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => openChannelModal(channel)}
                className="flex-shrink-0 w-64 p-4 rounded-2xl bg-[#0d1528]/80 border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-300 shadow-lg cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {/* ⚡ Bolt Optimization: Added loading="lazy" to defer loading of off-screen avatars, saving bandwidth. */}
                    <img
                      src={channel.avatarUrl}
                      alt={channel.username}
                      loading="lazy"
                      className="w-12 h-12 rounded-xl object-cover border border-slate-700 group-hover:scale-105 transition-transform"
                    />
                    {channel.hasNewContent && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-teal-400 border-2 border-[#080e1e]" title={t.home?.newContentBadge || 'Neue Inhalte veröffentlicht!'} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-white truncate group-hover:text-indigo-400 transition-colors">
                      {channel.username}
                    </h3>
                    <p className="text-xs font-mono text-indigo-400 truncate">
                      {channel.handle}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                  {channel.bio}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>{(channel.subscribersCount || 0).toLocaleString()} {t.home?.subscribers || 'Abonnenten'}</span>
                  <span className="text-indigo-400 font-semibold group-hover:underline">{t.home?.viewChannel || 'Kanal ansehen →'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-lg text-white">{t.home?.videosTitle || 'Aktuelle Videos im Network'}</h2>
                <p className="text-xs text-slate-400">{t.home?.videosSubtitle || 'Entdecke die neusten Veröffentlichungen im Katalog'}</p>
              </div>
            </div>

            <Link
              href="/videos"
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <span>{t.home?.viewAllVideos || 'Alle Videos ansehen'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoadingVideos ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="aspect-video bg-slate-900/60 rounded-xl sm:rounded-2xl animate-pulse border border-slate-800" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {videos.map((item) => (
                <div
                  key={item.slug || item.id}
                  className="group relative bg-[#0d1528]/80 rounded-xl sm:rounded-2xl border border-slate-800/80 overflow-hidden hover:border-indigo-500/50 transition-all duration-300 shadow-lg flex flex-col"
                >
                  <Link href={`/video/${item.slug}`} className="relative aspect-video bg-slate-950 overflow-hidden block">
                    {/* ⚡ Bolt Optimization: Added loading="lazy" to defer loading of off-screen thumbnails, improving initial page load speed. */}
                    <img
                      src={item.thumbnailUrl || '/media/thumbnails/default.png'}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-indigo-500/90 text-white flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
                      </div>
                    </div>

                    {item.duration > 0 && (
                      <div className="absolute bottom-1.5 right-1.5 sm:bottom-2.5 sm:right-2.5 px-1.5 sm:px-2 py-0.5 rounded bg-slate-950/80 text-[9px] sm:text-[11px] font-mono text-slate-200 border border-slate-800">
                        {formatDuration(item.duration)}
                      </div>
                    )}
                  </Link>

                  <div className="p-2.5 sm:p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <Link href={`/video/${item.slug}`} className="block group-hover:text-indigo-400 transition-colors">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-100 line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                    </Link>

                    <div className="pt-1.5 sm:pt-2 flex items-center justify-between text-[10px] sm:text-xs text-slate-400 font-mono border-t border-slate-800/60">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500" />
                        <span>{(item.viewsCount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500/80" />
                        <span>{(item.likesCount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-lg text-white">Aktuelle Bilder & Galerie im Network</h2>
                <p className="text-xs text-slate-400">Entdecke Kunstwerke, Renderings & Fotografie im WebP-Format</p>
              </div>
            </div>

            <Link
              href="/images"
              className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
            >
              <span>Alle Bilder ansehen</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoadingImages ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="aspect-[4/3] bg-slate-900/60 rounded-xl animate-pulse border border-slate-800" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {images.slice(0, 6).map((img) => (
                <Link
                  key={img.id || img.documentId}
                  href={`/image/${img.slug}`}
                  className="group relative bg-[#0d1528] border border-white/10 hover:border-teal-500/50 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col"
                >
                  <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
                    <img
                      src={img.thumbnailUrl || img.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80'}
                      alt={img.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                  </div>
                  <div className="p-2.5 flex flex-col gap-1">
                    <h3 className="font-bold text-xs text-white group-hover:text-teal-400 transition-colors line-clamp-1">
                      {img.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono truncate">
                      {img.creator?.username || 'Creator'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="w-full border-t border-slate-800/80 py-8 bg-[#050914] text-xs text-slate-500 text-center space-y-2">
        <p>{t.home?.footer?.subtitle || 'Omni Network – Hyper-Personalisiertes KI Mediennetzwerk'}</p>
        <p>{t.home?.footer?.rights || '© 2026 InWebDesign. Alle Rechte vorbehalten.'}</p>
      </footer>
    </div>
  );
}
