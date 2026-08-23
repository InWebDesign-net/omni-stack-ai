import type { Metadata } from 'next';
import { resolveLang } from '@/lib/locale-server';
import { localizePath, languageAlternates } from '@/lib/locale';

/**
 * The shorts feed is a way of watching the video catalogue, not a second
 * catalogue: it holds no content of its own, so it keeps naming /videos as its
 * canonical rather than competing with it. Now in the reader's language.
 *
 * This lives in the layout, which means `/shorts/<slug>` inherits it — and that
 * page overrides it with the video's own address, which is what it should do.
 */
export async function generateMetadata(): Promise<Metadata> {
  const lang = await resolveLang();
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://omni-web.inwebdesign.net';
  return {
    title: 'Omni Shorts – Vertikale Video-Erlebnisse',
    description: 'Entdecke kurze, vertikale Videos und Clips im Omni Network.',
    alternates: {
      canonical: `${baseUrl}${localizePath('/videos', lang)}`,
      languages: languageAlternates(baseUrl, '/videos'),
    },
  };
}

export default function ShortsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
