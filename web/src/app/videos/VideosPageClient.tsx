"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import VideoUploadModal from "@/components/VideoUploadModal";
import { useApp } from "@/context/AppContext";
import { VideoItem } from "@/lib/hooks/useContentList";
import { useContentListPage } from "@/lib/hooks/useContentListPage";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Play,
  Clock,
  Eye,
  Heart,
  MessageSquare,
  SlidersHorizontal,
  Sparkles,
  Film,
  Tag,
  Plus,
  Minus,
  X,
  Upload,
  User as UserIcon,
} from "lucide-react";
import { ActionButton } from '@/components/ActionButton';
import { ContentTagFilter } from '@/components/content/ContentTagFilter';
import { ContentSearchBar } from '@/components/content/ContentSearchBar';
import Image from 'next/image';

export default function VideosPageClient({
  initialParams,
}: {
  initialParams: any;
}) {
  const { currentUser, t, openChannelModal } = useApp();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const {
    searchTerm, currentPage, sort, filterFavorites, lang, perPage,
    searchInput, setSearchInput, handleSearchSubmit, clearSearch,
    includedTags, excludedTags, matchMode, tagSearch, isTagCloudExpanded,
    filteredAllTags, hasTagFilters, toggleTag, setMatchMode, setTagSearch,
    setIsTagCloudExpanded, allTags, isLoadingTags,
    items: videos, total: totalVideos, isLoading, isError, refresh,
    totalPages, updateURL, handleSortChange, handlePageChange, hardReset,
    hasActiveFilters,
  } = useContentListPage<VideoItem>('video');

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="min-h-screen bg-base text-primary flex flex-col font-['Hanken_Grotesk',sans-serif]">
      {/* Top Header */}
      <Header />

      <main className="flex-1 max-w-content w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* Page Title & Controls Header */}
        <div className="bg-surface border border-subtle backdrop-blur-xl rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-2xl space-y-4 sm:space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 text-indigo-400">
                  <Film className="w-6 h-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {t.videos.title}
                </h1>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                  {isLoading ? "..." : `${totalVideos} ${t.videos.clipsCount}`}
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1">
                {t.videos.subtitle}
              </p>
            </div>

            {/* Quick Actions: Single animated toggle button (Upload / Reset) */}
            <div className="flex items-center">
              <ActionButton
                isFilterActive={hasActiveFilters}
                onUpload={() => setIsUploadModalOpen(true)}
                onReset={hardReset}
                uploadLabel={t.upload?.uploadVideo || (lang === 'de' ? 'Video hochladen' : 'Upload Video')}
                resetLabel={t.common.resetFilters || 'Filter zurücksetzen'}
              />
            </div>
          </div>

          {/* Search & Sort Control Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-800/60">
            {/* Search Input Form */}
            <ContentSearchBar
              kind="video"
              accent="indigo"
              placeholder={t.videos?.searchPlaceholder || t.common?.searchPlaceholder || 'Videos durchsuchen...'}
              clearLabel={t.common?.clearSearch || 'Suche zurücksetzen'}
              value={searchInput}
              onChange={setSearchInput}
              onSubmit={handleSearchSubmit}
              onClear={clearSearch}
            />

            <div className="flex items-center gap-3">
              {/* Sort Selector Dropdown */}
              <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400 shrink-0" />
                <select
                  id="videos-sort-select"
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
                    ❤️ Beliebteste / Likes
                  </option>
                  <option value="mostcommented" className="bg-slate-900 text-slate-200">
                    💬 Meist-Kommentiert (Aktivität)
                  </option>
                  <option value="mostpopular" className="bg-slate-900 text-slate-200">
                    👑 Höchste Reichweite (Popular)
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
                  <option value="durationasc" className="bg-slate-900 text-slate-200">
                    ⚡ Kürzeste zuerst
                  </option>
                  <option value="durationdesc" className="bg-slate-900 text-slate-200">
                    🎬 Längste zuerst
                  </option>
                </select>
              </div>
            </div>
          </div>

          <ContentTagFilter
            accent="indigo"
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
            filteredAllTags={filteredAllTags}
            includedTags={includedTags}
            excludedTags={excludedTags}
            matchMode={matchMode}
            hasTagFilters={hasTagFilters}
            tagSearch={tagSearch}
            isTagCloudExpanded={isTagCloudExpanded}
            toggleTag={toggleTag}
            setMatchMode={setMatchMode}
            setTagSearch={setTagSearch}
            setIsTagCloudExpanded={setIsTagCloudExpanded}
          />
        </div>

        {/* Video Card Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 3xl:grid-cols-6 gap-3 sm:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="bg-slate-900/60 border border-slate-800/80 rounded-xl sm:rounded-2xl overflow-hidden animate-pulse flex flex-col h-60 sm:h-72"
              >
                <div className="aspect-video bg-slate-800/80 w-full" />
                <div className="p-2.5 sm:p-4 space-y-2 sm:space-y-3 flex-1 flex flex-col justify-between">
                  <div className="h-3.5 sm:h-4 bg-slate-800/60 rounded w-3/4" />
                  <div className="h-3 bg-slate-800/40 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center space-y-4">
            <p className="text-rose-300 font-medium">{t.videos.noVideosFound}</p>
            <button
              onClick={() => refresh()}
              className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-500 transition-all"
            >
              {t.common.loading === 'Wird geladen...' ? 'Erneut versuchen' : 'Try Again'}
            </button>
          </div>
        ) : videos.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center space-y-4">
            <Film className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 mx-auto" />
            <h3 className="text-base sm:text-lg font-semibold text-slate-200">{t.videos.noVideosFound}</h3>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
              {t.videos.noVideosSub}
            </p>
            <button
              onClick={() => hardReset()}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-500 transition-all"
            >
              {t.common.resetFilters}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 3xl:grid-cols-6 gap-3 sm:gap-6">
            {videos.map((video: VideoItem) => {
              const creator = video.creator || (video as any).author;
              const creatorName = creator?.username || creator?.handle || (video as any).authorName || "Omni Creator";
              const isItemOwner = Boolean(
                currentUser &&
                  (currentUser.id === creator?.id ||
                    currentUser.username === creatorName ||
                    (currentUser.handle && (creator?.handle || (video as any).authorHandle) && currentUser.handle.toLowerCase() === (creator?.handle || (video as any).authorHandle).toLowerCase()))
              );
              const rawCreatorAvatar = creator?.avatarUrl || (video as any).authorAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80";
              const creatorAvatar = (isItemOwner && typeof currentUser?.avatarUrl !== 'undefined')
                ? (currentUser.avatarUrl || rawCreatorAvatar)
                : rawCreatorAvatar;

              return (
                <div
                  key={video.documentId || video.id}
                  className="group bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-indigo-500/40 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
                >
                  {/* Video Thumbnail & Play Overlay */}
                  <Link href={`/video/${video.slug}`} className="relative aspect-video w-full overflow-hidden block bg-slate-950">
                    {/* ⚡ Bolt Optimization: Added loading="lazy" to defer loading of off-screen thumbnails, improving initial page load speed. */}
                    <Image
                      src={video.thumbnailUrl || "/media/thumbnails/default.png"}
                      alt={video.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                    {/* Play Icon Badge */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="p-2 sm:p-3 rounded-full bg-indigo-600/90 text-white shadow-lg backdrop-blur-md transform group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 sm:w-6 sm:h-6 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Duration Badge */}
                    {video.duration && (
                      <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-800/80 text-[9px] sm:text-[10px] font-mono text-slate-200 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-400" />
                        <span>{formatDuration(video.duration)}</span>
                      </div>
                    )}
                  </Link>

                  {/* Card Details */}
                  <div className="p-2.5 sm:p-4 space-y-2 sm:space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <Link
                        href={`/video/${video.slug}`}
                        className="font-semibold text-slate-100 group-hover:text-indigo-300 text-xs sm:text-sm line-clamp-2 transition-colors leading-snug"
                      >
                        {video.title}
                      </Link>
                    </div>

                    {/* Creator & Meta */}
                    <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-slate-800/60 text-[11px] sm:text-xs text-slate-400">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const targetCreator = creator || {
                            username: creatorName,
                            handle: `@${creatorName.toLowerCase().replace(/\s+/g, '')}`,
                            avatarUrl: creatorAvatar,
                          };
                          openChannelModal(targetCreator);
                        }}
                        className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity min-w-0 text-left cursor-pointer z-10"
                      >
                        {/* ⚡ Bolt Optimization: Added loading="lazy" to defer loading of off-screen avatars, saving bandwidth. */}
                        <Image
                          src={creatorAvatar}
                          alt={creatorName}
                          loading="lazy"
                          width={24}
                          height={24}
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-slate-700 shrink-0"
                          unoptimized
                        />
                        <span className="truncate max-w-[65px] sm:max-w-[110px] text-slate-300 font-medium">{creatorName}</span>
                      </button>

                      <div className="flex items-center gap-1.5 sm:gap-2.5 text-slate-400 shrink-0 font-mono text-[10px] sm:text-xs">
                        {video.viewsCount !== undefined && (
                          <div className="flex items-center gap-0.5" title="Aufrufe">
                            <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
                            <span>{video.viewsCount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-0.5" title="Kommentare">
                          <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-400" />
                          <span>{(video.commentsCount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-0.5" title="Likes">
                          <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400" />
                          <span>{(video.likesCount || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-3">
              <span className="text-sm font-medium text-slate-300">
                Seite <span className="text-white font-bold">{currentPage}</span> von{" "}
                <span className="text-slate-400">{totalPages}</span>
              </span>
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      <VideoUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
}
