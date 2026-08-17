import { Core } from '@strapi/strapi';
import {
  AffinityGraph,
  normalizeAffinityGraph,
  TOPIC_SCORE_MAX,
} from '../../../lib/affinity';

export default ({ strapi }: { strapi: Core.Strapi }) => ({

  async processAiIntent(prompt: string, currentProfile?: any, history?: any[], locale?: string) {
    // Accepts any legacy profile shape; works on and returns the canonical AffinityGraph.
    const updatedProfile: AffinityGraph = normalizeAffinityGraph(currentProfile);

    let aiExplanation = '';
    let vectorSummary: string | null = null;
    let ollamaConnected = false;
    let hasVectorChanges = false;

    const isEnglish = (locale && locale.toLowerCase() === 'en') || /^[a-zA-Z0-9\s?,.!']{5,}$/.test(prompt) && (prompt.toLowerCase().includes('what') || prompt.toLowerCase().includes('how') || prompt.toLowerCase().includes('can') || prompt.toLowerCase().includes('hello') || prompt.toLowerCase().includes('hi'));
    const targetLang = isEnglish ? 'English' : 'German';

    const ollamaUrl = process.env.OLLAMA_URL || 'http://10.0.0.6:11434/v1/chat/completions';
    const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:latest';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const systemPrompt = `Du bist der offizielle KI-Assistent für "Omni by InWebDesign.net".

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

ALGORITHMUS-STEUERUNG:
- Falls der Nutzer NUR normale Konversation führt oder Fragen stellt, setze "vector" auf null und "vectorSummary" auf null. Verändere den Algorithmus NICHT.
- Nur wenn der Nutzer EXPLIZIT Themen- oder Formatwünsche äußert (z.B. "Mehr Kochen", "Weniger Finanzen"), erstelle im "vector"-Objekt passende Gewichte UND gib "vectorSummary" an (z.B. "⚡ Algorithmus-Anpassung: Kochen +95%").

WICHTIG: Antworte im folgenden JSON-Format:
{
  "response": "Deine Antworterklärung in ${targetLang}",
  "vector": null | {
    "interests": { "Thema": { "score": 0.95 } },
    "contentTypes": { "video": 0.9, "pdf": 0.8 },
    "activePattern": "discovery"
  },
  "vectorSummary": null | "⚡ Algorithmus-Anpassung: Thema +95%"
}`;

      const chatHistory = Array.isArray(history)
        ? history
            .filter((m: any) => m && m.content && (m.senderType === 'user' || m.senderType === 'ai'))
            .slice(-6)
            .map((m: any) => ({
              role: m.senderType === 'user' ? 'user' : 'assistant',
              content: m.content,
            }))
        : [];

      const ollamaMessages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: prompt },
      ];

      const res = await fetch(ollamaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: ollamaModel,
          temperature: 0.3,
          max_tokens: 600,
          messages: ollamaMessages,
        }),
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: any = await res.json();
        const rawContent = data.choices?.[0]?.message?.content || '';

        let parsed: any = null;
        try {
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            parsed = JSON.parse(rawContent);
          }
        } catch (err) {
          // If Ollama replied with direct natural text without JSON syntax, use rawContent as explanation
          parsed = { response: rawContent, vector: null, vectorSummary: null };
        }

        if (parsed.response) {
          aiExplanation = parsed.response;
        }

        if (parsed.vector) {
          hasVectorChanges = true;
          if (parsed.vector.interests) {
            Object.keys(parsed.vector.interests).forEach((t) => {
              const item = parsed.vector.interests[t];
              const scoreVal = typeof item === 'number' ? item : item?.score;
              if (typeof scoreVal !== 'number' || Number.isNaN(scoreVal)) return;
              updatedProfile.topics[t] = {
                score: Math.min(TOPIC_SCORE_MAX, Math.max(0, scoreVal * TOPIC_SCORE_MAX)),
                last_interacted: new Date().toISOString(),
              };
            });
          }

          if (parsed.vector.contentTypes) {
            Object.keys(parsed.vector.contentTypes).forEach((ct) => {
              updatedProfile.contentTypes[ct] = Math.min(1.0, Math.max(0.0, parsed.vector.contentTypes[ct]));
            });
          }

          if (parsed.vector.activePattern) {
            updatedProfile.activePattern = parsed.vector.activePattern;
          }

          vectorSummary = parsed.vectorSummary || '⚡ Algorithmus-Anpassung vorgenommen.';
        }
        ollamaConnected = true;
      }
    } catch (e) {
      // Ollama offline / public open-source fallback
    }

    // Open-Source Smart Intent Processor fallback if Ollama offline
    if (!ollamaConnected) {
      const lowerPrompt = prompt.toLowerCase();

      const setScore = (topic: string, scoreVal: number) => {
        updatedProfile.topics[topic] = {
          score: Math.min(TOPIC_SCORE_MAX, Math.max(0, scoreVal * TOPIC_SCORE_MAX)),
          last_interacted: new Date().toISOString(),
        };
      };

      if (lowerPrompt.includes('hosting') || lowerPrompt.includes('hosten') || lowerPrompt.includes('technologie') || lowerPrompt.includes('stack') || lowerPrompt.includes('strapi') || lowerPrompt.includes('nextjs')) {
        aiExplanation = 'Auf InWebDesign.net bieten wir professionelles Managed Webhosting für moderne Webanwendungen! Wir setzen auf einen hochmodernen Stack aus Next.js 16 (App Router, React 19, TypeScript), Strapi 5 als Headless CMS, PostgreSQL-Datenbanken und integrierte KI-Lösungen via Ollama. Gerne beraten wir dich zu deinem eigenen Projekt!';
        vectorSummary = null;
      } else if (lowerPrompt.includes('pdf') || lowerPrompt.includes('dokument') || lowerPrompt.includes('wissen')) {
        hasVectorChanges = true;
        updatedProfile.contentTypes.pdf = 1.0;
        updatedProfile.contentTypes.video = 0.4;
        setScore('Wissenschaft', 0.99);
        setScore('PostgreSQL', 0.95);
        updatedProfile.activePattern = 'deep_dive';
        aiExplanation = 'Ich habe deinen Feed auf wissenschaftliche Dokumente und tiefgründige Artikel umgestellt. Auf InWebDesign.net unterstützen wir auch KI-gestützte Dokumentenanalyse!';
        vectorSummary = '⚡ Algorithmus-Anpassung: Wissenschaft & PDFs hervorgehoben.';
      } else if (lowerPrompt.includes('kochen') || lowerPrompt.includes('essen') || lowerPrompt.includes('pasta') || lowerPrompt.includes('rezept')) {
        hasVectorChanges = true;
        setScore('Kochen', 0.99);
        updatedProfile.contentTypes.video = 1.0;
        updatedProfile.activePattern = 'discovery';
        aiExplanation = 'Ich zeige dir ab jetzt bevorzugt Videos zum Thema Kochen & Rezepte. Hast du auch ein eigenes Food- oder Blog-Projekt? Wir entwickeln und hosten maßgeschneiderte Plattformen auf InWebDesign.net!';
        vectorSummary = '🍳 Algorithmus-Anpassung: Kochen & Rezepte im Feed bevorzugt.';
      } else if (lowerPrompt.includes('cat') || lowerPrompt.includes('katz') || lowerPrompt.includes('humor') || lowerPrompt.includes('fun')) {
        hasVectorChanges = true;
        setScore('Funny Cat Videos', 0.99);
        setScore('Natur', 0.90);
        updatedProfile.contentTypes.short = 1.0;
        updatedProfile.activePattern = 'discovery';
        aiExplanation = 'Entertainment-Modus aktiviert! Ich hebe lustige Shorts & Videos im Feed für dich hervor.';
        vectorSummary = '🐱 Algorithmus-Anpassung: Unterhaltungs-Shorts bevorzugt.';
      } else {
        // Pure natural chat greeting / general conversation without altering vectors
        aiExplanation = 'Hallo! Schön, dass du wieder da bist. Willkommen bei Omni von InWebDesign.net! Hast du schon ein eigenes Webprojekt oder suchst du nach High-Performance Hosting & KI-Lösungen? Sag mir einfach, wie ich dir weiterhelfen kann!';
        vectorSummary = null;
      }
    }

    return {
      updatedProfile: hasVectorChanges ? updatedProfile : null,
      aiExplanation,
      vectorSummary,
      ollamaConnected,
    };
  },

  /**
   * Reset Demo Data
   */
  /**
   * Ingest Finalized Video (moves files from /root/media/out to /root/media/videos and updates Strapi)
   */
});
