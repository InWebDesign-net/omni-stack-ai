'use client';

import React from 'react';
import { FileText, Eye, Heart, MessageSquare } from 'lucide-react';

interface UserArticlesTabProps {
  articles: any[];
  slug: string;
  t?: any;
}

export function UserArticlesTab({ articles, slug, t }: UserArticlesTabProps) {
  if (!articles || articles.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <FileText className="w-12 h-12 mx-auto text-slate-600" />
        <p className="text-slate-400">{t?.user?.noArticles || 'Keine Artikel vorhanden'}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {articles.map((article) => (
        <a
          key={article.documentId || article.id}
          href={`/article/${article.slug}`}
          className="group relative bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
        >
          <div className="relative aspect-video bg-slate-950 overflow-hidden">
            {article.thumbnail ? (
              <img
                src={article.thumbnail}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-purple-950 via-indigo-950 to-slate-900 flex items-center justify-center">
                <FileText className="w-10 h-10 text-indigo-400/40" />
              </div>
            )}
          </div>
          <div className="p-4 space-y-2">
            <h3 className="font-bold text-sm text-white line-clamp-2 group-hover:text-indigo-300 transition-colors">
              {article.title}
            </h3>
            <div className="flex items-center gap-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-0.5">
                <Eye className="w-3 h-3" />
                {article.viewsCount || 0}
              </span>
              <span className="flex items-center gap-0.5">
                <Heart className="w-3 h-3" />
                {article.likesCount || 0}
              </span>
              <span className="flex items-center gap-0.5">
                <MessageSquare className="w-3 h-3" />
                {article.commentsCount || 0}
              </span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
