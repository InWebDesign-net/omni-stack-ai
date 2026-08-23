'use client';

import React from 'react';
import NextLink from 'next/link';
import { useApp } from '@/context/AppContext';
import { localizePath } from '@/lib/locale';

type Props = React.ComponentProps<typeof NextLink>;

/**
 * `next/link` that keeps the reader in the language they are reading.
 *
 * Both languages have their own address now, so a bare `/videos` on an English
 * page is a link out of English — the reader clicks a card and the site
 * silently switches back to German. Prefixing here rather than at 57 call
 * sites means a link cannot be forgotten, and the ones that must not be
 * touched (external URLs, anchors, `mailto:`) are left alone by `localizePath`.
 *
 * Drop-in: same props as `next/link`, imported under the same name.
 */
export default function LocaleLink({ href, ...rest }: Props) {
  const { lang } = useApp();

  const localized =
    typeof href === 'string'
      ? localizePath(href, lang)
      : href && typeof href === 'object' && typeof href.pathname === 'string'
        ? { ...href, pathname: localizePath(href.pathname, lang) }
        : href;

  return <NextLink href={localized} {...rest} />;
}
