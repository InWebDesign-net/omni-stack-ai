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
    const forwardedParams = new URLSearchParams(url.search);

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

    /*
     * `interaction-status` is a GET, so its identity travels in the query
     * string and the body-based enrichment below never reached it.
     *
     * The service falls back to matching the raw `userIdentifier`, and pages
     * send a username there — while a like row written by `/api/likes` carries
     * `user-<id>`. So the lookup found nothing, the heart showed empty on
     * something already liked, and clicking it sent a like that already
     * existed: the server rightly left the count alone and that answer
     * overwrote the optimistic +1. The number appeared not to move.
     */
    if (pathStr === 'interaction-status' && user?.id) {
      forwardedParams.set('userId', String(user.id));
      const identifier = forwardedParams.get('userIdentifier');
      if (!identifier || identifier === 'anonymous') {
        forwardedParams.set('userIdentifier', user.handle || user.username || `user-${user.id}`);
      }
    }

    const query = forwardedParams.toString();
    const targetUrl = `${STRAPI_URL}/api/feed/${pathStr}${query ? `?${query}` : ''}`;

    // If interaction payload lacks userId / userIdentifier, enrich from user session
    if (pathStr === 'interaction' && bodyText && user?.id) {
      try {
        const parsed = JSON.parse(bodyText);
        if (!parsed.userId) parsed.userId = user.id;
        if (!parsed.userIdentifier || parsed.userIdentifier === 'anonymous' || parsed.userIdentifier === 'anon-session') {
          parsed.userIdentifier = user.handle || user.username || `user-${user.id}`;
        }
        bodyText = JSON.stringify(parsed);
      } catch (e) { console.error('[api/feed] could not attach user identity to request body:', e); }
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
