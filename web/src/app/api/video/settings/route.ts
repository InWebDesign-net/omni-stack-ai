import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function strapiBase() {
  return process.env.STRAPI_URL || 'http://127.0.0.1:1337';
}

function buildHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  // Forward the user JWT so Strapi applies the authenticated role's permissions
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
  } else if (process.env.STRAPI_API_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
  }
  return headers;
}

// GET /api/video/settings?documentId=...  -> load both locales (de + en)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');
    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }
    const targetUrl = `${strapiBase()}/api/videos?filters[documentId][$eq]=${encodeURIComponent(
      documentId
    )}&locale=*&populate=creator`;

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: buildHeaders(req),
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ data: [] }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error loading video settings:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// PUT /api/video/settings  -> { documentId, localeUpdates: [{locale, data}], visibility }
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { documentId, localeUpdates, visibility } = body;

    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }

    const headers = buildHeaders(req);

    // Update localized fields per locale
    if (Array.isArray(localeUpdates)) {
      for (const { locale, data } of localeUpdates) {
        const res = await fetch(`${strapiBase()}/api/videos/${documentId}?locale=${locale}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ data }),
        });
        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json(
            { error: `update ${locale} failed`, detail: errText },
            { status: res.status }
          );
        }
      }
    }

    // Update global visibility (non-localized)
    if (typeof visibility === 'string') {
      const res = await fetch(`${strapiBase()}/api/videos/${documentId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ data: { visibility } }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { error: 'update visibility failed', detail: errText },
          { status: res.status }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving video settings:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
