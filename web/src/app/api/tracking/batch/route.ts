import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

    // Send batch events to Strapi custom controller
    const res = await fetch(`${strapiUrl}/api/tracking/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (error: any) {
    console.error('Tracking Proxy Error:', error);
  }

  return NextResponse.json({ success: true, fallback: true });
}
