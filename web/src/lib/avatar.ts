/**
 * Avatar fallback, in one place.
 *
 * Until now 46 call sites each fell back to the same hardcoded Unsplash
 * portrait, and registration wrote that URL into the user record outright — so
 * clearing an avatar did not reveal a neutral placeholder, it revealed a
 * stranger's face. A photograph of a specific person standing in for "no
 * picture" is also a poor default in itself.
 *
 * The placeholder is a local SVG, so it needs no external request and cannot
 * break when a third-party host changes.
 */

export const AVATAR_PLACEHOLDER = '/avatar-placeholder.svg';

/** The old hardcoded portraits, still present in seeded and legacy user records. */
const LEGACY_AVATAR_FALLBACKS = [
  'photo-1534528741775-53994a69daeb',
  'photo-1535713875002-d1d0cf377fde',
];

/**
 * Returns a usable avatar URL, or the placeholder.
 *
 * Legacy fallback URLs are treated as "no avatar": they were never a choice the
 * user made, so continuing to show them after this change would preserve exactly
 * the thing being fixed.
 */
export function isLegacyAvatar(url?: string | null): boolean {
  const trimmed = typeof url === 'string' ? url.trim() : '';
  return LEGACY_AVATAR_FALLBACKS.some((id) => trimmed.includes(id));
}

export function resolveAvatarUrl(url?: string | null): string {
  const trimmed = typeof url === 'string' ? url.trim() : '';
  if (!trimmed) return AVATAR_PLACEHOLDER;
  if (isLegacyAvatar(trimmed)) return AVATAR_PLACEHOLDER;
  return trimmed;
}

