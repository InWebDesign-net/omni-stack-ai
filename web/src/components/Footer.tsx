'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink, Film, BookOpen, Image as ImageIcon, Flame } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { OmniLogo } from '@/components/Header';

export default function Footer() {
  const pathname = usePathname();
  const { t } = useApp();

  // /shorts is a full-viewport, vertically locked viewer — suppress site-wide footer there
  if (pathname?.startsWith('/shorts')) {
    return null;
  }

  const footerText = t.footer || {
    tagline: 'Omni – Hyper-Personalisiertes KI Mediennetzwerk',
    by: 'Entwickelt von',
    inwebdesign: 'InWebDesign',
    rights: '© 2026 InWebDesign. Alle Rechte vorbehalten.',
    videos: 'Videos',
    articles: 'Artikel',
    images: 'Bilder',
    shorts: 'Shorts',
  };

  return (
    <footer className="w-full border-t border-subtle bg-surface text-primary py-8 sm:py-10 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-content mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand & Tagline */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <Link href="/" className="flex items-center gap-2.5 group">
            <OmniLogo size={24} />
            <span className="font-extrabold text-base tracking-tight text-primary">Omni</span>
          </Link>
          <span className="hidden sm:inline text-faint">•</span>
          <p className="text-xs text-muted">
            {footerText.tagline || 'Omni – Hyper-Personalisiertes KI Mediennetzwerk'}
          </p>
        </div>

        {/* Navigation Quicklinks */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-muted">
          <Link
            href="/videos"
            className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors"
          >
            <Film className="w-3.5 h-3.5 text-indigo-400" />
            <span>{footerText.videos || 'Videos'}</span>
          </Link>
          <Link
            href="/articles"
            className="flex items-center gap-1.5 hover:text-purple-400 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span>{footerText.articles || 'Artikel'}</span>
          </Link>
          <Link
            href="/images"
            className="flex items-center gap-1.5 hover:text-teal-400 transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
            <span>{footerText.images || 'Bilder'}</span>
          </Link>
          <Link
            href="/shorts"
            className="flex items-center gap-1.5 hover:text-amber-400 transition-colors"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>{footerText.shorts || 'Shorts'}</span>
          </Link>
        </div>

        {/* InWebDesign Backlink & Copyright */}
        <div className="flex flex-col sm:flex-row items-center gap-2 text-xs text-faint font-mono text-center md:text-right">
          <span>{footerText.rights || '© 2026 InWebDesign. Alle Rechte vorbehalten.'}</span>
          <span className="hidden sm:inline">•</span>
          <a
            href="https://inwebdesign.net"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors group"
          >
            <span>{footerText.by || 'Entwickelt von'} {footerText.inwebdesign || 'InWebDesign'}</span>
            <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </footer>
  );
}
