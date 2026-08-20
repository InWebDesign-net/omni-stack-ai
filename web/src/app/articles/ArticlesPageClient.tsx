'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { TagCount } from '@/lib/videoFilters';
import {
  Search,
  FilterX,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Clock,
  Eye,
  Heart,
  MessageSquare,
  Tag,
  Plus,
  Minus,
  Sparkles,
  FileText,
  SlidersHorizontal,
  X,
  Play,
  User as UserIcon,
} from 'lucide-react';
import { ActionButton } from '@/components/ActionButton';
import { ArticleItem } from '@/lib/hooks/useContentList';
import { useContentListPage } from '@/lib/hooks/useContentListPage';
import { ArticleCreateModal } from '@/components/article/ArticleCreateModal';
import Image from 'next/image';


export default function ArticlesPageClient() {
  const { currentUser, t } = useApp();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const {
    searchTerm, currentPage, sort, filterFavorites, lang, perPage,
    searchInput, setSearchInput, handleSearchSubmit, clearSearch,
    includedTags, excludedTags, matchMode, tagSearch, isTagCloudExpanded,
    filteredAllTags, hasTagFilters, toggleTag, setMatchMode, setTagSearch,
    setIsTagCloudExpanded, allTags,
    items: articles, total: totalArticles, isLoading, isError, refresh,
    totalPages, updateURL, handleSortChange, handlePageChange, hardReset,
    hasActiveFilters,
  } = useContentListPage<ArticleItem>('article');

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-[#080e1e] text-[#dae2fd] flex flex-col font-['Hanken_Grotesk',sans-serif]">
      <Header />

      <main className="flex-1 max-w-content w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* Top Control Header */}
        <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-2xl space-y-4 sm:space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-purple-400">
                  <FileText className="w-6 h-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {t.header?.articles || 'Articles'}
                </h1>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono">
                  {isLoading ? '...' : `${totalArticles} ${lang === 'de' ? 'Artikel' : 'Articles'}`}
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1">
                {t.articles?.subtitle || 'Entdecke Geschichten, Analysen und Wissen aus dem Omni Network.'}
              </p>
            </div>

            <div className="flex items-center">
              <ActionButton
                isFilterActive={hasActiveFilters}
                onUpload={() => setIsCreateModalOpen(true)}
                onReset={hardReset}
                uploadLabel={t.articles?.createArticle || 'Artikel erstellen'}
                resetLabel={t.common?.resetFilters || 'Filter zurücksetzen'}
              />
            </div>
          </div>

          {/* Search & Sort Control Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-800/60">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="articles-search-input"
                type="text"
                aria-label={t.common?.searchPlaceholder || 'Suchen...'}
                placeholder={t.articles?.searchPlaceholder || 'Artikel suchen...'}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none focus:outline-none focus:border-purple-500 transition-all"
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
              <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
                <SlidersHorizontal className="w-4 h-4 text-purple-400 shrink-0" />
                <select
                  id="articles-sort-select"
                  aria-label="Sortierung"
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer pr-2"
                >
                  <option value="createdatasc" className="bg-slate-900 text-slate-200">✨ Neueste zuerst</option>
                  <option value="trending" className="bg-slate-900 text-slate-200">🔥 Trending</option>
                  <option value="mostliked" className="bg-slate-900 text-slate-200">❤️ Beliebteste</option>
                  <option value="mostcommented" className="bg-slate-900 text-slate-200">💬 Aktivste</option>
                  <option value="titleasc" className="bg-slate-900 text-slate-200">Titel (A-Z)</option>
                  <option value="titledesc" className="bg-slate-900 text-slate-200">Titel (Z-A)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tag Filter */}
        <div className="pt-4 border-t border-slate-800/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {t.articles?.allTags || 'Alle Tags'}
              </span>
              {hasTagFilters && (
                <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">
                  {includedTags.length + excludedTags.length} {t.videos?.activeTags || 'aktiv'}
                </span>
              )}
              {includedTags.length > 1 && (
                <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 text-[11px] ml-1.5">
                  <button
                    type="button"
                    onClick={() => setMatchMode('any')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                      matchMode === 'any'
                        ? 'bg-purple-500/20 text-purple-300 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.videos?.matchAny || 'Irgendein Tag'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchMode('all')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                      matchMode === 'all'
                        ? 'bg-purple-500/20 text-purple-300 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.videos?.matchAll || 'Alle Tags'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <div className="relative flex items-center bg-slate-950/80 border border-slate-800 focus-within:border-purple-500/80 rounded-xl px-2.5 py-1 text-xs transition-all">
                <input
                  type="text"
                  placeholder={t.videos?.searchTagsPlaceholder || 'Tag suchen...'}
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="w-28 sm:w-36 bg-transparent text-xs text-slate-200 placeholder-slate-500 outline-none border-none focus:outline-none focus:ring-0 ring-0 p-0"
                />
                {tagSearch && (
                  <button
                    type="button"
                    onClick={() => setTagSearch('')}
                    className="p-0.5 text-slate-400 hover:text-slate-200 shrink-0 ml-1"
                  >
                    <FilterX className="w-3 h-3" />
                  </button>
                )}
              </div>

              {allTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsTagCloudExpanded(!isTagCloudExpanded)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-purple-400 font-medium transition-colors cursor-pointer"
                >
                  <span>{isTagCloudExpanded ? (t.common?.showLess || 'Weniger') : `Alle Tags (${allTags.length})`}</span>
                  {isTagCloudExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div
            className={`flex flex-wrap items-center gap-2 transition-all duration-300 ${
              isTagCloudExpanded || tagSearch.trim()
                ? 'max-h-[380px] sm:max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700'
                : 'max-h-[68px] sm:max-h-[72px] overflow-hidden'
            }`}
          >
            {allTags.length === 0 ? (
              Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={`tag-skeleton-${i}`}
                  style={{ width: `${64 + ((i * 17) % 52)}px` }}
                  className="h-7 rounded-lg bg-slate-900/80 border border-slate-800/80 animate-pulse shrink-0"
                />
              ))
            ) : filteredAllTags.length === 0 ? (
              <div className="text-xs text-slate-500 italic py-1">
                {t.videos?.noTagsFound || 'Keine Tags gefunden'}
              </div>
            ) : (
              filteredAllTags.map(({ tag, count }) => {
                const state = includedTags.includes(tag)
                  ? 'include'
                  : excludedTags.includes(tag)
                  ? 'exclude'
                  : 'none';

                const baseClass =
                  'px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border select-none group shrink-0';

                const stateClass =
                  state === 'include'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                    : state === 'exclude'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-slate-900/60 text-slate-300 border-slate-700/50 hover:bg-slate-800/60 hover:border-purple-500/40 hover:text-white';

                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`${baseClass} ${stateClass}`}
                  >
                    {state === 'include' && <Plus className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                    {state === 'exclude' && <Minus className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                    {state === 'none' && <Plus className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100 shrink-0" />}
                    <span>{tag}</span>
                    <span className="text-[10px] opacity-60 font-mono">({count})</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-video bg-slate-800" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-slate-800 rounded w-3/4" />
                    <div className="h-3 bg-slate-800 rounded w-full" />
                    <div className="h-3 bg-slate-800 rounded w-1/2" />
                  </div>
                </div>
              ))
            : articles.length === 0 ? (
                <div className="col-span-full text-center py-16 space-y-4">
                  <FileText className="w-12 h-12 mx-auto text-slate-600" />
                  <p className="text-slate-400">{t.articles?.noArticlesFound || 'Keine Artikel gefunden'}</p>
                  <button
                    onClick={hardReset}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold"
                  >
                    {t.common?.resetFilters || 'Filter zurücksetzen'}
                  </button>
                </div>
              ) : (
                articles.map((article: any) => (
                  <Link
                    key={article.documentId || article.slug || article.id}
                    href={`/article/${article.slug}`}
                    className="group relative bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="relative aspect-video bg-slate-950 overflow-hidden">
                      {article.thumbnail ? (
                        <Image
                          src={article.thumbnail}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-purple-950 via-indigo-950 to-slate-900 flex items-center justify-center">
                          <BookOpen className="w-10 h-10 text-indigo-400/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
                    </div>

                    <div className="p-4 space-y-2">
                      <h3 className="font-bold text-sm text-white line-clamp-2 group-hover:text-indigo-300 transition-colors">
                        {article.title}
                      </h3>
                      {article.summary && (
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {typeof article.summary === 'string'
                            ? article.summary
                            : Array.isArray(article.summary)
                            ? article.summary
                                .map((b: any) => (Array.isArray(b?.children) ? b.children.map((c: any) => c.text).join('') : ''))
                                .filter(Boolean)
                                .join(' ')
                            : ''}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-2 text-[10px] text-slate-500">
                        <span className="truncate">
                          {article.creator?.username || article.authorName || 'Omni Creator'}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="flex items-center gap-0.5">
                            <Eye className="w-3 h-3" />
                            {article.viewsCount || 0}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Heart className="w-3 h-3" />
                            {article.likesCount || 0}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <MessageSquare className="w-3 h-3" />
                            {article.commentsCount || 0}
                          </span>
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-slate-400">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </main>

      <ArticleCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
