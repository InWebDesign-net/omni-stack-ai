import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, history, locale } = body;

    const targetLang = locale?.toLowerCase().startsWith('en') ? 'English' : 'German';

    let fullText = '';
    let vectorSummary: string | undefined = undefined;

    try {
      const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (process.env.STRAPI_API_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
      }

      const aiRes = await fetch(`${strapiUrl}/api/feed/ai-intent`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, history, locale }),
      });
      if (aiRes.ok) {
        const data = await aiRes.json();
        const text = data.aiExplanation || data.response || data.explanation || data.reply || data.answer;
        if (text) {
          fullText = text.replace(/^🤖\s*Ollama\s*\([^)]*\):\s*/i, '');
        }
        if (data.vectorSummary) {
          vectorSummary = data.vectorSummary;
        }
      }
    } catch (err) {
      console.warn('AI Intent request error:', err);
    }

    if (!fullText) {
      fullText = targetLang === 'English'
        ? 'Hello! How can I help you today with Omni and InWebDesign.net?'
        : 'Hallo! Wie kann ich dir heute mit Omni und InWebDesign.net weiterhelfen?';
    }

    const encoder = new TextEncoder();
    const words = fullText.split(/(\s+)/);

    const stream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < words.length; i++) {
          const chunk = words[i];
          const isLast = i === words.length - 1;
          const payload = JSON.stringify({ chunk, isLast, vectorSummary });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          // Natural streaming interval for smooth typing appearance
          await new Promise((r) => setTimeout(r, 20));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Stream error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
