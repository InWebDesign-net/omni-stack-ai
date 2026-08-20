'use client';

import React from 'react';
import { Tag, X, Plus, Minus, ChevronUp, ChevronDown } from 'lucide-react';
import type { TagCount } from '@/lib/videoFilters';
import { ACCENTS, type ContentAccent } from './accents';

/**
 * The tag cloud panel shared by /videos, /articles and /images.
 *
 * All three had their own copy. Videos and articles had stayed within 88% of
 * each other; the images variant had drifted further and carried a hardcoded
 * German heading. This is the videos/articles shape, with the differences that
 * actually matter — accent colour and labels — lifted into props.
 */

export interface ContentTagFilterLabels {
  heading: string;
  activeSuffix: string;
  matchAny: string;
  matchAll: string;
  searchTagsPlaceholder: string;
  /** Contains a `{query}` placeholder. */
  noTagsFound: string;
  showLess: string;
  showAll: string;
}

export interface ContentTagFilterProps {
  accent: ContentAccent;
  labels: ContentTagFilterLabels;
  allTags: TagCount[];
  filteredAllTags: TagCount[];
  includedTags: string[];
  excludedTags: string[];
  matchMode: 'any' | 'all';
  hasTagFilters: boolean;
  tagSearch: string;
  isTagCloudExpanded: boolean;
  toggleTag: (tag: string) => void;
  setMatchMode: (mode: 'any' | 'all') => void;
  setTagSearch: (query: string) => void;
  setIsTagCloudExpanded: (expanded: boolean) => void;
}

export function ContentTagFilter({
  accent,
  labels,
  allTags,
  filteredAllTags,
  includedTags,
  excludedTags,
  matchMode,
  hasTagFilters,
  tagSearch,
  isTagCloudExpanded,
  toggleTag,
  setMatchMode,
  setTagSearch,
  setIsTagCloudExpanded,
}: ContentTagFilterProps) {
  const a = ACCENTS[accent];

  return (
    <div className="pt-4 border-t border-slate-800/60 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: heading, active count, match mode */}
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className={`w-4 h-4 ${a.text} shrink-0`} />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{labels.heading}</span>
          {hasTagFilters && (
            <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full border ${a.badge}`}>
              {includedTags.length + excludedTags.length} {labels.activeSuffix}
            </span>
          )}
          {includedTags.length > 1 && (
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 text-[11px] ml-1.5">
              <button
                type="button"
                onClick={() => setMatchMode('any')}
                aria-pressed={matchMode === 'any'}
                className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                  matchMode === 'any' ? a.toggleActive : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {labels.matchAny}
              </button>
              <button
                type="button"
                onClick={() => setMatchMode('all')}
                aria-pressed={matchMode === 'all'}
                className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                  matchMode === 'all' ? a.toggleActive : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {labels.matchAll}
              </button>
            </div>
          )}
        </div>

        {/* Right: tag search + expand toggle */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div
            className={`relative flex items-center bg-slate-950/80 border border-slate-800 ${a.focusWithin} rounded-xl px-2.5 py-1 text-xs transition-all`}
          >
            <input
              type="text"
              aria-label={labels.searchTagsPlaceholder}
              placeholder={labels.searchTagsPlaceholder}
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              className="w-28 sm:w-36 bg-transparent text-xs text-slate-200 placeholder-slate-500 outline-none border-none focus:outline-none focus:ring-0 ring-0 p-0"
            />
            {tagSearch && (
              <button
                type="button"
                onClick={() => setTagSearch('')}
                aria-label={labels.showLess}
                className="p-0.5 text-slate-400 hover:text-slate-200 shrink-0 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {allTags.length > 0 && (
            <button
              type="button"
              onClick={() => setIsTagCloudExpanded(!isTagCloudExpanded)}
              aria-expanded={isTagCloudExpanded}
              className={`flex items-center gap-1 text-xs text-slate-400 ${a.linkHover} font-medium transition-colors cursor-pointer`}
            >
              <span>
                {isTagCloudExpanded ? labels.showLess : `${labels.showAll} (${allTags.length})`}
              </span>
              {isTagCloudExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Cloud: two rows collapsed, scrollable when expanded or searching */}
      <div
        className={`flex flex-wrap items-center gap-2 transition-all duration-300 ${
          isTagCloudExpanded || tagSearch.trim()
            ? 'max-h-[380px] sm:max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700'
            : 'max-h-[68px] sm:max-h-[72px] overflow-hidden'
        }`}
      >
        {allTags.length === 0 ? (
          // Skeletons sized to the real pills so the panel does not jump on load.
          Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`tag-skeleton-${i}`}
              style={{ width: `${64 + ((i * 17) % 52)}px` }}
              className="h-7 rounded-lg bg-slate-900/80 border border-slate-800/80 animate-pulse shrink-0"
            />
          ))
        ) : filteredAllTags.length === 0 ? (
          <div className="text-xs text-slate-500 italic py-1">
            {labels.noTagsFound.replace('{query}', tagSearch)}
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
                ? a.tagIncluded
                : state === 'exclude'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                : `bg-slate-900/60 text-slate-300 border-slate-700/50 hover:bg-slate-800/60 ${a.tagHover} hover:text-white`;

            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={state !== 'none'}
                className={`${baseClass} ${stateClass}`}
              >
                {state === 'include' && <Plus className={`w-3.5 h-3.5 ${a.iconPlus} shrink-0`} />}
                {state === 'exclude' && <Minus className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                {state === 'none' && (
                  <Plus className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100 shrink-0" />
                )}
                <span>{tag}</span>
                <span className="text-[10px] opacity-60 font-mono">({count})</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
