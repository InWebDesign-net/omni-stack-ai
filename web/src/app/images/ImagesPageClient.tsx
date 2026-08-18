'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import ImageUploadModal from '@/components/ImageUploadModal';
import { useApp } from '@/context/AppContext';
import { useImages, useImageTags, ImageItem } from '@/lib/hooks/useImages';
import { useTagFilter } from '@/lib/hooks/useTagFilter';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Heart,
  Eye,
  SlidersHorizontal,
  Sparkles,
  Tag,
  X,
  Upload,
  User as UserIcon,
} from 'lucide-react';
import { ActionButton } from '@/components/ActionButton';

import { jsonAuthHeaders } from '@/lib/affinity';
import Image from 'next/image';

export default function ImagesPageClient({ initialParams }: { initialParams?: any }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentUser, openAuthModal, lang, t } = useApp();
  const perPage = 24;

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [likedSlugs, setLikedSlugs] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('omni_user_likes') || '[]');
      setLikedSlugs(stored);
    } catch (e) {}
  }, []);

  const handleCardLikeToggle = async (e: React.MouseEvent, img: any) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      openAuthModal();
      return;
    }

    const isLiked = likedSlugs.includes(img.slug);
    const nextIsLiked = !isLiked;

    setLikedSlugs((prev) =>
      nextIsLiked ? [...prev, img.slug] : prev.filter((s) => s !== img.slug)
    );

    img.likesCount = Math.max(0, (img.likesCount || 0) + (nextIsLiked ? 1 : -1));

    if (nextIsLiked) {
      showToast(t.common?.likeAdded || 'Zu Favoriten hinzugefügt');
    } else {
      showToast(t.common?.likeRemoved || 'Aus Favoriten entfernt');
    }

    try {
      const storedLikes = JSON.parse(localStorage.getItem('omni_user_likes') || '[]');
      if (nextIsLiked && !storedLikes.includes(img.slug)) {
        localStorage.setItem('omni_user_likes', JSON.stringify([...storedLikes, img.slug]));
      } else if (!nextIsLiked) {
        localStorage.setItem('omni_user_likes', JSON.stringify(storedLikes.filter((s: string) => s !== img.slug)));
      }
    } catch (err) {}

    try {
      const userIdent = currentUser.username || currentUser.handle || `user-${currentUser.id}`;
      await fetch('/api/feed/interaction', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          slug: img.slug,
          type: nextIsLiked ? 'like' : 'unlike',
          userIdentifier: userIdent,
        }),
      });
    } catch (err) {
      console.error('Error toggling image like:', err);
    }
  };

  const searchTerm = searchParams.get('q') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sort = searchParams.get('sort') || 'createdatasc';
  const filterFavorites = searchParams.get('fav') || 'false';

  const [searchInput, setSearchInput] = useState(searchTerm);

  useEffect(() => {
    setSearchInput(searchTerm);
  }, [searchTerm]);

  const { tags: allTags = [] } = useImageTags(lang);

  const updateURL = (newParams: Record<string, string | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'false') {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    });
    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`${pathname}${query}`);
  };

  // URL-synced tag filter state (via shared hook)
  const {
    includedTags,
    excludedTags,
    matchMode,
    tagSearch,
    isTagCloudExpanded: showAllTags,
    filteredAllTags: filteredTagList,
    hasTagFilters,
    toggleTag,
    setMatchMode: toggleMatchMode,
    setTagSearch,
    setIsTagCloudExpanded: setShowAllTags,
    resetTagFilters: resetAllFilters,
  } = useTagFilter(allTags, updateURL);

  const displayedTags = filteredTagList;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateURL({ q: searchInput, page: '1' });
  };

  const clearSearch = () => {
    setSearchInput('');
    updateURL({ q: null, page: '1' });
  };

  const handleSortChange = (newSort: string) => {
    updateURL({ sort: newSort, page: '1' });
  };

  const { images, total, isLoading } = useImages({
    currentPage,
    pageSize: perPage,
    sort,
    searchTerm,
    filterFavorites: filterFavorites === 'true' ? 'true' : '',
    includedTags,
    excludedTags,
    matchMode,
    lang,
  });

  const totalPages = Math.ceil(total / perPage);
  const hasActiveFilters =
    searchTerm !== '' ||
    includedTags.length > 0 ||
    excludedTags.length > 0 ||
    filterFavorites === 'true';

  return (
    <div className="min-h-screen bg-[#080e1e] text-[#dae2fd] flex flex-col font-sans selection:bg-[#8083ff] selection:text-white">
      <Header />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 right-6 z-50 bg-slate-900/95 border border-indigo-500/40 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl animate-fadeIn flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-content w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* Top Control Header */}
        <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-2xl space-y-4 sm:space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-teal-500/20 to-indigo-500/20 border border-teal-500/30 text-teal-400">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {t.header?.images || 'Images'}
                </h1>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 font-mono">
                  {isLoading ? '...' : `${total} ${lang === 'de' ? 'Bilder' : 'Images'}`}
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1">
                Entdecke hochauflösende Kunstwerke, Fotografien & Renderings im WebP-Format.
              </p>
            </div>

            <div className="flex items-center">
              <ActionButton
                isFilterActive={hasActiveFilters}
                onUpload={() => setIsUploadModalOpen(true)}
                onReset={resetAllFilters}
                uploadLabel={t.upload?.uploadImage || (lang === 'de' ? 'Bild hochladen' : 'Upload Image')}
                resetLabel={t.common.resetFilters || 'Filter zurücksetzen'}
              />
            </div>
          </div>

          {/* Search & Sort Control Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-800/60">
            {/* Search Input Form */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="images-search-input"
                type="text"
                aria-label={t.common.searchPlaceholder}
                placeholder="Bilder, Renderings & Fotografien suchen..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none focus:outline-none focus:border-teal-500 transition-all"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Suche zurücksetzen"
                  title="Suche zurücksetzen"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            <div className="flex items-center gap-3">
              {/* Sort Selector Dropdown */}
              <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
                <SlidersHorizontal className="w-4 h-4 text-teal-400 shrink-0" />
                <select
                  id="images-sort-select"
                  aria-label="Sortierung"
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer pr-2"
                >
                  <option value="createdatasc" className="bg-slate-900 text-slate-200">
                    ✨ Neueste zuerst
                  </option>
                  <option value="trending" className="bg-slate-900 text-slate-200">
                    🔥 Trending (Beliebt & Neu)
                  </option>
                  {currentUser && (
                    <option value="affinity" className="bg-slate-900 text-slate-200">
                      🎯 KI-Interessen Profil
                    </option>
                  )}
                  <option value="mostliked" className="bg-slate-900 text-slate-200">
                    ❤️ Meist-Favorisiert / Likes
                  </option>
                  <option value="mostcommented" className="bg-slate-900 text-slate-200">
                    💬 Meist-Kommentiert (Aktivität)
                  </option>
                  <option value="createdatdesc" className="bg-slate-900 text-slate-200">
                    ⌛ Älteste zuerst
                  </option>
                  <option value="titleasc" className="bg-slate-900 text-slate-200">
                    🔤 Titel (A → Z)
                  </option>
                  <option value="titledesc" className="bg-slate-900 text-slate-200">
                    🔤 Titel (Z → A)
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Interactive Multi-Tag Filter Cloud */}
          {allTags.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-800/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Kategorien & Tags Filter
                  </span>
                  {(includedTags.length > 0 || excludedTags.length > 0) && (
                    <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-mono border border-teal-500/30">
                      {includedTags.length + excludedTags.length} aktiv
                    </span>
                  )}

                  {includedTags.length > 1 && (
                    <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 text-[11px] ml-2">
                      <button
                        type="button"
                        onClick={() => toggleMatchMode('any')}
                        className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                          matchMode === 'any'
                            ? 'bg-teal-500/20 text-teal-300 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Irgendein Tag
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleMatchMode('all')}
                        className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                          matchMode === 'all'
                            ? 'bg-teal-500/20 text-teal-300 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Alle Tags
                      </button>
                    </div>
                  )}
                </div>

                {allTags.length > 0 && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Tag suchen..."
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      className="px-2.5 py-1 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAllTags(!showAllTags)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-teal-400 font-medium transition-colors cursor-pointer"
                    >
                      <span>{showAllTags ? 'Weniger anzeigen' : `Alle Tags (${allTags.length})`}</span>
                      {showAllTags ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                )}
              </div>

              <div
                className={`flex flex-wrap items-center gap-2 transition-all duration-300 ${
                  showAllTags || tagSearch.trim()
                    ? 'max-h-[380px] sm:max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700'
                    : 'max-h-[68px] sm:max-h-[72px] overflow-hidden'
                }`}
              >
                {displayedTags.map((item: any) => {
                  const tag = typeof item === 'string' ? item : item?.tag || '';
                  const count = typeof item === 'object' ? item?.count : null;
                  const isInc = includedTags.includes(tag);
                  const isExc = excludedTags.includes(tag);
                  const state = isInc ? 'include' : isExc ? 'exclude' : 'neutral';
                  const base =
                    'px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border';
                  const tone =
                    state === 'include'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold shadow-md shadow-emerald-500/10'
                      : state === 'exclude'
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-bold shadow-md shadow-rose-500/10'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-teal-500/50 hover:text-white';
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`${base} ${tone}`}
                    >
                      <span>#{tag}</span>
                      {count !== null && count !== undefined && (
                        <span className={`text-[10px] font-mono ${state !== 'neutral' ? 'opacity-90' : 'text-slate-500'}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Gallery Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl h-56 animate-pulse" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-12 text-center space-y-4">
            <Sparkles className="w-12 h-12 text-teal-400/40 mx-auto animate-pulse" />
            <h3 className="text-lg font-bold text-white">Keine Bilder gefunden</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Versuche deine Filter zurückzusetzen oder lade dein erstes eigenes Bild hoch!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 3xl:grid-cols-7 gap-4 sm:gap-6">
            {images.map((img) => (
              <Link
                key={img.id || img.documentId}
                href={`/image/${img.slug}`}
                className="group relative bg-[#0d1528] border border-white/10 hover:border-teal-500/50 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
              >
                {/* Aspect ratio image container */}
                <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
                  <Image
                    src={img.thumbnailUrl || img.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80'}
                    alt={img.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                  {/* Top Stats Badges */}
                  <button
                    type="button"
                    onClick={(e) => handleCardLikeToggle(e, img)}
                    title={likedSlugs.includes(img.slug) ? 'Gefällt mir nicht mehr' : 'Gefällt mir'}
                    className={`absolute top-3 right-3 z-10 flex items-center gap-1.5 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono border transition-all cursor-pointer ${
                      likedSlugs.includes(img.slug)
                        ? 'bg-rose-500/30 text-rose-200 border-rose-500/50 shadow-md shadow-rose-500/20'
                        : 'bg-black/60 text-white border-white/10 hover:border-rose-400/50 hover:text-rose-300'
                    }`}
                  >
                    <Heart className={`w-3 h-3 ${likedSlugs.includes(img.slug) ? 'text-rose-400 fill-rose-400' : 'text-rose-400'}`} />
                    <span>{img.likesCount || 0}</span>
                  </button>

                  {/* Creator Avatar Badge */}
                  {img.creator && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      <Image
                        src={img.creator.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80'}
                        alt={img.creator.username || 'Creator'}
                        className="w-6 h-6 rounded-full object-cover border border-white/20 shrink-0"
                      />
                      <span className="text-[11px] font-semibold text-white drop-shadow truncate max-w-[120px]">
                        {img.creator.username || 'Creator'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Info */}
                <div className="p-4 flex flex-col gap-1.5 flex-1">
                  <h3 className="font-extrabold text-sm text-white group-hover:text-teal-400 transition-colors line-clamp-1">
                    {img.title}
                  </h3>
                  {img.summary && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {img.summary}
                    </p>
                  )}
                  {img.tags && img.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-auto pt-2">
                      {img.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-medium"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            <button
              disabled={currentPage <= 1}
              onClick={() => updateURL({ page: (currentPage - 1).toString() })}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 disabled:opacity-40 text-slate-200 transition-all"
              aria-label="Vorherige Seite"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-teal-400">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => updateURL({ page: (currentPage + 1).toString() })}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 disabled:opacity-40 text-slate-200 transition-all"
              aria-label="Nächste Seite"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      <ImageUploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} />
    </div>
  );
}
