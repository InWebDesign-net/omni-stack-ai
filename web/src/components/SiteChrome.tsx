'use client';

import { usePathname } from 'next/navigation';
import Footer from '@/components/Footer';

/**
 * Renders the site footer everywhere except on full-viewport routes.
 *
 * `/shorts` is `h-screen w-screen overflow-hidden` with a snap-scrolling feed
 * inside it. A footer appended below that makes the document taller than the
 * viewport, so the page scrolls behind the swipe area instead of the feed
 * scrolling within it. Any future full-bleed route belongs in this list.
 */
const FULL_VIEWPORT_ROUTES = ['/shorts'];

export function SiteChrome() {
  const pathname = usePathname() || '';
  const isFullViewport = FULL_VIEWPORT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isFullViewport) return null;
  return <Footer />;
}
