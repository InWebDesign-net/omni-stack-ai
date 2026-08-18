import { NextResponse } from 'next/server';

const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

// POST /api/article/settings - Create new article
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { title, slug, summary, content, thumbnail, tags, visibility, lang } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'title and slug are required' }, { status: 400 });
    }

    const res = await fetch(`${STRAPI_URL}/api/articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        data: {
          title,
          slug,
          summary,
          content,
          thumbnail,
          tags: tags || [],
          visibility: visibility || 'public',
          locale: lang || 'de',
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

    return NextResponse.json({ success: true, article: data.data });
  } catch (error: any) {
    console.error('[article-settings-proxy] POST error', error);
    return NextResponse.json(
      { error: error.message || 'Article Settings Proxy Error' },
      { status: 500 }
    );
  }
}

// PUT /api/article/settings - Update existing article
export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { documentId, title, summary, content, thumbnail, tags, visibility } = body;

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    const res = await fetch(`${STRAPI_URL}/api/articles/${documentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        data: {
          title,
          summary,
          content,
          thumbnail,
          tags,
          visibility,
        },
      }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Failed to update article' },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, article: data.data });
  } catch (error: any) {
    console.error('[article-settings-proxy] PUT error', error);
    return NextResponse.json(
      { error: error.message || 'Article Settings Proxy Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/article/settings - Delete article
export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    const res = await fetch(`${STRAPI_URL}/api/articles/${documentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!res.ok) {
      const data = await res.json();
      return NextResponse.json(
        { error: data.error?.message || 'Failed to delete article' },
        { status: res.status }
      );
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
