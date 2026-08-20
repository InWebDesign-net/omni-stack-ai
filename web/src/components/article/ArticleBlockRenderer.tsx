'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Image as ImageIcon, Quote, Heading, Film, Eye, Heart } from 'lucide-react';
import Image from 'next/image';

interface ArticleBlockRendererProps {
  blocks: any[];
}

export function ArticleBlockRenderer({ blocks }: ArticleBlockRendererProps) {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return <p className="text-muted italic">Kein Inhalt verfügbar.</p>;
  }

  return (
    <div className="space-y-6">
      {blocks.map((block, index) => (
        <SingleBlock key={block.id || index} block={block} />
      ))}
    </div>
  );
}

function SingleBlock({ block }: { block: any }) {
  const componentType = block.__component || block.type;

  if (componentType === 'shared.headline' || block.type === 'heading') {
    return <HeadingBlock block={block} />;
  }
  if (componentType === 'shared.rich-text' || block.type === 'paragraph') {
    return <RichTextBlock block={block} />;
  }
  if (componentType === 'shared.quote' || block.type === 'quote') {
    return <QuoteBlock block={block} />;
  }
  if (componentType === 'shared.video' || block.type === 'video') {
    return <VideoRelationBlock block={block} />;
  }
  if (componentType === 'shared.image' || block.type === 'image') {
    return <ImageRelationBlock block={block} />;
  }

  return <RichTextBlock block={block} />;
}

function HeadingBlock({ block }: { block: any }) {
  const title = block.title || (Array.isArray(block.children) ? block.children.map((c: any) => c.text).join('') : '');
  const levelStr = String(block.level || 'h2').toLowerCase();
  const subtitle = block.subtitle;

  if (!title) return null;

  if (levelStr === 'h3') {
    return (
      <div className="pt-4 pb-2 space-y-1">
        <h3 className="text-xl font-bold text-primary tracking-tight flex items-center gap-2">
          <span className="w-1.5 h-5 bg-purple-500 rounded-full" />
          <span>{title}</span>
        </h3>
        {subtitle && <p className="text-sm text-muted font-medium pl-3.5">{subtitle}</p>}
      </div>
    );
  }

  if (levelStr === 'h4') {
    return (
      <div className="pt-3 pb-1 space-y-1">
        <h4 className="text-lg font-semibold text-primary">{title}</h4>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
    );
  }

  // Default H2
  return (
    <div className="pt-6 pb-2 space-y-1 border-b border-subtle">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight flex items-center gap-2.5">
        <span className="w-2 h-7 bg-gradient-to-b from-purple-400 to-indigo-600 rounded-full" />
        <span>{title}</span>
      </h2>
      {subtitle && <p className="text-sm text-purple-300/80 font-medium pl-4">{subtitle}</p>}
    </div>
  );
}

function RichTextBlock({ block }: { block: any }) {
  const bodyData = block.body || block.content || block.text;

  // 1. Array of blocks or children format
  if (Array.isArray(bodyData)) {
    return (
      <div className="space-y-3">
        {bodyData.map((node: any, idx: number) => {
          if (node.type === 'paragraph' || node.children) {
            const text = node.children ? node.children.map((c: any) => c.text).join('') : '';
            if (!text.trim()) return null;
            return (
              <p key={idx} className="text-primary text-base leading-relaxed">
                {node.children ? (
                  node.children.map((child: any, i: number) => {
                    if (child.bold && child.italic) return <strong key={i} className="font-bold italic text-primary">{child.text}</strong>;
                    if (child.bold) return <strong key={i} className="font-bold text-primary">{child.text}</strong>;
                    if (child.italic) return <em key={i} className="italic text-primary">{child.text}</em>;
                    if (child.code) return <code key={i} className="bg-surface-raised text-purple-300 px-1.5 py-0.5 rounded text-sm font-mono border border-subtle">{child.text}</code>;
                    return <React.Fragment key={i}>{child.text}</React.Fragment>;
                  })
                ) : (
                  text
                )}
              </p>
            );
          }
          if (typeof node === 'string') {
            return <p key={idx} className="text-primary text-base leading-relaxed">{node}</p>;
          }
          return null;
        })}
      </div>
    );
  }

  // 2. Direct children array on block
  if (Array.isArray(block.children) && block.children.length > 0) {
    return (
      <p className="text-primary text-base leading-relaxed">
        {block.children.map((child: any, i: number) => {
          if (child.bold && child.italic) return <strong key={i} className="font-bold italic text-primary">{child.text}</strong>;
          if (child.bold) return <strong key={i} className="font-bold text-primary">{child.text}</strong>;
          if (child.italic) return <em key={i} className="italic text-primary">{child.text}</em>;
          if (child.code) return <code key={i} className="bg-surface-raised text-purple-300 px-1.5 py-0.5 rounded text-sm font-mono border border-subtle">{child.text}</code>;
          return <React.Fragment key={i}>{child.text}</React.Fragment>;
        })}
      </p>
    );
  }

  // 3. String content (Markdown or HTML string or plain text)
  if (typeof bodyData === 'string' && bodyData.trim().length > 0) {
    const paragraphs = bodyData.split(/\n\s*\n/).filter(Boolean);
    return (
      <div className="space-y-4">
        {paragraphs.map((pText, i) => (
          <p key={i} className="text-primary text-base leading-relaxed">
            {pText}
          </p>
        ))}
      </div>
    );
  }

  return null;
}

function QuoteBlock({ block }: { block: any }) {
  const text = block.quote || (Array.isArray(block.children) ? block.children.map((c: any) => c.text).join('') : block.text || '');
  const author = block.author;

  if (!text) return null;

  return (
    <figure className="my-6 relative bg-gradient-to-r from-purple-950/40 to-surface border-l-4 border-purple-500 rounded-r-2xl p-5 shadow-xl space-y-2 border border-subtle border-l-purple-500">
      <Quote className="w-8 h-8 text-purple-400/30 absolute top-4 right-4" />
      <blockquote className="text-base sm:text-lg text-purple-100 italic leading-relaxed font-serif">
        "{text}"
      </blockquote>
      {author && (
        <figcaption className="text-xs font-semibold text-purple-300 flex items-center gap-2 pt-1">
          <span className="w-4 h-0.5 bg-purple-500/60" />
          <span>{author}</span>
        </figcaption>
      )}
    </figure>
  );
}

function VideoRelationBlock({ block }: { block: any }) {
  const vidObj = block.video;
  const caption = block.caption;

  if (!vidObj) return null;

  const videoData = vidObj.attributes || vidObj;
  const videoUrl = videoData.videoUrl || videoData.url;
  const title = videoData.title || 'Video Block';
  const slug = videoData.slug;
  const thumbnail = videoData.thumbnail || videoData.thumbnailUrl || 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&q=80';
  const creatorName = videoData.creator?.username || videoData.authorName || 'Omni Creator';

  return (
    <figure className="my-6 bg-surface border border-subtle rounded-2xl overflow-hidden shadow-2xl space-y-0">
      {videoUrl ? (
        <div className="relative aspect-video bg-black">
          <video
            src={videoUrl}
            controls
            poster={thumbnail}
            className="w-full h-full object-contain"
            playsInline
          />
        </div>
      ) : (
        <div className="relative aspect-video bg-surface-raised overflow-hidden group">
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6 fill-current ml-1" />
            </div>
          </div>
        </div>
      )}

      <div className="p-4 flex items-center justify-between gap-4 bg-surface-raised">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-bold text-purple-400 uppercase tracking-wider">
            <Film className="w-3.5 h-3.5" />
            <span>Video Content</span>
          </div>
          <h4 className="text-sm font-bold text-primary truncate">{title}</h4>
          <p className="text-xs text-muted truncate">{creatorName}</p>
        </div>

        {slug && (
          <Link
            href={`/video/${slug}`}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shrink-0 transition-colors"
          >
            Video ansehen
          </Link>
        )}
      </div>

      {caption && (
        <figcaption className="text-xs text-muted p-3 bg-surface border-t border-subtle text-center italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function ImageRelationBlock({ block }: { block: any }) {
  const imgObj = block.image;
  const caption = block.caption;

  if (!imgObj) return null;

  const imageData = imgObj.attributes || imgObj;
  const imageUrl = imageData.imageUrl || imageData.thumbnailUrl || imageData.url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80';
  const title = imageData.title || 'Image Block';
  const slug = imageData.slug;
  const creatorName = imageData.creator?.username || imageData.authorName || 'Omni Creator';

  return (
    <figure className="my-6 bg-surface border border-subtle rounded-2xl overflow-hidden shadow-2xl space-y-0">
      <div className="relative bg-surface flex items-center justify-center max-h-[500px]">
        <Image
          src={imageUrl}
          alt={title}
          width={1200}
          height={800}
          className="w-full h-auto max-h-[500px] object-contain"
          loading="lazy"
        />
      </div>

      <div className="p-4 flex items-center justify-between gap-4 bg-surface-raised border-t border-subtle">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-bold text-teal-400 uppercase tracking-wider">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Bild Content</span>
          </div>
          <h4 className="text-sm font-bold text-primary truncate">{title}</h4>
          <p className="text-xs text-muted truncate">{creatorName}</p>
        </div>

        {slug && (
          <Link
            href={`/image/${slug}`}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shrink-0 transition-colors"
          >
            Bild ansehen
          </Link>
        )}
      </div>

      {caption && (
        <figcaption className="text-xs text-muted p-3 bg-surface border-t border-subtle text-center italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export default ArticleBlockRenderer;
