import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function strapiBase() {
  return process.env.STRAPI_URL || 'http://127.0.0.1:1337';
}

function buildHeaders(req: Request, requireUserAuth = false): Record<string, string> | null {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader !== 'Bearer null' && authHeader !== 'Bearer undefined') {
    headers['Authorization'] = authHeader;
    return headers;
  }

  const token = process.env.STRAPI_API_TOKEN || process.env.STRAPI_TOKEN;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  if (requireUserAuth) {
    return null;
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
    const headers = buildHeaders(req, false);
    if (!headers) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetUrl = `${strapiBase()}/api/videos?filters[documentId][$eq]=${encodeURIComponent(
      documentId
    )}&locale=*&populate=creator&status=draft`;

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers,
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
    const headers = buildHeaders(req, true);
    if (!headers) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { documentId, localeUpdates, visibility } = body;

    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }

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
          console.error(`update ${locale} failed:`, errText);
        }
      }
    }

    // Update global visibility across all localizations (de + en) and publish changes
    if (typeof visibility === 'string') {
      for (const locale of ['de', 'en']) {
        await fetch(`${strapiBase()}/api/videos/${documentId}?locale=${locale}&status=published`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ data: { visibility } }),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving video settings:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// DELETE /api/video/settings - Delete video (soft or hard)
export async function DELETE(req: Request) {
  try {
    const headers = buildHeaders(req, true);
    if (!headers) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');
    const hardDelete = searchParams.get('hard') === 'true';

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    if (hardDelete) {
      // Permanent delete
      const res = await fetch(`${strapiBase()}/api/videos/${documentId}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[video-settings-proxy] Hard DELETE failed:', errText);
        return NextResponse.json(
          { error: 'Failed to delete video permanently' },
          { status: res.status }
        );
      }
    } else {
      // Soft delete - set visibility to private
      for (const locale of ['de', 'en']) {
        await fetch(`${strapiBase()}/api/videos/${documentId}?locale=${locale}&status=published`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            data: { visibility: 'private' },
          }),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[video-settings-proxy] DELETE error', error);
    return NextResponse.json(
      { error: error.message || 'Video Settings Proxy Error' },
      { status: 500 }
    );
  }
}
