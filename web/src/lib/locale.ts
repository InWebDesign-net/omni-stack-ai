/**
 * The language lives in the URL.
 *
 * It used to live only in a cookie, which meant German and English shared one
 * address. A search engine sends no cookie, so it only ever saw German — the
 * English half of the site had no URL at all and could not be indexed. Two
 * languages need two addresses.
 *
 * German is the default and stays unprefixed, so every link already shared or
 * indexed keeps working and keeps meaning the same page. English lives under
 * `/en`.
 *
 * This module is imported from client components, so it must not pull in
 * `next/headers` — the server-side lookup lives in `locale-server.ts`.
 */

export const LOCALES = ['de', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'de';

/** Set by the proxy on the rewritten request so the server knows what to render. */
export const LOCALE_HEADER = 'x-omni-lang';

export function isLocale(value: unknown): value is Locale {
  return value === 'de' || value === 'en';
}

/**
 * Split `/en/videos` into the locale and the route the app actually has.
 *
 * Only a whole first segment counts: `/energy` is not English, and `/en` alone
 * is the English home page.
 */
export function splitLocale(pathname: string): { lang: Locale; path: string } {
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    return { lang: 'en', path: pathname.slice(3) || '/' };
  }
  return { lang: DEFAULT_LOCALE, path: pathname || '/' };
}

/**
 * The address of `path` in `lang`. Pass an app path (`/videos`), not a full URL.
 *
 * Anything that is not an in-app absolute path — external links, anchors,
 * `mailto:` — is returned untouched, so this is safe to apply blindly.
 */
export function localizePath(path: string, lang: Locale): string {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    return path;
  }
  const { path: bare } = splitLocale(path);
  if (lang === DEFAULT_LOCALE) return bare;
  return bare === '/' ? '/en' : `/en${bare}`;
}

/**
 * Both addresses of one page, for `hreflang` and for the sitemap.
 *
 * `x-default` points at German: it is what a reader with no matching language
 * preference gets, and saying so is better than letting a crawler guess.
 */
export function alternateUrls(baseUrl: string, path: string) {
  const { path: bare } = splitLocale(path);
  return {
    de: `${baseUrl}${localizePath(bare, 'de')}`,
    en: `${baseUrl}${localizePath(bare, 'en')}`,
  };
}

export function languageAlternates(baseUrl: string, path: string) {
  const urls = alternateUrls(baseUrl, path);
  return {
    de: urls.de,
    en: urls.en,
    'x-default': urls.de,
  };
}
