'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { ACCENTS, type ContentAccent } from './accents';

/**
 * The search field shared by the three list pages.
 *
 * The three copies differed only in the input id, the placeholder and the focus
 * accent — everything else was identical down to the class strings.
 */

export interface ContentSearchBarProps {
  /** Used for the input id, so labels stay unique per page. */
  kind: string;
  accent: ContentAccent;
  placeholder: string;
  clearLabel: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClear: () => void;
}

export function ContentSearchBar({
  kind,
  accent,
  placeholder,
  clearLabel,
  value,
  onChange,
  onSubmit,
  onClear,
}: ContentSearchBarProps) {
  const a = ACCENTS[accent];

  return (
    <form onSubmit={onSubmit} className="relative flex-1 max-w-md">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        id={`${kind}-search-input`}
        type="text"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full pl-10 pr-9 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none focus:outline-none ${a.inputFocus} focus:ring-0 ring-0 transition-all`}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel}
          title={clearLabel}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </form>
  );
}
