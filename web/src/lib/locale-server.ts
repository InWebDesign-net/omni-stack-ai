import { headers, cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_HEADER, isLocale, type Locale } from './locale';

/**
 * The language this request renders in, decided on the server.
 *
 * The URL wins: `/en/...` is English, everything else is German. That is the
 * whole point of putting the language in the path — one address, one language,
 * no ambiguity for a crawler or for anyone sharing a link.
 *
 * The cookie is consulted only when the proxy did not run, which is the case
 * for routes excluded from its matcher. It is a fallback, never an override:
 * if the cookie could win, a bare URL would render English for one reader and
 * German for another, and the canonical tag would be a lie for one of them.
 */
export async function resolveLang(): Promise<Locale> {
  const fromHeader = (await headers()).get(LOCALE_HEADER);
  if (isLocale(fromHeader)) return fromHeader;

  const fromCookie = (await cookies()).get('omni_lang')?.value;
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE;
}

/**
 * The path the reader actually asked for, without the locale prefix.
 *
 * The proxy rewrites `/en/videos` to `/videos`, so a page asking Next for its
 * own pathname sees the rewritten one. Canonical and hreflang need the original.
 */
export async function resolvePathname(): Promise<string> {
  const h = await headers();
  return h.get('x-omni-path') || '/';
}
