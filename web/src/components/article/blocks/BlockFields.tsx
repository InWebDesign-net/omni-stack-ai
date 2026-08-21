'use client';

import React from 'react';
import type { ArticleBlock } from './blockTypes';
import { HEADLINE_LEVELS, DEFAULT_HEADLINE_LEVEL } from './blockTypes';
import { MediaBlockPicker, type MediaRelation } from './MediaBlockPicker';

/**
 * The field editor for one expanded block.
 *
 * Media blocks are deliberately read-only here: their value is a relation to an
 * existing image or video, and choosing one needs the picker from #61. Showing
 * them as a locked summary keeps an article's existing media visible and, more
 * importantly, stops an author assuming the field is simply empty and saving the
 * relation away.
 */

/**
 * Field styling without a width.
 *
 * `w-full` used to live in here, which meant a field that needed a different
 * width could not get one: appending `w-24` does not override `w-full`, because
 * Tailwind resolves conflicting utilities by their order in the generated
 * stylesheet, not by their order in the class string. That is how the headline
 * block ended up with a sliver of an input beside a full-width level select.
 */
const fieldBase =
  'px-3 py-2 bg-base border border-subtle rounded-xl text-sm text-primary placeholder-faint outline-none focus:outline-none focus:border-purple-500 transition-colors';

const inputClass = `w-full ${fieldBase}`;

interface BlockFieldsProps {
  block: ArticleBlock;
  onChange: (field: string, value: unknown) => void;
  t?: any;
}

export function BlockFields({ block, onChange, t }: BlockFieldsProps) {
  const b = t?.blocks || {};

  switch (block.__component) {
    case 'shared.headline':
      return (
        <div className="space-y-2.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={(block.title as string) || ''}
              onChange={(e) => onChange('title', e.target.value)}
              placeholder={b.headlineTitle || 'Überschrift'}
              aria-label={b.headlineTitle || 'Überschrift'}
              className={`${fieldBase} flex-1 min-w-0`}
            />
            <select
              // A value outside the schema enum falls back to the default rather
              // than rendering a blank select the author cannot interpret.
              value={
                HEADLINE_LEVELS.includes(block.level as never)
                  ? (block.level as string)
                  : DEFAULT_HEADLINE_LEVEL
              }
              onChange={(e) => onChange('level', e.target.value)}
              aria-label={b.headlineLevel || 'Ebene'}
              className={`${fieldBase} w-24 shrink-0 cursor-pointer`}
            >
              {HEADLINE_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={(block.subtitle as string) || ''}
            onChange={(e) => onChange('subtitle', e.target.value)}
            placeholder={b.headlineSubtitle || 'Unterzeile (optional)'}
            aria-label={b.headlineSubtitle || 'Unterzeile'}
            className={inputClass}
          />
        </div>
      );

    case 'shared.rich-text':
      return (
        <textarea
          value={(block.body as string) || ''}
          onChange={(e) => onChange('body', e.target.value)}
          rows={6}
          placeholder={b.richTextBody || 'Text…'}
          aria-label={b.richTextBody || 'Text'}
          className={`${inputClass} resize-y min-h-[120px]`}
        />
      );

    case 'shared.quote':
      return (
        <div className="space-y-2.5">
          <textarea
            value={(block.quote as string) || ''}
            onChange={(e) => onChange('quote', e.target.value)}
            rows={3}
            placeholder={b.quoteText || 'Zitat'}
            aria-label={b.quoteText || 'Zitat'}
            className={`${inputClass} resize-y`}
          />
          <input
            type="text"
            value={(block.author as string) || ''}
            onChange={(e) => onChange('author', e.target.value)}
            placeholder={b.quoteAuthor || 'Urheber (optional)'}
            aria-label={b.quoteAuthor || 'Urheber'}
            className={inputClass}
          />
        </div>
      );

    case 'shared.image':
    case 'shared.video': {
      const kind = block.__component === 'shared.image' ? 'image' : 'video';
      const relationField = kind === 'image' ? 'image' : 'video';

      return (
        <div className="space-y-2.5">
          <MediaBlockPicker
            kind={kind}
            value={block[relationField] as MediaRelation | string | null}
            onChange={(relation) => onChange(relationField, relation)}
            t={t}
          />
          <input
            type="text"
            value={(block.caption as string) || ''}
            onChange={(e) => onChange('caption', e.target.value)}
            placeholder={b.mediaCaption || 'Bildunterschrift (optional)'}
            aria-label={b.mediaCaption || 'Bildunterschrift'}
            className={inputClass}
          />
        </div>
      );
    }

    default:
      return null;
  }
}
