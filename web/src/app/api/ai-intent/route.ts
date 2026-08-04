import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (process.env.STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337'}/api/feed/ai-intent`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    } else {
      const errData = await res.json();
      return NextResponse.json({ error: errData.error?.message || 'Strapi AI Intent processing failed' }, { status: res.status });
    }
  } catch (error: any) {
    console.error('Strapi AI Intent Proxy Error:', error);
    return NextResponse.json({ error: error.message || 'Strapi AI Intent Connection Error' }, { status: 500 });
  }
}
