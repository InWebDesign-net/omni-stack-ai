import { NextResponse } from 'next/server';
import { CONTENT_KINDS, isContentKind } from '@omni/shared';
import { getCurrentUserFromCookies } from '@/lib/auth-server';

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

export async function GET(req: Request, { params }: { params: Promise<{ kind: string; action: string }> }) {
  try {
    const { kind, action } = await params;
    if (!isContentKind(kind)) {
      return new NextResponse('Not found', { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const plural = CONTENT_KINDS[kind].plural;

    if (action === 'list') {
      const targetUrl = `${strapiBase()}/api/${plural}/filtered?${searchParams.toString()}`;
      const headers = await buildHeaders(req, false) || { 'Content-Type': 'application/json' };

      const res = await fetch(targetUrl, { method: 'GET', headers, cache: 'no-store' });
      if (!res.ok) {
        return NextResponse.json(
          { data: [], meta: { pagination: { total: 0, page: 1, pageSize: 24, pageCount: 0 } } },
          { status: res.status }
        );
      }
      return NextResponse.json(await res.json());
    }

    if (action === 'tags') {
      const targetUrl = `${strapiBase()}/api/${plural}/tags?${searchParams.toString()}`;
      const headers = await buildHeaders(req, false) || { 'Content-Type': 'application/json' };

      const res = await fetch(targetUrl, { method: 'GET', headers, cache: 'no-store' });
      if (!res.ok) {
        return NextResponse.json({ data: [] }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json(data?.data || data);
    }

    if (action === 'settings') {
      const documentId = searchParams.get('documentId');
      if (!documentId) {
        return NextResponse.json({ error: 'documentId required' }, { status: 400 });
      }
      const headers = await buildHeaders(req, false);
      if (!headers) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const targetUrl = `${strapiBase()}/api/${plural}?filters[documentId][$eq]=${encodeURIComponent(
        documentId
      )}&locale=*&populate=creator&status=draft`;

      const res = await fetch(targetUrl, { method: 'GET', headers, cache: 'no-store' });
      if (!res.ok) {
        return NextResponse.json({ data: [] }, { status: res.status });
      }
      return NextResponse.json(await res.json());
    }

    return new NextResponse('Not found', { status: 404 });
  } catch (error: any) {
    console.error(`[content-api] GET error`, error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ kind: string; action: string }> }) {
  try {
    const { kind, action } = await params;
    if (!isContentKind(kind) || action !== 'settings') {
      return new NextResponse('Not found', { status: 404 });
    }
    const plural = CONTENT_KINDS[kind].plural;

    const headers = await buildHeaders(req, true);
    if (!headers) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { user } = await getCurrentUserFromCookies();
    const body = await req.json();
    const { title, slug, summary, blocks, thumbnail, tags, visibility, lang } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'title and slug are required' }, { status: 400 });
    }

    const res = await fetch(`${strapiBase()}/api/${plural}`, {
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
        { error: data.error?.message || `Failed to create ${kind}` },
        { status: res.status }
      );
    }

    const createdItem = data.data;

    if (createdItem?.documentId) {
      const targetLocale = (lang || 'de') === 'de' ? 'en' : 'de';
      try {
        await fetch(`${strapiBase()}/api/${plural}/${createdItem.documentId}/localizations`, {
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
        console.warn(`Failed to create secondary localization for ${kind}:`, locErr);
      }
    }

    return NextResponse.json({ success: true, [kind]: createdItem, article: kind === 'article' ? createdItem : undefined });
  } catch (error: any) {
    console.error(`[content-api] POST error`, error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ kind: string; action: string }> }) {
  try {
    const { kind, action } = await params;
    if (!isContentKind(kind) || action !== 'settings') {
      return new NextResponse('Not found', { status: 404 });
    }
    const plural = CONTENT_KINDS[kind].plural;

    const headers = await buildHeaders(req, true);
    if (!headers) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { documentId, localeUpdates, visibility, title, summary, tags } = body;

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    if (Array.isArray(localeUpdates)) {
      for (const { locale, data } of localeUpdates) {
        const updateData = { ...data };
        if (kind === 'article' && !updateData.slug && updateData.title) {
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

        const res = await fetch(`${strapiBase()}/api/${plural}/${documentId}?locale=${locale}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ data: updateData }),
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error(`update ${locale} failed:`, errText);
        }
      }
    } else if (title !== undefined) {
      // Fallback single locale update (used by image historically)
      const res = await fetch(`${strapiBase()}/api/${plural}/${documentId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ data: { title, summary, tags, visibility } }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: errText }, { status: res.status });
      }
    }

    if (typeof visibility === 'string') {
      for (const locale of ['de', 'en']) {
        await fetch(`${strapiBase()}/api/${plural}/${documentId}?locale=${locale}&status=published`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ data: { visibility } }),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[content-api] PUT error`, error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ kind: string; action: string }> }) {
  try {
    const { kind, action } = await params;
    if (!isContentKind(kind) || action !== 'settings') {
      return new NextResponse('Not found', { status: 404 });
    }
    const plural = CONTENT_KINDS[kind].plural;

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
      const res = await fetch(`${strapiBase()}/api/${plural}/${documentId}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[content-api] Hard DELETE failed:`, errText);
        return NextResponse.json(
          { error: `Failed to delete ${kind} permanently` },
          { status: res.status }
        );
      }
    } else {
      for (const locale of ['de', 'en']) {
        await fetch(`${strapiBase()}/api/${plural}/${documentId}?locale=${locale}&status=published`, {
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
    console.error(`[content-api] DELETE error`, error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
