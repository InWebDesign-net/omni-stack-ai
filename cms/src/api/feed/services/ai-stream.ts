/**
 * Streaming half of the assistant.
 *
 * `ai-intent.ts` asks the model for a JSON envelope — `response`, `vector`,
 * `vectorSummary` — which cannot be shown to a reader while it is still
 * arriving: half-finished JSON is not text, and picking the `response` field
 * out of a partial document means unescaping JSON by hand and breaking on the
 * first quote the model emits.
 *
 * So the two jobs are split (decision recorded on #90). This service asks for
 * prose and nothing else, and forwards Ollama's tokens as they arrive. The
 * algorithm adjustment stays in `processAiIntent` and runs separately, only
 * when the message plausibly asks for one.
 */

const OLLAMA_URL = () => process.env.OLLAMA_URL || 'http://10.0.0.6:11434/v1/chat/completions';
const OLLAMA_MODEL = () => process.env.OLLAMA_MODEL || 'llama3.1:latest';

/**
 * No token for this long means the model is not producing any more. This is an
 * *idle* timeout on purpose: the previous 25s ceiling on the whole request
 * killed long answers that were still streaming healthily.
 */
const IDLE_TIMEOUT_MS = 20000;

function buildSystemPrompt(targetLang: string): string {
  return `Du bist der offizielle KI-Assistent für "Omni by InWebDesign.net".

ÜBER OMNI & INWEBDESIGN.NET:
- Omni ist eine hochmoderne Plattform-Preview von InWebDesign.net.
- Auf InWebDesign.net bieten wir professionelle Webentwicklung, High-Performance Webhosting und maßgeschneiderte KI-Lösungen an.
- TECHNOLOGIE-STACK & ARCHITEKTUR:
  1. Frontend: Next.js 16 (App Router, React 19, TypeScript, TailwindCSS)
  2. Backend / CMS: Strapi 5 (Headless CMS, PostgreSQL-Datenbank, REST & GraphQL APIs)
  3. KI-Engine: Lokale Ollama-Instanz (Llama 3.1 LLM & Moondream Vision AI) für datenschutzkonforme Echtzeit-Verarbeitung
  4. Video-Pipeline: LXC Converter für HLS-Streaming, Thumbnails & OG-Preview Cards
  5. Hosting: Managed High-Performance Linux/PostgreSQL/Node.js Webhosting auf InWebDesign.net

SPRACHE & VERHALTEN (CRITICAL):
- TARGET LANGUAGE: Respond ONLY in ${targetLang}!
- If target language is English or if user writes in English, reply entirely in English.
- If target language is German or if user writes in German, reply in German (Du-Form).
- Answer user questions directly, friendly and helpfully.

AUSGABEFORMAT (CRITICAL):
- Antworte ausschließlich mit Fließtext. KEIN JSON, keine Code-Fences, keine Meta-Kommentare.`;
}

function detectTargetLanguage(locale?: string): string {
  return locale?.toLowerCase().startsWith('en') ? 'English' : 'German';
}

/**
 * Cheap gate in front of the second, non-streamed call.
 *
 * The system prompt for `processAiIntent` already tells the model to return
 * `null` unless the user explicitly asked for more or less of a topic, so for
 * ordinary conversation the second call is pure cost. This keyword pass is a
 * heuristic and deliberately errs towards running the call: a missed
 * adjustment is worse than an unnecessary request.
 */
export function mayExpressPreference(prompt: string): boolean {
  const p = (prompt || '').toLowerCase();
  const markers = [
    'mehr', 'weniger', 'lieber', 'bitte kein', 'keine', 'zeig mir', 'zeige mir',
    'interessiert', 'interessiere', 'langweil', 'algorithmus', 'feed', 'empfehl',
    'more', 'less', 'fewer', 'prefer', 'stop showing', 'show me', 'recommend',
    'i like', 'i love', 'i hate', "don't like", 'not interested',
  ];
  return markers.some((m) => p.includes(m));
}

export default ({ strapi }: { strapi: any }) => ({
  mayExpressPreference,

  /**
   * Opens a streaming completion against Ollama and hands back the raw body so
   * the caller can forward chunks without buffering. Returns null when the
   * upstream is unreachable or refuses, so callers can fall back.
   */
  async openStream(prompt: string, history?: any[], locale?: string) {
    const targetLang = detectTargetLanguage(locale);

    const messages: { role: string; content: string }[] = [
      { role: 'system', content: buildSystemPrompt(targetLang) },
    ];

    if (Array.isArray(history)) {
      for (const entry of history.slice(-10)) {
        const role = entry?.senderType === 'ai' ? 'assistant' : 'user';
        const content = typeof entry?.content === 'string' ? entry.content : '';
        if (content.trim()) messages.push({ role, content });
      }
    }
    messages.push({ role: 'user', content: prompt });

    try {
      const res = await fetch(OLLAMA_URL(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL(),
          messages,
          stream: true,
        }),
      });

      if (!res.ok || !res.body) {
        strapi.log.error(`Ollama stream refused: HTTP ${res.status}`);
        return null;
      }
      return res.body;
    } catch (err: any) {
      strapi.log.error(`Ollama stream unreachable: ${err?.message || err}`);
      return null;
    }
  },

  /**
   * Turns Ollama's OpenAI-compatible SSE into plain text deltas.
   * Yields nothing and ends if the upstream goes quiet for IDLE_TIMEOUT_MS.
   */
  async *readDeltas(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const timeout = new Promise<{ timedOut: true }>((resolve) =>
          setTimeout(() => resolve({ timedOut: true }), IDLE_TIMEOUT_MS)
        );
        const result = await Promise.race([reader.read(), timeout]);
        if ((result as any).timedOut) {
          strapi.log.warn('Ollama stream idle, closing');
          break;
        }

        const { done, value } = result as { done: boolean; value?: Uint8Array };
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
            if (typeof delta === 'string' && delta.length > 0) yield delta;
          } catch {
            /* a partial JSON line simply waits for the next chunk */
          }
        }
      }
    } finally {
      try {
        await reader.cancel();
      } catch {
        /* already closed */
      }
    }
  },
});
