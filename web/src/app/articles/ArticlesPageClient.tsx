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
import { ContentTagFilter } from '@/components/content/ContentTagFilter';
import { ContentSearchBar } from '@/components/content/ContentSearchBar';
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
            <ContentSearchBar
              kind="article"
              accent="purple"
              placeholder={t.articles?.searchPlaceholder || 'Artikel suchen...'}
              clearLabel={t.common?.clearSearch || 'Suche zurücksetzen'}
              value={searchInput}
              onChange={setSearchInput}
              onSubmit={handleSearchSubmit}
              onClear={clearSearch}
            />

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

        <ContentTagFilter
            accent="purple"
            labels={{
              heading: t.tagFilter?.allTags || 'Alle Tags',
              activeSuffix: t.tagFilter?.activeTags || 'aktiv',
              matchAny: t.tagFilter?.matchAny || 'Irgendein Tag',
              matchAll: t.tagFilter?.matchAll || 'Alle Tags',
              searchTagsPlaceholder: t.tagFilter?.searchTagsPlaceholder || 'Tag suchen...',
              noTagsFound: t.tagFilter?.noTagsFound || 'Keine Tags für "{query}" gefunden.',
              showLess: t.tagFilter?.showLess || 'Weniger anzeigen',
              showAll: t.tagFilter?.showAll || 'Alle Tags',
            }}
            allTags={allTags}
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
