'use client';

import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { localizePath } from '@/lib/locale';

/**
 * `useRouter` that keeps programmatic navigation in the current language.
 *
 * The counterpart to LocaleLink: a `router.push('/videos')` from an English
 * page would drop the reader back into German just as a bare `<Link>` would.
 * Only `push` and `replace` take a path, so only those are wrapped; everything
 * else on the router is passed through unchanged.
 */
export function useLocaleRouter() {
  const router = useRouter();
  const { lang } = useApp();

  return {
    ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) =>
      router.push(localizePath(href, lang), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) =>
      router.replace(localizePath(href, lang), options),
  };
}
