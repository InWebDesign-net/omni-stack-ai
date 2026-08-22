import { NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth-server';

/**
 * Hands the WebSocket gateway a token for the current session.
 *
 * The gateway runs on its own origin and authenticates from the handshake
 * payload, so it can never see our httpOnly session cookie. Without this route
 * the browser would have to keep a copy of the token itself — which is why one
 * used to sit in `localStorage`, readable by any script on the page and
 * surviving every reload.
 *
 * The client fetches this immediately before each connection attempt and keeps
 * the answer only in the closure that builds the handshake, so the token is no
 * longer at rest anywhere in the browser.
 */
export async function GET() {
  const { user, jwt } = await getCurrentUserFromCookies();

  // Guests connect without a token — the gateway accepts that and treats them
  // as anonymous — so "no session" is a normal answer here, not an error.
  if (!user || !jwt) {
    return NextResponse.json({ token: null }, { status: 200 });
  }

  return NextResponse.json(
    { token: jwt },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
