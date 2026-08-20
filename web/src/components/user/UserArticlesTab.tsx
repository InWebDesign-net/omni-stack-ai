'use client';

import React, { useState } from 'react';
import { FileText, Eye, Heart, MessageSquare, Settings } from 'lucide-react';
import Image from 'next/image';

interface UserArticlesTabProps {
  articles: any[];
  slug: string;
  t?: any;
  isOwner?: boolean;
  onEditArticle?: (article: any) => void;
}

function ArticleItemCard({
  article,
  isOwner,
  onEditArticle,
}: {
  article: any;
  isOwner?: boolean;
  onEditArticle?: (article: any) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const rawThumb = article.thumbnailUrl || article.thumbnail || article.imageUrl;
  const hasThumb = Boolean(rawThumb && typeof rawThumb === 'string' && rawThumb.trim() !== '' && !imgError);

  return (
    <a
      href={`/article/${article.slug}`}
      className="group relative bg-surface border border-subtle hover:border-purple-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
    >
      <div className="relative aspect-video bg-surface-raised overflow-hidden">
        {hasThumb ? (
          <Image
            src={rawThumb}
            alt={article.title || 'Article'}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-purple-950 via-indigo-950 to-surface flex items-center justify-center">
            <FileText className="w-10 h-10 text-purple-400/40" />
          </div>
        )}

        {isOwner && onEditArticle && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEditArticle(article);
            }}
            title="Artikel bearbeiten"
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-surface/80 backdrop-blur-md text-muted hover:text-purple-400 hover:bg-surface-raised border border-subtle transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
        <h3 className="font-bold text-sm text-primary line-clamp-2 group-hover:text-purple-400 transition-colors">
          {article.title}
        </h3>
        <div className="flex items-center justify-between text-[10px] text-muted pt-2 border-t border-subtle">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-0.5">
              <Eye className="w-3 h-3" />
              {article.viewsCount || 0}
            </span>
            <span className="flex items-center gap-0.5">
              <Heart className="w-3 h-3 text-rose-500/80" />
              {article.likesCount || 0}
            </span>
            <span className="flex items-center gap-0.5">
              <MessageSquare className="w-3 h-3" />
              {article.commentsCount || 0}
            </span>
          </div>
          {isOwner && onEditArticle && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEditArticle(article);
              }}
              title="Artikel bearbeiten"
              className="p-1 rounded text-muted hover:text-purple-400 hover:bg-surface-raised transition-all cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </a>
  );
}

export function UserArticlesTab({ articles, slug, t, isOwner, onEditArticle }: UserArticlesTabProps) {
  if (!articles || articles.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <FileText className="w-12 h-12 mx-auto text-muted" />
        <p className="text-muted">{t?.user?.noArticles || 'Keine Artikel vorhanden'}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {articles.map((article, idx) => (
        <ArticleItemCard
          key={article.documentId || article.id || article.slug || idx}
          article={article}
          isOwner={isOwner}
          onEditArticle={onEditArticle}
        />
      ))}
    </div>
  );
}
