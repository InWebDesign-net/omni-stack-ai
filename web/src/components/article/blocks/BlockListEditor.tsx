'use client';

import React, { useState } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, ChevronDown, ChevronUp, Trash2, Plus, ArrowUp, ArrowDown, AlertTriangle,
} from 'lucide-react';
import {
  BLOCK_TYPES, INSERTABLE_TYPES, blockKey,
  type ArticleBlock, type BlockComponent,
} from './blockTypes';
import { BlockFields } from './BlockFields';

/**
 * The block list for one locale.
 *
 * Reordering is available two ways on purpose. Drag and drop alone is
 * pointer-only: it locks out keyboard and screen-reader users, and on touch it
 * competes with page scrolling. The move buttons are the accessible path and
 * also what makes reordering testable without simulating drag gestures.
 *
 * Exactly one block is expanded at a time. A collapsed block is a single row —
 * handle, type, one-line summary, controls — which is what keeps a twenty-block
 * article navigable inside a modal.
 */

interface BlockListEditorProps {
  blocks: ArticleBlock[];
  onChange: (blocks: ArticleBlock[]) => void;
  /** Same position in the other locale, used to warn before a delete removes it there too. */
  otherLocaleBlocks?: ArticleBlock[];
  otherLocaleLabel?: string;
  t?: any;
}

export function BlockListEditor({
  blocks, onChange, otherLocaleBlocks = [], otherLocaleLabel = '', t,
}: BlockListEditorProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [pickerAt, setPickerAt] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const b = t?.blocks || {};

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((blk) => blockKey(blk) === active.id);
    const to = blocks.findIndex((blk) => blockKey(blk) === over.id);
    if (from === -1 || to === -1) return;
    onChange(arrayMove(blocks, from, to));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    onChange(arrayMove(blocks, index, target));
  };

  const insertAt = (index: number, component: BlockComponent) => {
    const next = [...blocks];
    const created = BLOCK_TYPES[component].create();
    next.splice(index, 0, created);
    onChange(next);
    setExpandedKey(blockKey(created));
    setPickerAt(null);
  };

  const updateField = (index: number, field: string, value: unknown) => {
    onChange(blocks.map((blk, i) => (i === index ? { ...blk, [field]: value } : blk)));
  };

  const remove = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
    setPendingDelete(null);
  };

  /** Does the other locale hold content at this position that a delete would take with it? */
  const otherLocaleHasContent = (index: number): string => {
    const counterpart = otherLocaleBlocks[index];
    if (!counterpart) return '';
    const meta = BLOCK_TYPES[counterpart.__component];
    return meta ? meta.summary(counterpart).slice(0, 80) : '';
  };

  const TypePicker = ({ at }: { at: number }) => (
    <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-canvas border border-subtle">
      {INSERTABLE_TYPES.map((component) => {
        const meta = BLOCK_TYPES[component];
        const Icon = meta.icon;
        return (
          <button
            key={component}
            type="button"
            onClick={() => insertAt(at, component)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface hover:bg-surface-raised text-muted hover:text-primary border border-subtle transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{b.types?.[meta.labelKey] || meta.fallbackLabel}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setPickerAt(null)}
        className="px-2.5 py-1.5 rounded-lg text-xs text-faint hover:text-muted transition-colors cursor-pointer"
      >
        {b.cancel || 'Abbrechen'}
      </button>
    </div>
  );

  return (
    <div className="space-y-2">
      {blocks.length === 0 && (
        <p className="text-xs text-faint italic py-2">
          {b.empty || 'Noch keine Inhaltsblöcke. Füge unten den ersten hinzu.'}
        </p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map(blockKey)} strategy={verticalListSortingStrategy}>
          {blocks.map((block, index) => {
            const key = blockKey(block);
            const meta = BLOCK_TYPES[block.__component];
            if (!meta) return null;
            const isExpanded = expandedKey === key;

            return (
              <React.Fragment key={key}>
                {pickerAt === index && <TypePicker at={index} />}

                <SortableBlockRow
                  id={key}
                  block={block}
                  index={index}
                  total={blocks.length}
                  isExpanded={isExpanded}
                  onToggle={() => setExpandedKey(isExpanded ? null : key)}
                  onMove={move}
                  onInsertBefore={() => setPickerAt(index)}
                  onInsertAfter={() => setPickerAt(index + 1)}
                  onRequestDelete={() => setPendingDelete(index)}
                  onFieldChange={(field, value) => updateField(index, field, value)}
                  pendingDelete={pendingDelete === index}
                  onCancelDelete={() => setPendingDelete(null)}
                  onConfirmDelete={() => remove(index)}
                  otherLocaleContent={otherLocaleHasContent(index)}
                  otherLocaleLabel={otherLocaleLabel}
                  t={t}
                />
              </React.Fragment>
            );
          })}
        </SortableContext>
      </DndContext>

      {pickerAt === blocks.length ? (
        <TypePicker at={blocks.length} />
      ) : (
        <button
          type="button"
          onClick={() => setPickerAt(blocks.length)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-subtle text-xs font-semibold text-muted hover:text-primary hover:border-purple-500/50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{b.addBlock || 'Block hinzufügen'}</span>
        </button>
      )}
    </div>
  );
}

interface SortableBlockRowProps {
  id: string;
  block: ArticleBlock;
  index: number;
  total: number;
  isExpanded: boolean;
  onToggle: () => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
  onRequestDelete: () => void;
  onFieldChange: (field: string, value: unknown) => void;
  pendingDelete: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  otherLocaleContent: string;
  otherLocaleLabel: string;
  t?: any;
}

function SortableBlockRow({
  id, block, index, total, isExpanded, onToggle, onMove,
  onInsertBefore, onInsertAfter, onRequestDelete, onFieldChange,
  pendingDelete, onCancelDelete, onConfirmDelete,
  otherLocaleContent, otherLocaleLabel, t,
}: SortableBlockRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const meta = BLOCK_TYPES[block.__component];
  const Icon = meta.icon;
  const b = t?.blocks || {};
  const label = b.types?.[meta.labelKey] || meta.fallbackLabel;
  const summary = meta.summary(block);

  const iconButton =
    'p-1.5 rounded-lg text-faint hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500';

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border bg-surface transition-shadow ${
        isDragging ? 'border-purple-500/60 shadow-xl z-10 relative' : 'border-subtle'
      }`}
    >
      <div className="flex items-center gap-1.5 px-2 py-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={b.dragHandle || 'Block verschieben'}
          className="p-1 rounded-lg text-faint hover:text-muted cursor-grab active:cursor-grabbing touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer group"
        >
          <Icon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="text-xs font-semibold text-primary shrink-0">{label}</span>
          {summary && (
            <span className="text-xs text-faint truncate group-hover:text-muted transition-colors">
              {summary}
            </span>
          )}
        </button>

        <div className="flex items-center shrink-0">
          <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0}
            aria-label={b.moveUp || 'Nach oben'} title={b.moveUp || 'Nach oben'} className={iconButton}>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => onMove(index, 1)} disabled={index === total - 1}
            aria-label={b.moveDown || 'Nach unten'} title={b.moveDown || 'Nach unten'} className={iconButton}>
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onInsertBefore}
            aria-label={b.insertBefore || 'Davor einfügen'} title={b.insertBefore || 'Davor einfügen'} className={iconButton}>
            <Plus className="w-3.5 h-3.5 -mt-1" />
          </button>
          <button type="button" onClick={onInsertAfter}
            aria-label={b.insertAfter || 'Danach einfügen'} title={b.insertAfter || 'Danach einfügen'} className={iconButton}>
            <Plus className="w-3.5 h-3.5 mt-1" />
          </button>
          <button type="button" onClick={onRequestDelete}
            aria-label={b.remove || 'Block entfernen'} title={b.remove || 'Block entfernen'}
            className={`${iconButton} hover:text-rose-400`}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onToggle} aria-hidden tabIndex={-1} className={iconButton}>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {pendingDelete && (
        <div className="mx-2 mb-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-semibold text-primary">
                {b.confirmRemove || 'Diesen Block entfernen?'}
              </p>
              {summary && <p className="text-[11px] text-muted truncate">{summary}</p>}
              {otherLocaleContent && (
                <p className="text-[11px] text-rose-300 leading-relaxed">
                  {(b.otherLocaleWarning ||
                    'Achtung: In der Sprachversion {locale} steht an dieser Stelle noch Inhalt, der mit entfernt wird: „{content}"')
                    .replace('{locale}', otherLocaleLabel)
                    .replace('{content}', otherLocaleContent)}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onCancelDelete}
              className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-primary transition-colors cursor-pointer">
              {b.cancel || 'Abbrechen'}
            </button>
            <button type="button" onClick={onConfirmDelete}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer">
              {b.remove || 'Entfernen'}
            </button>
          </div>
        </div>
      )}

      {isExpanded && !pendingDelete && (
        <div className="px-3 pb-3 pt-1 border-t border-subtle">
          <BlockFields block={block} onChange={onFieldChange} t={t} />
        </div>
      )}
    </div>
  );
}
