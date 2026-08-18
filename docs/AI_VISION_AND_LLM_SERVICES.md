# Omni Stack Local AI Integration: Ollama, Moondream & Llama

Diese Dokumentation beschreibt die Einbindung, Architektur und Anpassungsmöglichkeiten der lokalen KI-Dienste (**Ollama**, **Moondream** & **Llama**) im Omni Stack AI Ökosystem.

---

## 🎯 Überblick & Zweck

Das Omni Stack AI System setzt auf eine datenschutzkonforme, lokale KI-Infrastruktur ohne Abhängigkeiten von externen Cloud-APIs (wie OpenAI oder Anthropic). Alle KI-Aufgaben – von der Bild-Erkennung über die Sprach-Intent-Analyse bis hin zu interaktiven Chatbots – werden über lokale Open-Source-Modelle ausgeführt:

1. **Computer Vision & Bildanalyse**: Erkennung von Bildinhalten, Objekten und Szenen mit **Moondream2**.
2. **Sprachverständnis & Textgenerierung**: Generierung strukturierter JSON-Metadaten und Sprachantworten mit **Llama 3.1 / Llama 3.2**.
3. **Intent-Erkennung & Empfehlungen**: Intelligente Aufbereitung von Benutzereingaben im Frontend und CMS (`ai-intent.ts`).

---

## 🧠 Eingesetzte KI-Modelle im Detail

### 1. Moondream2 (`moondream:latest`)
- **Typ**: Leichtgewichtiges Computer-Vision-Modell (ca. 1.8B Parameter).
- **Einsatzbereich**:
  - Analyse von Videoframes und Vorschaubildern.
  - Erstellung präziser englischer Inhaltsbeschreibungen (*Captioning*).
  - Schnelle Ausführungszeit (ca. 2–8 Sekunden pro Bild auf gängiger Hardware).

### 2. Llama 3.1 / Llama 3.2 (`llama3.1:latest`)
- **Typ**: Leistungsfähiges Large Language Model (LLM).
- **Einsatzbereich**:
  - **Bilinguale Metadaten-Generierung**: Transformation der Moondream-Bildbeschreibung in deutsche/englische Titel, Summaries und Tags im JSON-Format (`format: 'json'`).
  - **Benutzer-Intent-Erkennung**: Parsen von Suchanfragen und Freitext-Prompts im CMS (`ai-intent.ts`) unter Berücksichtigung der Benutzer-Sprache (`de` / `en`).
  - **KI-Chat-Assistent**: Interaktiver Chatbot (`ChatWidget.tsx`) im System.

---

## 🛰️ Schnittstellen & API-Integration

Die Anbindung an Ollama erfolgt über die standardisierte REST-API des Ollama-Daemons (`http://10.0.0.6:11434` oder konfigurierbarer Host):

### 1. Vision-Request (Moondream)
```json
POST /api/generate
{
  "model": "moondream:latest",
  "prompt": "Describe what is visible in this image.",
  "images": ["<base64_encoded_image_string>"],
  "stream": false
}
```

### 2. Strukturiertes JSON-LLM-Request (Llama 3.1)
```json
POST /api/generate
{
  "model": "llama3.1:latest",
  "prompt": "Analyze the content and return JSON with title_de, title_en, tags_de, tags_en...",
  "format": "json",
  "stream": false
}
```

---

## 🔄 Anpassung & Modell-Austausch (Customization)

Einer der größten Vorteile der Architektur ist die flexible Austauschbarkeit der KI-Komponenten. Je nach verfügbarer Hardware (GPU-VRAM) oder Produktiv-Anforderungen können Modellauswahl und Anbieter angepasst werden:

### 💡 Alternativen für den Produktivbetrieb:

1. **Austausch von Vision-Modellen**:
   - **Llama 3.2 Vision** (`llama3.2-vision`): Ersetzt Moondream für noch detailliertere Bild- und Dokumentenanalysen bei höherer Modellgröße.
   - **Qwen2-VL** (`qwen2-vl`): Hervorragende Unterstützung für mehrsprachige OCR und Texterkennung auf Bildern.

2. **Austausch von Text-LLMs**:
   - **DeepSeek-R1 / Qwen 2.5**: Für komplexe logische Argumentation und präzise Tag-Klassifizierungen.
   - **Mistral 7B / Llama 3 8B**: Guter Kompromiss aus Geschwindigkeit und Ausgabequalität.

3. **Anbindung von Cloud-APIs (Optional)**:
   - Der `ollama.js` Client kann durch einen Adapter für **OpenAI GPT-4o**, **Claude 3.5 Sonnet** oder **Google Gemini API** ersetzt werden, falls keine lokale Hardware betrieben werden soll.

---

## 🚀 Hardware- & Performance-Empfehlungen

| Modell | VRAM Bedarf (GPU) | CPU Fallback | Typische Antwortzeit |
| :--- | :--- | :--- | :--- |
| **Moondream2** | ~2 - 4 GB VRAM | Möglich | 2 – 8 Sekunden |
| **Llama 3.1 (8B)** | ~6 - 8 GB VRAM | Möglich (langsamer) | 3 – 12 Sekunden |
| **Llama 3.2 Vision (11B)** | ~10 - 12 GB VRAM | Nicht empfohlen | 5 – 15 Sekunden |

### System-Konfiguration:
In der `.env`-Datei des CMS oder Content-Fill-Services wird der Ollama-Host definiert:
```env
OLLAMA_HOST=http://10.0.0.6:11434
```
