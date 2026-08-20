import { getCurrentUserFromCookies } from '@/lib/auth-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function strapiBase() {
  return process.env.STRAPI_URL || 'http://127.0.0.1:1337';
}

/**
 * Builds the upstream Strapi headers.
 *
 * `requireUserAuth` must be honoured BEFORE the STRAPI_API_TOKEN fallback. The
 * fallback attaches an admin-scoped token, so checking it afterwards let every
 * anonymous mutation through: the caller got the master token and the guard was
 * never reached. Returns null when a caller without any session asks for a
 * mutation, which the handlers translate into 401.
 */
async function buildHeaders(req: Request, requireUserAuth = false): Promise<Record<string, string> | null> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader !== 'Bearer null' && authHeader !== 'Bearer undefined') {
    headers['Authorization'] = authHeader;
    return headers;
  }

  if (requireUserAuth) {
    const { user } = await getCurrentUserFromCookies();
    if (!user) {
      return null;
    }
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

// GET /api/image/settings?documentId=... -> load both locales (de + en)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');
    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }
    const headers = await buildHeaders(req, false);
    if (!headers) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetUrl = `${strapiBase()}/api/images?filters[documentId][$eq]=${encodeURIComponent(
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
    console.error('[image-settings-proxy] GET error', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// PUT /api/image/settings - Update image metadata for all locales
export async function PUT(req: Request) {
  try {
    const headers = await buildHeaders(req, true);
    if (!headers) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { documentId, localeUpdates, visibility, title, summary, tags } = body;

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    // Handle localized updates (de + en) if provided
    if (Array.isArray(localeUpdates)) {
      for (const { locale, data } of localeUpdates) {
        const res = await fetch(`${strapiBase()}/api/images/${documentId}?locale=${locale}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ data }),
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error(`[image-settings-proxy] update ${locale} failed:`, errText);
        }
      }
    } else if (title !== undefined) {
      // Fallback single locale update
      const res = await fetch(`${strapiBase()}/api/images/${documentId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ data: { title, summary, tags, visibility } }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: errText }, { status: res.status });
      }
    }

    // Update global visibility across all localizations (de + en)
    if (typeof visibility === 'string') {
      for (const locale of ['de', 'en']) {
        await fetch(`${strapiBase()}/api/images/${documentId}?locale=${locale}&status=published`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ data: { visibility } }),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[image-settings-proxy] PUT error', error);
    return NextResponse.json(
      { error: error.message || 'Image Settings Proxy Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/image/settings - Delete image (soft or hard)
export async function DELETE(req: Request) {
  try {
    const headers = await buildHeaders(req, true);
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
      // Permanent delete - remove document completely from Strapi
      const res = await fetch(`${strapiBase()}/api/images/${documentId}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[image-settings-proxy] Hard DELETE failed:', errText);
        return NextResponse.json(
          { error: 'Failed to delete image permanently' },
          { status: res.status }
        );
      }
    } else {
      // Soft delete - set visibility to private for all localizations
      for (const locale of ['de', 'en']) {
        await fetch(`${strapiBase()}/api/images/${documentId}?locale=${locale}&status=published`, {
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
    console.error('[image-settings-proxy] DELETE error', error);
    return NextResponse.json(
      { error: error.message || 'Image Settings Proxy Error' },
      { status: 500 }
    );
  }
}
