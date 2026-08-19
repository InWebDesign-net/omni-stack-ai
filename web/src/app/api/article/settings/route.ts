import { NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth-server';

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

// GET /api/article/settings?documentId=... -> load both locales (de + en)
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

    const targetUrl = `${strapiBase()}/api/articles?filters[documentId][$eq]=${encodeURIComponent(
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
    console.error('Error loading article settings:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// POST /api/article/settings - Create new article
export async function POST(req: Request) {
  try {
    const headers = buildHeaders(req, true);
    if (!headers) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { user } = await getCurrentUserFromCookies();
    const body = await req.json();
    const { title, slug, summary, blocks, thumbnail, tags, visibility, lang } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'title and slug are required' }, { status: 400 });
    }

    const res = await fetch(`${strapiBase()}/api/articles`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: {
          title,
          slug,
          summary,
          blocks,
          thumbnail,
          tags: tags || [],
          visibility: visibility || 'private',
          locale: lang || 'de',
          ...(user?.id ? { creator: user.id } : {}),
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Failed to create article' },
        { status: res.status }
      );
    }

    const createdArticle = data.data;

    // Create secondary localization (en/de) so title is available in both languages
    if (createdArticle?.documentId) {
      const targetLocale = (lang || 'de') === 'de' ? 'en' : 'de';
      try {
        await fetch(`${strapiBase()}/api/articles/${createdArticle.documentId}/localizations`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            data: {
              title,
              slug,
              visibility: visibility || 'private',
              locale: targetLocale,
            },
          }),
        });
      } catch (locErr) {
        console.warn('Failed to create secondary localization for article:', locErr);
      }
    }

    return NextResponse.json({ success: true, article: createdArticle });
  } catch (error: any) {
    console.error('[article-settings-proxy] POST error', error);
    return NextResponse.json(
      { error: error.message || 'Article Settings Proxy Error' },
      { status: 500 }
    );
  }
}

// PUT /api/article/settings -> { documentId, localeUpdates: [{locale, data}], visibility }
export async function PUT(req: Request) {
  try {
    const headers = buildHeaders(req, true);
    if (!headers) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { documentId, localeUpdates, visibility } = body;

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    // Update localized fields per locale
    if (Array.isArray(localeUpdates)) {
      for (const { locale, data } of localeUpdates) {
        const updateData = { ...data };
        if (!updateData.slug && updateData.title) {
          updateData.slug = updateData.title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9äöüß]+/g, '-')
            .replace(/ä/g, 'ae')
            .replace(/ö/g, 'oe')
            .replace(/ü/g, 'ue')
            .replace(/ß/g, 'ss')
            .replace(/^-+|-+$/g, '') || `artikel-${Date.now()}`;
        }

        const res = await fetch(`${strapiBase()}/api/articles/${documentId}?locale=${locale}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ data: updateData }),
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
        await fetch(`${strapiBase()}/api/articles/${documentId}?locale=${locale}&status=published`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ data: { visibility } }),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[article-settings-proxy] PUT error', error);
    return NextResponse.json(
      { error: error.message || 'Article Settings Proxy Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/article/settings - Delete article (soft or hard)
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
      const res = await fetch(`${strapiBase()}/api/articles/${documentId}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[article-settings-proxy] Hard DELETE failed:', errText);
        return NextResponse.json(
          { error: 'Failed to delete article permanently' },
          { status: res.status }
        );
      }
    } else {
      // Soft delete - set visibility to private
      for (const locale of ['de', 'en']) {
        await fetch(`${strapiBase()}/api/articles/${documentId}?locale=${locale}&status=published`, {
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
    console.error('[article-settings-proxy] DELETE error', error);
    return NextResponse.json(
      { error: error.message || 'Article Settings Proxy Error' },
      { status: 500 }
    );
  }
}
