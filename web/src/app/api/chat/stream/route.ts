import { NextRequest } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

/**
 * Streams the assistant's answer through to the browser.
 *
 * This forwards Strapi's stream rather than awaiting it. An earlier version
 * fetched the complete answer and then replayed it word by word on a 20ms
 * timer, which left the original wait untouched and added `words × 20ms` on
 * top of it.
 *
 * The algorithm adjustment is a second, non-streamed request issued after the
 * prose finishes, and only when the message plausibly asks for one — see the
 * decision on #90.
 */

const STRAPI_URL = () => process.env.STRAPI_URL || 'http://127.0.0.1:1337';

/**
 * Same budget the old `/api/ai-intent` route enforced. Every request here
 * starts LLM inference on the Ollama box, so this is the control that keeps a
 * single client from occupying it.
 */
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function strapiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.STRAPI_API_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
  }
  return headers;
}

function sse(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

/**
 * Heuristic gate in front of the vector call. The system prompt already tells
 * the model to return `null` for ordinary conversation, so for most messages
 * the second request is pure cost. Mirrors `mayExpressPreference` in
 * `cms/src/api/feed/services/ai-stream.ts`; erring towards running the call is
 * intended, because a missed adjustment is worse than a wasted request.
 */
function mayExpressPreference(prompt: string): boolean {
  const p = (prompt || '').toLowerCase();
  return [
    'mehr', 'weniger', 'lieber', 'bitte kein', 'keine', 'zeig mir', 'zeige mir',
    'interessiert', 'interessiere', 'langweil', 'algorithmus', 'feed', 'empfehl',
    'more', 'less', 'fewer', 'prefer', 'stop showing', 'show me', 'recommend',
    'i like', 'i love', 'i hate', "don't like", 'not interested',
  ].some((m) => p.includes(m));
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rate = checkRateLimit(`ai-stream:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ error: 'Too many AI requests. Please try again later.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil((rate.resetAt - Date.now()) / 1000)),
      },
    });
  }

  let prompt = '';
  let history: unknown;
  let locale: string | undefined;
  try {
    const body = await req.json();
    prompt = body?.prompt || '';
    history = body?.history;
    locale = body?.locale;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!prompt.trim()) {
    return new Response(JSON.stringify({ error: 'Prompt is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const upstream = await fetch(`${STRAPI_URL()}/api/feed/ai-stream`, {
    method: 'POST',
    headers: strapiHeaders(),
    body: JSON.stringify({ prompt, history, locale }),
    // Abort the inference when the reader goes away instead of letting it run on.
    signal: req.signal,
  }).catch(() => null);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let sawAnyText = false;

      try {
        if (upstream?.ok && upstream.body) {
          const reader = upstream.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';

            for (const part of parts) {
              const line = part.trim();
              if (!line.startsWith('data:')) continue;
              try {
                const parsed = JSON.parse(line.slice(5).trim());
                if (parsed.chunk) {
                  sawAnyText = true;
                  controller.enqueue(sse({ chunk: parsed.chunk }));
                } else if (parsed.error) {
                  // Whatever arrived stays on screen; the client marks it.
                  controller.enqueue(sse({ error: parsed.error }));
                }
              } catch {
                /* a split event waits for the next chunk */
              }
            }
          }
        }

        if (!sawAnyText) {
          const greeting = locale?.toLowerCase().startsWith('en')
            ? 'Hello! How can I help you today with Omni and InWebDesign.net?'
            : 'Hallo! Wie kann ich dir heute mit Omni und InWebDesign.net weiterhelfen?';
          controller.enqueue(sse({ chunk: greeting }));
        }

        // Second call: only the algorithm adjustment, never streamed.
        if (mayExpressPreference(prompt)) {
          try {
            const res = await fetch(`${STRAPI_URL()}/api/feed/ai-intent`, {
              method: 'POST',
              headers: strapiHeaders(),
              body: JSON.stringify({ prompt, history, locale }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data?.vectorSummary) {
                controller.enqueue(sse({ vectorSummary: data.vectorSummary }));
              }
            }
          } catch {
            /* the answer is already delivered; a missed adjustment is not fatal */
          }
        }

        controller.enqueue(sse({ isLast: true }));
      } catch (err: any) {
        controller.enqueue(sse({ error: err?.message || 'stream_failed', isLast: true }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
