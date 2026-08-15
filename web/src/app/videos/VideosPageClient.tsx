"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { useApp } from "@/context/AppContext";
import { useVideos, VideoItem } from "@/lib/hooks/useVideos";
import { TagCount } from "@/lib/videoFilters";
import useSWR from "swr";
import {
  Search,
  FilterX,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Play,
  Clock,
  Eye,
  SlidersHorizontal,
  Sparkles,
  Film,
  Tag,
  X,
  User as UserIcon,
} from "lucide-react";

export default function VideosPageClient({
  initialParams,
}: {
  initialParams: any;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentUser, lang, t } = useApp();
  const perPage = 24;

  // Single Source of Truth from SearchParams
  const searchTerm = searchParams.get("q") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const sort = searchParams.get("sort") || "createdatasc";
  const filterFavorites = searchParams.get("fav") || "false";

  const [searchInput, setSearchInput] = useState(searchTerm);

  // Sync search input state if URL search param changes
  useEffect(() => {
    setSearchInput(searchTerm);
  }, [searchTerm]);

  // Tag filter state (URL-synced)
  const includedTags = (searchParams.get("includetag") || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const excludedTags = (searchParams.get("excludetag") || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const matchMode = (searchParams.get("matchmode") || "any") === "all" ? "all" : "any";

  // All available tags (aggregated from Strapi, with counts) for the tag cloud
  const { data: allTags = [] } = useSWR<TagCount[]>("/api/video/tags", (url: string) =>
    fetch(url).then((r) => r.json())
  );

  // Local Tag Search & Expand/Collapse state
  const [tagSearch, setTagSearch] = useState("");
  const [isTagCloudExpanded, setIsTagCloudExpanded] = useState(false);

  const filteredAllTags = React.useMemo(() => {
    if (!tagSearch.trim()) return allTags;
    const q = tagSearch.trim().toLowerCase();
    return allTags.filter(({ tag }) => tag.toLowerCase().includes(q));
  }, [allTags, tagSearch]);

  // Data fetching via SWR hook
  const {
    videos,
    total: totalVideos,
    isLoading,
    isError,
    refresh,
  } = useVideos({
    currentPage,
    pageSize: perPage,
    sort,
    searchTerm,
    filterFavorites,
    includedTags,
    excludedTags,
    matchMode,
    lang,
    enabled: true,
  });

  const totalPages = Math.max(1, Math.ceil(totalVideos / perPage));

  const updateURL = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    });
    router.push(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  };

  const handleSortChange = (value: string) => {
    updateURL({ sort: value, page: "1" });
  };

  const handlePageChange = (page: number) => {
    updateURL({ page: page.toString() });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateURL({ q: searchInput.trim() || null, page: "1" });
  };

  const clearSearch = () => {
    setSearchInput("");
    updateURL({ q: null, page: "1" });
  };

  const hardReset = () => {
    setSearchInput("");
    router.push(pathname);
  };

  // --- Tag filter handlers (URL-synced) ---
  const toggleTag = (tag: string) => {
    const isIncluded = includedTags.includes(tag);
    const isExcluded = excludedTags.includes(tag);
    let nextIncluded = [...includedTags];
    let nextExcluded = [...excludedTags];
    if (isIncluded) {
      // included -> excluded
      nextIncluded = nextIncluded.filter((t) => t !== tag);
      nextExcluded = [...nextExcluded, tag];
    } else if (isExcluded) {
      // excluded -> neutral
      nextExcluded = nextExcluded.filter((t) => t !== tag);
    } else {
      // neutral -> included
      nextIncluded = [...nextIncluded, tag];
    }
    updateURL({
      includetag: nextIncluded.length ? nextIncluded.join(",") : null,
      excludetag: nextExcluded.length ? nextExcluded.join(",") : null,
      page: "1",
    });
  };

  const setMatchMode = (mode: "any" | "all") => {
    updateURL({ matchmode: mode === "all" ? "all" : null, page: "1" });
  };

  // Boundary check: redirect to page 1 if page exceeds totalPages ONLY after data loading finishes
  useEffect(() => {
    if (!isLoading && totalVideos > 0 && currentPage > totalPages) {
      updateURL({ page: "1" });
    }
  }, [isLoading, totalVideos, currentPage, totalPages]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const hasActiveFilters = Boolean(
    searchTerm ||
    sort !== "createdatasc" ||
    filterFavorites === "true" ||
    includedTags.length > 0 ||
    excludedTags.length > 0
  );

  const hasTagFilters = includedTags.length > 0 || excludedTags.length > 0;

  return (
    <div className="min-h-screen bg-[#080e1e] text-[#dae2fd] flex flex-col font-['Hanken_Grotesk',sans-serif]">
      {/* Top Header */}
      <Header />

      <main className="flex-1 max-w-content w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* Page Title & Controls Header */}
        <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-2xl space-y-4 sm:space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 text-indigo-400">
                  <Film className="w-6 h-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
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

            {/* Quick Actions & Filters Reset */}
            {hasActiveFilters && (
              <button
                onClick={hardReset}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-all shadow-sm shrink-0"
              >
                <FilterX className="w-3.5 h-3.5 text-rose-400" />
                <span>{t.common.resetFilters}</span>
              </button>
            )}
          </div>

          {/* Search & Sort Control Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-800/60">
            {/* Search Input Form */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="videos-search-input"
                type="text"
                aria-label={t.common.searchPlaceholder}
                placeholder={t.common.searchPlaceholder}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none focus:outline-none focus:border-indigo-500 focus:ring-0 ring-0 transition-all"
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
                <SlidersHorizontal className="w-4 h-4 text-indigo-400 shrink-0" />
                <select
                  id="videos-sort-select"
                  aria-label="Sortierung"
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer pr-2"
                >
                  <option value="createdatasc" className="bg-slate-900 text-slate-200">
                    {t.videos.sortNewest}
                  </option>
                  <option value="trending" className="bg-slate-900 text-slate-200">
                    {(t.videos as any).sortTrending || '🔥 Trendinhalt (Trending)'}
                  </option>
                  <option value="mostliked" className="bg-slate-900 text-slate-200">
                    {(t.videos as any).sortMostLiked || '❤️ Beliebteste / Likes'}
                  </option>
                  <option value="mostcommented" className="bg-slate-900 text-slate-200">
                    {(t.videos as any).sortMostCommented || '💬 Aktivste / Diskussionen'}
                  </option>
                  <option value="mostpopular" className="bg-slate-900 text-slate-200">
                    {(t.videos as any).sortMostPopular || '👑 Höchste Reichweite (Popular)'}
                  </option>
                  <option value="affinity" className="bg-slate-900 text-slate-200">
                    {(t.videos as any).sortAffinity || '🎯 Persönliches Interesse (KI-Graph)'}
                  </option>
                  <option value="createdatdesc" className="bg-slate-900 text-slate-200">
                    {t.videos.sortOldest}
                  </option>
                  <option value="titleasc" className="bg-slate-900 text-slate-200">
                    {t.videos.sortTitleAsc}
                  </option>
                  <option value="titledesc" className="bg-slate-900 text-slate-200">
                    {t.videos.sortTitleDesc}
                  </option>
                  <option value="durationasc" className="bg-slate-900 text-slate-200">
                    {t.videos.sortDurationAsc}
                  </option>
                  <option value="durationdesc" className="bg-slate-900 text-slate-200">
                    {t.videos.sortDurationDesc}
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Tag filter (same control panel as search/sort) */}
          <div className="pt-4 border-t border-slate-800/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left Side: Title + Inline Tag Search Box */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-sm font-semibold text-slate-200">{t.videos.allTags}</span>
                  {hasTagFilters && (
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                      {t.videos.activeTags}
                    </span>
                  )}
                </div>

                {/* Inline Tag Search Input Box */}
                <div className="relative flex items-center bg-slate-950/80 border border-slate-800 focus-within:border-indigo-500/80 rounded-xl px-2.5 py-1 text-xs max-w-[200px] sm:max-w-[240px] transition-all">
                  <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                  <input
                    type="text"
                    placeholder={t.videos?.searchTagsPlaceholder || "Tags durchsuchen..."}
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 outline-none border-none focus:outline-none focus:ring-0 ring-0 p-0"
                  />
                  {tagSearch && (
                    <button
                      type="button"
                      onClick={() => setTagSearch("")}
                      className="p-0.5 text-slate-400 hover:text-slate-200 shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Right Side: Expand / Collapse Toggle Button */}
              <button
                type="button"
                onClick={() => setIsTagCloudExpanded((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all shrink-0"
              >
                <span>{isTagCloudExpanded ? (t.common?.showLess || "Weniger anzeigen") : (t.common?.showMore || "Mehr anzeigen")}</span>
                {isTagCloudExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                )}
              </button>
            </div>

            {/* Tag cloud: 1 line (collapsed 38px) vs 4 lines (expanded 148px) */}
            <div
              className={`flex flex-wrap gap-2 transition-all duration-300 ease-in-out ${
                isTagCloudExpanded
                  ? "min-h-[148px] max-h-[148px] h-[148px] overflow-y-auto pr-1 tag-cloud-scroll"
                  : "min-h-[38px] max-h-[38px] h-[38px] overflow-hidden"
              }`}
            >
              {allTags.length === 0 ? (
                // Skeleton pills matching exact height
                Array.from({ length: isTagCloudExpanded ? 16 : 6 }).map((_, i) => (
                  <div
                    key={`tag-skeleton-${i}`}
                    style={{ width: `${64 + ((i * 17) % 52)}px` }}
                    className="h-7 rounded-lg bg-slate-900/80 border border-slate-800/80 animate-pulse shrink-0"
                  />
                ))
              ) : filteredAllTags.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-1">
                  {(t.videos?.noTagsFound || 'Keine Tags für "{query}" gefunden.').replace('{query}', tagSearch)}
                </div>
              ) : (
                filteredAllTags.map(({ tag, count }) => {
                  const state = includedTags.includes(tag)
                    ? "include"
                    : excludedTags.includes(tag)
                    ? "exclude"
                    : "neutral";
                  const base =
                    "px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer select-none flex items-center gap-1.5 shrink-0";
                  const tone =
                    state === "include"
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                      : state === "exclude"
                      ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                      : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700";
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      title={
                        state === "include"
                          ? `${t.videos.includeLabel}: ${tag}`
                          : state === "exclude"
                          ? `${t.videos.excludeLabel}: ${tag}`
                          : tag
                      }
                      className={`${base} ${tone}`}
                    >
                      <span>{tag}</span>
                      <span className="text-[10px] font-mono opacity-60">({count})</span>
                      {state === "include" && <span className="text-emerald-400">✓</span>}
                      {state === "exclude" && <X className="w-3 h-3 text-rose-400" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* Match mode toggle (only when ≥2 include tags) */}
            {includedTags.length >= 2 && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-400">{t.videos.includeLabel}:</span>
                <div className="inline-flex rounded-lg border border-slate-800 overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setMatchMode("any")}
                    className={`px-3 py-1.5 transition-all ${
                      matchMode === "any"
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "bg-slate-950/80 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {t.videos.matchAny}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchMode("all")}
                    className={`px-3 py-1.5 transition-all border-l border-slate-800 ${
                      matchMode === "all"
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "bg-slate-950/80 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {t.videos.matchAll}
                  </button>
                </div>
              </div>
            )}
          </div>
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
              const creatorAvatar = creator?.avatarUrl || (video as any).authorAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80";

              return (
                <div
                  key={video.documentId || video.id}
                  className="group bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-indigo-500/40 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
                >
                  {/* Video Thumbnail & Play Overlay */}
                  <Link href={`/video/${video.slug}`} className="relative aspect-video w-full overflow-hidden block bg-slate-950">
                    {/* ⚡ Bolt Optimization: Added loading="lazy" to defer loading of off-screen thumbnails, improving initial page load speed. */}
                    <img
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
                      <Link href={creator?.handle || creator?.id ? `/user/${creator.handle || creator.id}` : '#'} className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity min-w-0">
                        {/* ⚡ Bolt Optimization: Added loading="lazy" to defer loading of off-screen avatars, saving bandwidth. */}
                        <img
                          src={creatorAvatar}
                          alt={creatorName}
                          loading="lazy"
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-slate-700 shrink-0"
                        />
                        <span className="truncate max-w-[65px] sm:max-w-[110px] text-slate-300 font-medium">{creatorName}</span>
                      </Link>

                      {video.viewsCount !== undefined && (
                        <div className="flex items-center gap-0.5 sm:gap-1 text-slate-400 shrink-0">
                          <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span>{video.viewsCount.toLocaleString()}</span>
                        </div>
                      )}
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
    </div>
  );
}
