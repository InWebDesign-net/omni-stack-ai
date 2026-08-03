import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Omni - Hyper-Personalized Video Network',
  description: 'Next-Gen Video Social Platform powered by Strapi, Next.js & Ollama AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#0b1326] text-[#dae2fd] min-h-screen selection:bg-[#8083ff] selection:text-white">
        {children}
      </body>
    </html>
  );
}
