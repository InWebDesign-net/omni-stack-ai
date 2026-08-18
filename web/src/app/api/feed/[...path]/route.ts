import { NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth-server';

const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

interface AuthValidation {
  valid: boolean;
  error?: string;
  statusCode?: number;
}

function validateRequest(method: string, pathStr: string, authHeader: string | null): AuthValidation {
  if (SAFE_METHODS.has(method)) {
    return { valid: true };
  }

  // /api/feed/interaction is an interaction endpoint allowed without raw client JWT
  if (pathStr === 'interaction') {
    return { valid: true };
  }

  if (MUTATING_METHODS.has(method)) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        error: 'Authentication required: mutating operations require a valid JWT',
        statusCode: 401,
      };
    }
    return { valid: true };
  }

  return {
    valid: false,
    error: `Method ${method} not allowed`,
    statusCode: 405,
  };
}

async function proxyRequest(req: Request, params: { path: string[] }) {
  try {
    const pathList = (params && Array.isArray(params.path)) ? params.path : [];

    // Path traversal protection
    if (pathList.some(p => p === '..' || p === '.')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const pathStr = pathList.join('/');
    const url = new URL(req.url);
    const searchParams = url.search;
    const targetUrl = `${STRAPI_URL}/api/feed/${pathStr}${searchParams}`;

    // Authentication & method validation
    const authHeader = req.headers.get('authorization');
    const validation = validateRequest(req.method, pathStr, authHeader);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.statusCode || 400 }
      );
    }

    // Build upstream headers
    const headers: Record<string, string> = {
      'Content-Type': req.headers.get('content-type') || 'application/json',
    };

    if (authHeader) {
      headers['authorization'] = authHeader;
    } else if (process.env.STRAPI_API_TOKEN) {
      headers['authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
    }

    const { user } = await getCurrentUserFromCookies();
    if (user?.id) {
      headers['x-omni-user-id'] = String(user.id);
    }

    // Read body for mutating requests
    let bodyText: string | null = null;
    if (MUTATING_METHODS.has(req.method)) {
      try {
        bodyText = await req.text();
      } catch (e) {
        console.error('[feed-proxy] error reading request body', e);
      }
    }

    // If interaction payload lacks userId / userIdentifier, enrich from user session
    if (pathStr === 'interaction' && bodyText && user?.id) {
      try {
        const parsed = JSON.parse(bodyText);
        if (!parsed.userId) parsed.userId = user.id;
        if (!parsed.userIdentifier || parsed.userIdentifier === 'anonymous' || parsed.userIdentifier === 'anon-session') {
          parsed.userIdentifier = user.handle || user.username || `user-${user.id}`;
        }
        bodyText = JSON.stringify(parsed);
      } catch (e) {}
    }

    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: bodyText || undefined,
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
    console.error('[feed-proxy] unhandled error', error);
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

export async function HEAD(req: Request, context: { params: Promise<{ path: string[] }> }) {
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
