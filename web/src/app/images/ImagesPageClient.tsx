'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import ImageUploadModal from '@/components/ImageUploadModal';
import { useApp } from '@/context/AppContext';
import { ImageItem } from '@/lib/hooks/useContentList';
import { ContentTagFilter } from '@/components/content/ContentTagFilter';
import { ContentSearchBar } from '@/components/content/ContentSearchBar';
import { useContentListPage } from '@/lib/hooks/useContentListPage';
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
  Plus,
  Minus,
  X,
  Upload,
  User as UserIcon,
} from 'lucide-react';
import { ActionButton } from '@/components/ActionButton';

import { jsonAuthHeaders } from '@/lib/affinity';
import Image from 'next/image';

export default function ImagesPageClient({ initialParams }: { initialParams?: any }) {
  const { currentUser, openAuthModal, lang, t, openChannelModal } = useApp();

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
    } catch (e) { /* corrupt or absent localStorage entry — falling back to defaults */ }
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
    } catch (err) { /* expected: storage might be blocked or empty */ }

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

  const {
    searchTerm, currentPage, sort, filterFavorites, perPage,
    searchInput, setSearchInput, handleSearchSubmit, clearSearch,
    includedTags, excludedTags, matchMode, tagSearch,
    isTagCloudExpanded: showAllTags,
    filteredAllTags: filteredTagList,
    hasTagFilters,
    toggleTag,
    setMatchMode: toggleMatchMode,
    setTagSearch,
    setIsTagCloudExpanded: setShowAllTags,
    resetTagFilters: resetAllFilters,
    allTags, isLoadingTags,
    items: images, total, isLoading, isError, refresh,
    totalPages, updateURL, handleSortChange, handlePageChange, hardReset,
    hasActiveFilters,
  } = useContentListPage<ImageItem>('image');

  const displayedTags = filteredTagList;

  return (
    <div className="min-h-screen bg-base text-primary flex flex-col font-['Hanken_Grotesk',sans-serif] selection:bg-[#8083ff] selection:text-white">
      <Header />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 right-6 z-50 bg-surface-raised border border-indigo-500/40 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl animate-fadeIn flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-content w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* Top Control Header */}
        <div className="bg-surface border border-subtle backdrop-blur-xl rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-2xl space-y-4 sm:space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-teal-500/20 to-indigo-500/20 border border-teal-500/30 text-teal-400">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
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
            <ContentSearchBar
              kind="image"
              accent="teal"
              placeholder={t.images?.searchPlaceholder || 'Bilder, Renderings & Fotografien suchen...'}
              clearLabel={t.common?.clearSearch || 'Suche zurücksetzen'}
              value={searchInput}
              onChange={setSearchInput}
              onSubmit={handleSearchSubmit}
              onClear={clearSearch}
            />

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

        <ContentTagFilter
            accent="teal"
            labels={{
              heading: t.tagFilter?.allTags || 'Alle Tags',
              activeSuffix: t.tagFilter?.activeTags || 'aktiv',
              matchAny: t.tagFilter?.matchAny || 'Irgendein Tag',
              matchAll: t.tagFilter?.matchAll || 'Alle Tags',
              searchTagsPlaceholder: t.tagFilter?.searchTagsPlaceholder || 'Tag suchen...',
              noTagsFound: t.tagFilter?.noTagsFound || 'Keine Tags für "{query}" gefunden.',
              showLess: t.tagFilter?.showLess || 'Weniger anzeigen',
              showAll: t.tagFilter?.showAll || 'Alle Tags',
              noTagsAtAll: t.tagFilter?.noTagsAtAll || 'Keine Tags vorhanden.',
            }}
            allTags={allTags}
            isLoadingTags={isLoadingTags}
            filteredAllTags={displayedTags}
            includedTags={includedTags}
            excludedTags={excludedTags}
            matchMode={matchMode}
            hasTagFilters={hasTagFilters}
            tagSearch={tagSearch}
            isTagCloudExpanded={showAllTags}
            toggleTag={toggleTag}
            setMatchMode={toggleMatchMode}
            setTagSearch={setTagSearch}
            setIsTagCloudExpanded={setShowAllTags}
          />
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
            {images.map((img) => {
              const isImgOwner = Boolean(
                currentUser &&
                  img.creator &&
                  (currentUser.id === img.creator.id ||
                    currentUser.username === img.creator.username ||
                    (currentUser.handle && img.creator.handle && currentUser.handle.toLowerCase() === img.creator.handle.toLowerCase()))
              );
              const effectiveCreatorAvatar = (isImgOwner && typeof currentUser?.avatarUrl !== 'undefined')
                ? (currentUser.avatarUrl || img.creator?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80')
                : (img.creator?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80');

              return (
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openChannelModal({
                            ...img.creator,
                            avatarUrl: effectiveCreatorAvatar,
                          });
                        }}
                        className="absolute bottom-3 left-3 flex items-center gap-2 hover:opacity-80 transition-opacity z-10 cursor-pointer text-left"
                      >
                        <Image
                          src={effectiveCreatorAvatar}
                          alt={img.creator.username || 'Creator'}
                          width={24}
                          height={24}
                          className="w-6 h-6 rounded-full object-cover border border-white/20 shrink-0"
                          unoptimized
                        />
                        <span className="text-[11px] font-semibold text-white drop-shadow truncate max-w-[120px]">
                          {img.creator.username || 'Creator'}
                        </span>
                      </button>
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
            );
          })}
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
