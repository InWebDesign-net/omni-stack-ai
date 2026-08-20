/**
 * Per-kind accent colours for the list pages.
 *
 * Tailwind only ships classes it can see as complete strings, so these cannot be
 * built as `text-${accent}-400` at runtime — every variant is spelled out here
 * and picked by key.
 */

export type ContentAccent = 'indigo' | 'teal' | 'purple';

export interface AccentClasses {
  text: string;
  inputFocus: string;
  focusWithin: string;
  badge: string;
  toggleActive: string;
  tagIncluded: string;
  tagHover: string;
  iconPlus: string;
  linkHover: string;
}

export const ACCENTS: Record<ContentAccent, AccentClasses> = {
  indigo: {
    text: 'text-indigo-400',
    inputFocus: 'focus:border-indigo-500',
    focusWithin: 'focus-within:border-indigo-500/80',
    badge: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
    toggleActive: 'bg-indigo-500/20 text-indigo-300 font-bold',
    tagIncluded: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30',
    tagHover: 'hover:border-indigo-500/40',
    iconPlus: 'text-indigo-400',
    linkHover: 'hover:text-indigo-400',
  },
  teal: {
    text: 'text-teal-400',
    inputFocus: 'focus:border-teal-500',
    focusWithin: 'focus-within:border-teal-500/80',
    badge: 'bg-teal-500/15 border-teal-500/30 text-teal-300',
    toggleActive: 'bg-teal-500/20 text-teal-300 font-bold',
    tagIncluded: 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30',
    tagHover: 'hover:border-teal-500/40',
    iconPlus: 'text-teal-400',
    linkHover: 'hover:text-teal-400',
  },
  purple: {
    text: 'text-purple-400',
    inputFocus: 'focus:border-purple-500',
    focusWithin: 'focus-within:border-purple-500/80',
    badge: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
    toggleActive: 'bg-purple-500/20 text-purple-300 font-bold',
    tagIncluded: 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30',
    tagHover: 'hover:border-purple-500/40',
    iconPlus: 'text-purple-400',
    linkHover: 'hover:text-purple-400',
  },
};
