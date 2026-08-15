import { NextRequest, NextResponse } from 'next/server';
import { jsonAuthHeaders } from '@/lib/affinity';

export async function GET(req: NextRequest) {
  try {
    const strapiUrl = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';
    const authHeader = req.headers.get('authorization');
    const headers = jsonAuthHeaders();
    if (authHeader) {
      (headers as any)['Authorization'] = authHeader;
    }

    const res = await fetch(`${strapiUrl}/api/notifications`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const strapiUrl = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';
    const authHeader = req.headers.get('authorization');
    const headers = jsonAuthHeaders();
    if (authHeader) {
      (headers as any)['Authorization'] = authHeader;
    }

    const res = await fetch(`${strapiUrl}/api/notifications/mark-read`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json({ success: false }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const strapiUrl = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';
    const authHeader = req.headers.get('authorization');
    const headers = jsonAuthHeaders();
    if (authHeader) {
      (headers as any)['Authorization'] = authHeader;
    }

    const res = await fetch(`${strapiUrl}/api/notifications/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) {
      return NextResponse.json({ success: false }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
