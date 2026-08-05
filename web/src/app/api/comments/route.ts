import { NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  try {
    let endpoint = `${STRAPI_URL}/api/comments?sort=createdAt:desc`;
    if (slug) {
      endpoint = `${STRAPI_URL}/api/comments?filters[feedSlug][$eq]=${encodeURIComponent(slug)}&sort=createdAt:desc`;
    }

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, data: [] }, { status: res.status });
    }

    const json = await res.json();
    return NextResponse.json({ success: true, data: json.data || [] });
  } catch (error: any) {
    console.error('Error fetching comments from Strapi:', error);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { feedSlug, text, authorName, authorHandle, authorAvatar } = body;

    if (!feedSlug || !text) {
      return NextResponse.json({ success: false, error: 'feedSlug and text required' }, { status: 400 });
    }

    const payload = {
      data: {
        feedSlug,
        text,
        authorName: authorName || 'Gast',
        authorHandle: authorHandle || '@gast',
        authorAvatar: authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
        isEdited: false,
      },
    };

    const res = await fetch(`${STRAPI_URL}/api/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ success: false, error: json.error }, { status: res.status });
    }

    return NextResponse.json({ success: true, data: json.data });
  } catch (error: any) {
    console.error('Error creating comment in Strapi:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { documentId, id, text } = body;
    const targetId = documentId || id;

    if (!targetId || !text) {
      return NextResponse.json({ success: false, error: 'documentId and text required' }, { status: 400 });
    }

    const payload = {
      data: {
        text,
        isEdited: true,
      },
    };

    const res = await fetch(`${STRAPI_URL}/api/comments/${targetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ success: false, error: json.error }, { status: res.status });
    }

    return NextResponse.json({ success: true, data: json.data });
  } catch (error: any) {
    console.error('Error updating comment in Strapi:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || searchParams.get('documentId');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id or documentId required' }, { status: 400 });
    }

    const res = await fetch(`${STRAPI_URL}/api/comments/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return NextResponse.json({ success: false, error: json.error }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting comment in Strapi:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
