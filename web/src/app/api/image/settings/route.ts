import { NextResponse } from 'next/server';

const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

// PUT /api/image/settings - Update image metadata
export async function PUT(req: Request) {
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

    const body = await req.json();
    const { title, summary, tags, visibility } = body;

    const res = await fetch(`${STRAPI_URL}/api/images/${documentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        data: { title, summary, tags, visibility },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Failed to update image' },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, image: data.data });
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
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');
    const hardDelete = searchParams.get('hard') === 'true';

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    if (hardDelete) {
      // Hard delete - permanently remove
      const res = await fetch(`${STRAPI_URL}/api/images/${documentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': authHeader },
      });

      if (!res.ok) {
        const data = await res.json();
        return NextResponse.json(
          { error: data.error?.message || 'Failed to delete image' },
          { status: res.status }
        );
      }
    } else {
      // Soft delete - set visibility to private
      const res = await fetch(`${STRAPI_URL}/api/images/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          data: { visibility: 'private' },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        return NextResponse.json(
          { error: data.error?.message || 'Failed to soft-delete image' },
          { status: res.status }
        );
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
