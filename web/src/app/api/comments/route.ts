import { NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  try {
    let endpoint = `${STRAPI_URL}/api/comments?populate=*&sort=createdAt:asc`;
    if (slug) {
      endpoint = `${STRAPI_URL}/api/comments?filters[feedSlug][$eq]=${encodeURIComponent(slug)}&populate=*&sort=createdAt:asc`;
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
    const { feedSlug, text, authorName, authorHandle, authorAvatar, parentId } = body;

    if (!feedSlug || !text) {
      return NextResponse.json({ success: false, error: 'feedSlug and text required' }, { status: 400 });
    }

    let calculatedDepth = 0;
    let parentDocId: string | null = null;
    let parentAuthorHandle: string | null = null;

    if (parentId) {
      try {
        const parentRes = await fetch(`${STRAPI_URL}/api/comments/${parentId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });
        if (parentRes.ok) {
          const parentJson = await parentRes.json();
          const pData = parentJson.data;
          if (pData) {
            parentDocId = pData.documentId || pData.id;
            calculatedDepth = (pData.depth || 0) + 1;
            parentAuthorHandle = pData.authorHandle || null;

            // Increment repliesCount on parent comment
            await fetch(`${STRAPI_URL}/api/comments/${parentDocId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data: {
                  repliesCount: (pData.repliesCount || 0) + 1,
                },
              }),
            }).catch(() => {});
          }
        }
      } catch (e) {
        console.error('Error fetching parent comment:', e);
      }
    }

    const payload: any = {
      data: {
        feedSlug,
        text,
        authorName: authorName || 'Gast',
        authorHandle: authorHandle || '@gast',
        authorAvatar: authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
        isEdited: false,
        depth: calculatedDepth,
        repliesCount: 0,
      },
    };

    if (parentDocId) {
      payload.data.parent = parentDocId;
    }

    const res = await fetch(`${STRAPI_URL}/api/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ success: false, error: json.error }, { status: res.status });
    }

    // Automated notification trigger for comment reply
    if (parentDocId && parentAuthorHandle && parentAuthorHandle !== authorHandle) {
      try {
        await fetch(`${STRAPI_URL}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: {
              type: 'comment_reply',
              title: 'Neue Antwort auf deinen Kommentar',
              message: `${authorName || 'Jemand'} hat auf deinen Kommentar geantwortet: "${text.substring(0, 45)}${text.length > 45 ? '...' : ''}"`,
              link: `/video/${feedSlug}`,
              isRead: false,
              targetUserHandle: parentAuthorHandle,
            },
          }),
        }).catch(() => {});
      } catch (e) {
        console.error('Error triggering comment_reply notification:', e);
      }
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
