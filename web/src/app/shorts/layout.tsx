import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Omni Shorts – Vertikale Video-Erlebnisse',
  description: 'Entdecke kurze, vertikale Videos und Clips im Omni Network.',
  alternates: {
    canonical: 'https://omni-web.inwebdesign.net/videos',
  },
};

export default function ShortsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
