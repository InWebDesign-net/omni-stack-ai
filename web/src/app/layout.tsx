import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OmniStack AI - Hyper-Personalized Feed Assembly',
  description: 'Next-Gen Social Network architecture with Strapi, Next.js, Turborepo, PM2 & Ollama AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="dark">
      <body className="antialiased bg-[#090a0f] text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
