import { NextResponse, type NextRequest } from 'next/server';

const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

/**
 * The banner's text, categories and storage mapping, per language.
 *
 * Proxied rather than fetched from the browser so the CMS host stays private,
 * and cached for a minute: this is the same answer for every visitor and it renders
 * on every page, so a per-visit round trip to Strapi would be pure overhead.
 */
export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get('locale') === 'en' ? 'en' : 'de';

  try {
    const res = await fetch(
      `${STRAPI_URL}/api/cookie-banner?locale=${encodeURIComponent(String(locale))}&populate=*`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok) {
      // A banner that cannot be loaded must not block the page. Answering
      // "disabled" keeps the site usable; the gate still refuses everything
      // non-essential, so nothing is stored while the banner is missing.
      return NextResponse.json({ enabled: false }, { status: 200 });
    }

    const json = await res.json();
    return NextResponse.json(json.data || { enabled: false });
  } catch {
    return NextResponse.json({ enabled: false }, { status: 200 });
  }
}
