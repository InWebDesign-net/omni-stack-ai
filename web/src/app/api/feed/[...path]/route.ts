import { NextResponse } from 'next/server';

const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

async function proxyRequest(req: Request, params: { path: string[] }) {
  try {
    const pathStr = params.path.join('/');
    const url = new URL(req.url);
    const searchParams = url.search;
    const targetUrl = `${STRAPI_URL}/api/feed/${pathStr}${searchParams}`;

    const headers: Record<string, string> = {
      'Content-Type': req.headers.get('content-type') || 'application/json',
    };

    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      headers['authorization'] = authHeader;
    } else if (process.env.STRAPI_API_TOKEN) {
      headers['authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
    }

    let body: any = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        body = await req.text();
      } catch (e) {}
    }

    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: body || undefined,
    });

    const dataText = await res.text();
    let dataJson: any;
    try {
      dataJson = JSON.parse(dataText);
    } catch (e) {
      dataJson = { message: dataText };
    }

    return NextResponse.json(dataJson, { status: res.status });
  } catch (error: any) {
    console.error('Strapi Feed Proxy Error:', error);
    return NextResponse.json(
      { error: error.message || 'Strapi Feed Proxy Connection Error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return proxyRequest(req, params);
}

export async function POST(req: Request, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return proxyRequest(req, params);
}

export async function PUT(req: Request, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return proxyRequest(req, params);
}

export async function DELETE(req: Request, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return proxyRequest(req, params);
}
