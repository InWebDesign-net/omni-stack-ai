import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Proxy request to Strapi custom controller
    const res = await fetch('http://127.0.0.1:1337/api/feed/assembly', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (error: any) {
    console.error('Strapi Feed Proxy Error:', error);
  }

  return NextResponse.json({ error: 'Strapi Connection Fallback' }, { status: 500 });
}
