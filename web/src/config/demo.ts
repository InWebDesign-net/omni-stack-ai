import { AVATAR_PLACEHOLDER } from '@/lib/avatar';
/**
 * Demo configuration for the Omni Stack AI preview.
 *
 * All hardcoded demo creators, users and UI presets live here so the core
 * components stay clean and customer projects can override this file easily.
 */

export const DEFAULT_AVATAR_URL = AVATAR_PLACEHOLDER;
export const DEFAULT_COVER_URL = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80';

export interface DemoCreator {
  id: string;
  username: string;
  handle: string;
  avatarUrl: string;
  bio: string;
}

export interface DemoUserPreset {
  label: string;
  sub: string;
  identifier: string;
  password: string;
}

export const DEMO_CREATORS: DemoCreator[] = [
  {
    id: '10',
    username: 'Astro-Wissen Magazin',
    handle: 'astro',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    bio: 'Faszination Astronomie, Astrophysik & Weltraum-Dokumentationen.',
  },
  {
    id: '1',
    username: 'Database Guru',
    handle: 'demotech',
    avatarUrl: AVATAR_PLACEHOLDER,
    bio: 'Tech, Datenbanken & AI Engineering.',
  },
  {
    id: '2',
    username: 'Culinary Masterclass',
    handle: 'demogourmet',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
    bio: 'Italienische Küche, feine Rezepte & Kulinarik.',
  },
  {
    id: '3',
    username: 'Green Planet Doku',
    handle: 'greenplanet',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
    bio: 'Naturdokumentationen & Artenschutz.',
  },
  {
    id: '4',
    username: 'FinanzKompass',
    handle: 'finanzkompass',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    bio: 'Finanzwissen & Vermögensaufbau.',
  },
  {
    id: '5',
    username: 'Omni Architect',
    handle: 'omniarchitect',
    avatarUrl: AVATAR_PLACEHOLDER,
    bio: 'Architektur, Design & digitale Räume.',
  },
  {
    id: '6',
    username: 'Familie & Tiere',
    handle: 'catmania',
    avatarUrl: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=150&q=80',
    bio: 'Tiere, Familie & lustige Momente.',
  },
];

export const DEFAULT_SUBSCRIBED_HANDLES = ['@demotech', '@astro'];

export const DEMO_USER_PRESETS: DemoUserPreset[] = [
  {
    label: '👨‍💻 DemoTechUser',
    sub: 'Tech & Science Fokus',
    identifier: 'demotech@inwebdesign.net',
    password: 'DemoUser2026!',
  },
  {
    label: '🍳 DemoGourmetUser',
    sub: 'Kochen & Natur Fokus',
    identifier: 'demogourmet@inwebdesign.net',
    password: 'DemoUser2026!',
  },
];

/** Look up a demo creator by clean handle (without @). */
export function getDemoCreatorByHandle(handle: string): DemoCreator | undefined {
  const clean = handle.replace(/^@/, '').toLowerCase();
  return DEMO_CREATORS.find((c) => c.handle === clean);
}
