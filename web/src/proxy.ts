import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { splitLocale, LOCALE_HEADER, DEFAULT_LOCALE } from '@/lib/locale';

/**
 * Turns `/en/<path>` into `<path>` plus a header saying which language to render.
 *
 * The app has one set of routes, not one per language. Duplicating eleven
 * routes into `[lang]` folders would have meant every page, every layout and
 * every link learning about a segment that only ever holds two values. A
 * rewrite keeps the routes as they are and hands the answer to the server as a
 * request header.
 *
 * Named `proxy`, not `middleware`: the `middleware` convention is deprecated in
 * this version of Next and the file is expected at `src/proxy.ts`.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { lang, path } = splitLocale(pathname);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, lang);
  // The rewritten request no longer carries the prefix, but canonical tags and
  // hreflang have to describe the address the reader actually visited.
  requestHeaders.set('x-omni-path', pathname);

  if (lang === DEFAULT_LOCALE) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // `clone()` keeps the query string; only the pathname changes.
  const url = request.nextUrl.clone();
  url.pathname = path;
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export const config = {
  /*
   * Everything except the things that must not be touched: the BFF routes under
   * /api, Next's own assets, and the media tree. Without a matcher this runs on
   * every static file too, which is a cost paid on every image request for no
   * benefit — and a rewrite bug there would break CSS rather than a page.
   */
  matcher: ['/((?!api|_next/static|_next/image|media|demo-media|favicon.ico|.*\\.[\\w]+$).*)'],
};
