'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from '@/components/common/LocaleLink';
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
    searchTerm, currentPage, sort, filterLikes, lang, perPage,
    searchInput, setSearchInput, handleSearchSubmit, clearSearch,
    includedTags, excludedTags, matchMode, tagSearch, isTagCloudExpanded,
    filteredAllTags, hasTagFilters, toggleTag, setMatchMode, setTagSearch,
    setIsTagCloudExpanded, allTags, isLoadingTags,
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
    <div className="min-h-screen bg-canvas text-primary flex flex-col font-['Hanken_Grotesk',sans-serif]">
      <Header />

      <main className="flex-1 max-w-content w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* Top Control Header */}
        <div className="bg-surface border border-subtle backdrop-blur-xl rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-2xl space-y-4 sm:space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-purple-400">
                  <FileText className="w-6 h-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                  {t.header?.articles || 'Articles'}
                </h1>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono">
                  {isLoading ? '...' : `${totalArticles} ${lang === 'de' ? 'Artikel' : 'Articles'}`}
                </span>
              </div>
              <p className="text-muted text-sm mt-1">
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-subtle">
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
              <div className="flex items-center gap-2 bg-surface-raised border border-subtle rounded-xl px-3 py-1.5">
                <SlidersHorizontal className="w-4 h-4 text-purple-400 shrink-0" />
                <select
                  id="articles-sort-select"
                  aria-label="Sortierung"
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="bg-transparent text-sm text-primary focus:outline-none cursor-pointer pr-2"
                >
                  <option value="createdatasc" className="bg-surface-raised text-primary">✨ Neueste zuerst</option>
                  <option value="trending" className="bg-surface-raised text-primary">🔥 Trending</option>
                  <option value="mostliked" className="bg-surface-raised text-primary">❤️ Beliebteste</option>
                  <option value="mostcommented" className="bg-surface-raised text-primary">💬 Aktivste</option>
                  <option value="titleasc" className="bg-surface-raised text-primary">Titel (A-Z)</option>
                  <option value="titledesc" className="bg-surface-raised text-primary">Titel (Z-A)</option>
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

        {/* Articles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse flex flex-col space-y-2">
                  <div className="aspect-video bg-surface-raised/80 rounded-xl w-full" />
                  <div className="space-y-1.5 pt-1">
                    <div className="h-3.5 bg-surface-raised/60 rounded w-3/4" />
                    <div className="h-3 bg-surface-raised/40 rounded w-full" />
                  </div>
                </div>
              ))
            : articles.length === 0 ? (
                <div className="col-span-full text-center py-16 space-y-4">
                  <FileText className="w-12 h-12 mx-auto text-faint" />
                  <p className="text-muted">{t.articles?.noArticlesFound || 'Keine Artikel gefunden'}</p>
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
                    className="group relative flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <div className="relative aspect-video bg-surface rounded-xl overflow-hidden shadow-md">
                      {article.thumbnail ? (
                        <Image
                          src={article.thumbnail}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-purple-950 via-indigo-950 to-slate-900 flex items-center justify-center">
                          <BookOpen className="w-10 h-10 text-indigo-400/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>

                    <div className="pt-2.5 flex-1 flex flex-col justify-between gap-1.5">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-xs sm:text-sm text-primary line-clamp-2 group-hover:text-indigo-300 transition-colors leading-snug">
                          {article.title}
                        </h3>
                        {article.summary && (
                          <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
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
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted pt-1">
                        <span className="truncate max-w-[120px]">
                          {article.creator?.username || article.authorName || 'Omni Creator'}
                        </span>
                        <span className="flex items-center gap-2 font-mono text-[10px]">
                          <span className="flex items-center gap-0.5">
                            <Eye className="w-3 h-3 text-muted" />
                            {article.viewsCount || 0}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Heart className="w-3 h-3 text-rose-400" />
                            {article.likesCount || 0}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <MessageSquare className="w-3 h-3 text-indigo-400" />
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
              className="p-2 bg-surface-raised border border-subtle hover:bg-surface-raised/80 disabled:opacity-40 text-muted hover:text-primary rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-muted">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-2 bg-surface-raised border border-subtle hover:bg-surface-raised/80 disabled:opacity-40 text-muted hover:text-primary rounded-xl transition-colors"
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
