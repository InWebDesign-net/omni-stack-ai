'use client';

import React from 'react';
import { Play, FileText, Image as ImageIcon, Quote, Code, List, CheckSquare } from 'lucide-react';
import Image from 'next/image';

interface Block {
  id?: string | number;
  type: string;
  children?: { text: string; bold?: boolean; italic?: boolean; code?: boolean }[];
  content?: any;
  image?: { url: string; alternativeText?: string; width?: number; height?: number; mimeType?: string };
  video?: { url: string; mimeType?: string };
  language?: string;
  code?: string;
  title?: string;
  items?: string[];
  ordered?: boolean;
  level?: number;
}

interface ArticleBlockRendererProps {
  blocks: Block[];
}

export function ArticleBlockRenderer({ blocks }: ArticleBlockRendererProps) {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return <p className="text-slate-400 italic">Kein Inhalt verfügbar.</p>;
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <Block key={block.id || index} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading':
      return <HeadingBlock block={block} />;
    case 'paragraph':
      return <ParagraphBlock block={block} />;
    case 'quote':
      return <QuoteBlock block={block} />;
    case 'image':
      return <ImageBlock block={block} />;
    case 'gallery':
      return <GalleryBlock block={block} />;
    case 'video':
      return <VideoBlock block={block} />;
    case 'code':
      return <CodeBlock block={block} />;
    case 'list':
      return <ListBlock block={block} />;
    case 'divider':
      return <hr className="border-slate-700 my-6" />;
    default:
      return <ParagraphBlock block={block} />;
  }
}

function HeadingBlock({ block }: { block: Block }) {
  const level = block.level || block.content?.level || 2;
  const text = block.children?.map((c) => c.text).join('') || '';
  
  const sizeClass: Record<number, string> = {
    1: 'text-3xl font-extrabold',
    2: 'text-2xl font-bold',
    3: 'text-xl font-bold',
    4: 'text-lg font-semibold',
    5: 'text-base font-semibold',
    6: 'text-sm font-semibold',
  };
  
  const Tag = `h${Math.min(level, 6)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  return <Tag className={`${sizeClass[level] || 'text-xl font-bold'} text-white mt-8 mb-4`}>{text}</Tag>;
}

function ParagraphBlock({ block }: { block: Block }) {
  const text = block.children?.map((c) => c.text).join('') || '';
  
  if (!text.trim()) return null;
  
  return (
    <p className="text-slate-300 leading-relaxed mb-4">
      {block.children?.map((child, i) => {
        if (child.bold && child.italic) {
          return <strong key={i} className="font-bold italic text-white">{child.text}</strong>;
        }
        if (child.bold) {
          return <strong key={i} className="font-bold text-white">{child.text}</strong>;
        }
        if (child.italic) {
          return <em key={i} className="italic">{child.text}</em>;
        }
        if (child.code) {
          return <code key={i} className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300 text-sm font-mono">{child.text}</code>;
        }
        return <React.Fragment key={i}>{child.text}</React.Fragment>;
      })}
    </p>
  );
}

function QuoteBlock({ block }: { block: Block }) {
  const text = block.children?.map((c) => c.text).join('') || '';
  
  return (
    <blockquote className="border-l-4 border-indigo-500 pl-4 py-2 my-6 bg-indigo-500/5 rounded-r-xl">
      <Quote className="w-5 h-5 text-indigo-400 mb-2" />
      <p className="text-slate-300 italic">{text}</p>
    </blockquote>
  );
}

function ImageBlock({ block }: { block: Block }) {
  const image = block.image;
  if (!image?.url) return null;
  
  const isVideo = image.mimeType?.startsWith('video/') || image.url.match(/\.(mp4|webm|mov)$/i);
  
  if (isVideo) {
    return (
      <figure className="my-6">
        <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden">
          <video
            src={image.url}
            controls
            className="w-full h-full object-contain"
            playsInline
          />
        </div>
        {image.alternativeText && (
          <figcaption className="text-xs text-slate-500 mt-2 text-center">{image.alternativeText}</figcaption>
        )}
      </figure>
    );
  }
  
  return (
    <figure className="my-6">
      <div className="relative bg-slate-950 rounded-xl overflow-hidden">
        <Image
          src={image.url}
          alt={image.alternativeText || ''}
          className="w-full h-auto object-contain max-h-[600px]"
          loading="lazy"
        />
      </div>
      {image.alternativeText && (
        <figcaption className="text-xs text-slate-500 mt-2 text-center">{image.alternativeText}</figcaption>
      )}
    </figure>
  );
}

function GalleryBlock({ block }: { block: Block }) {
  const images = block.content?.images || [];
  if (!images.length) return null;
  
  return (
    <div className="my-6 grid grid-cols-2 sm:grid-cols-3 gap-2">
      {images.map((img: any, i: number) => (
        <div key={i} className="relative aspect-square bg-slate-950 rounded-xl overflow-hidden group">
          <Image
            src={img.url}
            alt={img.alternativeText || ''}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}

function VideoBlock({ block }: { block: Block }) {
  const video = block.video;
  if (!video?.url) return null;
  
  return (
    <figure className="my-6">
      <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden">
        <video
          src={video.url}
          controls
          className="w-full h-full object-contain"
          playsInline
        />
      </div>
    </figure>
  );
}

function CodeBlock({ block }: { block: Block }) {
  const code = block.code || block.children?.map((c) => c.text).join('') || '';
  const language = block.language || 'javascript';
  
  return (
    <div className="my-6 rounded-xl overflow-hidden border border-slate-800">
      <div className="flex items-center justify-between bg-slate-900 px-4 py-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-mono text-slate-400">{language}</span>
        </div>
      </div>
      <pre className="bg-[#0d1528] p-4 overflow-x-auto">
        <code className="text-sm text-slate-300 font-mono whitespace-pre-wrap">{code}</code>
      </pre>
    </div>
  );
}

function ListBlock({ block }: { block: Block }) {
  const items = block.items || [];
  const ordered = block.ordered || false;
  
  if (!items.length) return null;
  
  const ListTag = ordered ? 'ol' : 'ul';
  const listClass = ordered ? 'list-decimal' : 'list-disc';
  
  return (
    <ListTag className={`${listClass} list-inside text-slate-300 my-4 space-y-1`}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ListTag>
  );
}

export default ArticleBlockRenderer;
