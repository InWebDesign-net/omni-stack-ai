'use client';

import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Type, Image, Video, Code, List, Quote } from 'lucide-react';

interface Block {
  id: string;
  type: 'heading' | 'paragraph' | 'quote' | 'image' | 'gallery' | 'video' | 'code' | 'list';
  content: any;
}

interface BlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  t?: any;
}

const BLOCK_TYPES = [
  { type: 'heading', icon: Type, label: 'Heading' },
  { type: 'paragraph', icon: Type, label: 'Paragraph' },
  { type: 'quote', icon: Quote, label: 'Quote' },
  { type: 'image', icon: Image, label: 'Image' },
  { type: 'video', icon: Video, label: 'Video' },
  { type: 'code', icon: Code, label: 'Code' },
  { type: 'list', icon: List, label: 'List' },
];

export function BlockEditor({ blocks, onChange, t }: BlockEditorProps) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const addBlock = (type: Block['type']) => {
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type,
      content: type === 'heading' ? { level: 2, text: '' } :
               type === 'paragraph' ? { text: '' } :
               type === 'quote' ? { text: '' } :
               type === 'image' ? { url: '', alt: '' } :
               type === 'video' ? { url: '' } :
               type === 'code' ? { language: 'javascript', code: '' } :
               type === 'list' ? { items: [''], ordered: false } :
               {},
    };
    onChange([...blocks, newBlock]);
    setActiveBlockId(newBlock.id);
  };

  const updateBlock = (id: string, content: any) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex((b) => b.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const newBlocks = [...blocks];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]];
    onChange(newBlocks);
  };

  return (
    <div className="space-y-4">
      {/* Block Type Selector */}
      <div className="flex flex-wrap gap-2">
        {BLOCK_TYPES.map((bt) => (
          <button
            key={bt.type}
            type="button"
            onClick={() => addBlock(bt.type as Block['type'])}
            className="flex items-center gap-1 px-3 py-1.5 bg-surface hover:bg-surface-raised text-muted hover:text-primary border border-subtle rounded-lg text-xs transition-colors"
          >
            <bt.icon className="w-3 h-3" />
            {bt.label}
          </button>
        ))}
      </div>

      {/* Blocks */}
      <div className="space-y-2">
        {blocks.map((block) => (
          <div
            key={block.id}
            className={`relative bg-surface border rounded-xl p-3 ${
              activeBlockId === block.id ? 'border-indigo-500' : 'border-subtle'
            }`}
            onClick={() => setActiveBlockId(block.id)}
          >
            {/* Block Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted cursor-move" />
                <span className="text-xs font-semibold text-muted uppercase">{block.type}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }}
                  className="p-1 hover:bg-surface-raised rounded text-muted hover:text-primary"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }}
                  className="p-1 hover:bg-surface-raised rounded text-muted hover:text-primary"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                  className="p-1 hover:bg-surface-raised rounded text-muted hover:text-rose-400"
                  title="Remove"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Block Content Editor */}
            {block.type === 'heading' && (
              <div className="space-y-2">
                <select
                  value={block.content.level || 2}
                  onChange={(e) => updateBlock(block.id, { ...block.content, level: parseInt(e.target.value) })}
                  className="bg-base border border-subtle rounded-lg px-3 py-1.5 text-sm text-primary"
                >
                  <option value={1}>H1</option>
                  <option value={2}>H2</option>
                  <option value={3}>H3</option>
                  <option value={4}>H4</option>
                </select>
                <input
                  type="text"
                  value={block.content.text || ''}
                  onChange={(e) => updateBlock(block.id, { ...block.content, text: e.target.value })}
                  placeholder="Heading text..."
                  className="w-full bg-base border border-subtle rounded-lg px-3 py-2 text-sm text-primary placeholder-faint"
                />
              </div>
            )}

            {block.type === 'paragraph' && (
              <textarea
                value={block.content.text || ''}
                onChange={(e) => updateBlock(block.id, { ...block.content, text: e.target.value })}
                placeholder="Paragraph text..."
                rows={3}
                className="w-full bg-base border border-subtle rounded-lg px-3 py-2 text-sm text-primary placeholder-faint resize-none"
              />
            )}

            {block.type === 'quote' && (
              <textarea
                value={block.content.text || ''}
                onChange={(e) => updateBlock(block.id, { ...block.content, text: e.target.value })}
                placeholder="Quote text..."
                rows={2}
                className="w-full bg-base border border-subtle rounded-lg px-3 py-2 text-sm text-primary placeholder-faint resize-none italic"
              />
            )}

            {block.type === 'image' && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={block.content.url || ''}
                  onChange={(e) => updateBlock(block.id, { ...block.content, url: e.target.value })}
                  placeholder="Image URL..."
                  className="w-full bg-base border border-subtle rounded-lg px-3 py-2 text-sm text-primary placeholder-faint"
                />
                <input
                  type="text"
                  value={block.content.alt || ''}
                  onChange={(e) => updateBlock(block.id, { ...block.content, alt: e.target.value })}
                  placeholder="Alt text..."
                  className="w-full bg-base border border-subtle rounded-lg px-3 py-2 text-sm text-primary placeholder-faint"
                />
              </div>
            )}

            {block.type === 'video' && (
              <input
                type="text"
                value={block.content.url || ''}
                onChange={(e) => updateBlock(block.id, { ...block.content, url: e.target.value })}
                placeholder="Video URL..."
                className="w-full bg-base border border-subtle rounded-lg px-3 py-2 text-sm text-primary placeholder-faint"
              />
            )}

            {block.type === 'code' && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={block.content.language || 'javascript'}
                  onChange={(e) => updateBlock(block.id, { ...block.content, language: e.target.value })}
                  placeholder="Language..."
                  className="w-full bg-base border border-subtle rounded-lg px-3 py-2 text-sm text-primary placeholder-faint"
                />
                <textarea
                  value={block.content.code || ''}
                  onChange={(e) => updateBlock(block.id, { ...block.content, code: e.target.value })}
                  placeholder="Code..."
                  rows={4}
                  className="w-full bg-base border border-subtle rounded-lg px-3 py-2 text-sm text-primary placeholder-faint font-mono resize-none"
                />
              </div>
            )}

            {block.type === 'list' && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={block.content.ordered || false}
                    onChange={(e) => updateBlock(block.id, { ...block.content, ordered: e.target.checked })}
                    className="rounded"
                  />
                  Ordered list
                </label>
                {(block.content.items || ['']).map((item: string, i: number) => (
                  <input
                    key={i}
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const newItems = [...(block.content.items || [])];
                      newItems[i] = e.target.value;
                      updateBlock(block.id, { ...block.content, items: newItems });
                    }}
                    placeholder={`Item ${i + 1}...`}
                    className="w-full bg-base border border-subtle rounded-lg px-3 py-1.5 text-sm text-primary placeholder-faint"
                  />
                ))}
                <button
                  type="button"
                  onClick={() => updateBlock(block.id, { ...block.content, items: [...(block.content.items || []), ''] })}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  + Add item
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {blocks.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          {t?.articles?.noBlocks || 'No blocks yet. Add one above.'}
        </div>
      )}
    </div>
  );
}
