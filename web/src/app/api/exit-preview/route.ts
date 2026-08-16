import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Sanitizes and validates a redirect parameter to prevent Open Redirect vulnerabilities.
 * Allows relative internal URLs (e.g. /videos, /images?page=1) while rejecting
 * absolute URLs (https://evil.com), protocol-relative URLs (//evil.com), or invalid schemes.
 */
function getSafeRedirectUrl(rawUrl: string | null): string {
  if (!rawUrl) return '/';

  const trimmed = rawUrl.trim();

  // Must start with '/' and NOT start with '//' or '/\'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return '/';
  }

  try {
    const parsed = new URL(trimmed, 'http://localhost');
    if (parsed.origin !== 'http://localhost') {
      return '/';
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/';
  }
}

export async function GET(request: Request) {
  const draft = await draftMode();
  draft.disable();

  const { searchParams } = new URL(request.url);
  const redirectUrl = getSafeRedirectUrl(searchParams.get('redirect'));

  redirect(redirectUrl);
}
