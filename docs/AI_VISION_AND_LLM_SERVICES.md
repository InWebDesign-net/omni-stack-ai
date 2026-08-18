# Omni Stack Local AI Integration: Ollama, Moondream & Llama

This document describes the integration, architecture, and model swapping options for the local AI services (**Ollama**, **Moondream**, and **Llama**) in the Omni Stack AI ecosystem.

---

## 🎯 Overview & Purpose

Omni Stack AI relies on a privacy-first, zero-latency local AI infrastructure without external cloud API dependencies (such as OpenAI or Anthropic). All AI tasks—ranging from computer vision to natural language intent parsing and interactive chat—run on self-hosted open-source models:

1. **Computer Vision & Image Analysis**: Scene description, object detection, and visual captioning with **Moondream2**.
2. **Natural Language Processing & Text Generation**: Structured JSON metadata synthesis and conversational responses with **Llama 3.1 / Llama 3.2**.
3. **Intent Parsing & Recommendation Tuning**: Dynamic user intent analysis in the CMS (`ai-intent.ts`).

---

## 🧠 Integrated AI Models

### 1. Moondream2 (`moondream:latest`)
- **Type**: Lightweight Computer Vision Model (~1.8B parameters).
- **Use Cases**:
  - Video frame and image thumbnail analysis.
  - Generating concise English visual descriptions (*Captioning*).
  - Fast inference time (~2–8 seconds per frame on standard GPU/CPU hardware).

### 2. Llama 3.1 / Llama 3.2 (`llama3.1:latest`)
- **Type**: High-performance Large Language Model (LLM).
- **Use Cases**:
  - **Bilingual Metadata Generation**: Transforming Moondream descriptions into structured German/English titles, summaries, and tags using JSON mode (`format: 'json'`).
  - **User Intent Classification**: Parsing search queries and freeform prompts in `ai-intent.ts` with locale awareness (`de` / `en`).
  - **Conversational Assistant**: Interactive AI assistant in [`ChatWidget.tsx`](file:///root/omni-stack-ai/web/src/components/chat/ChatWidget.tsx).

---

## 🛰️ API Contracts & Endpoint Specification

Communication with Ollama occurs via standard REST API endpoints (`http://10.0.0.6:11434` or configured host):

### 1. Vision Request (Moondream)
```json
POST /api/generate
{
  "model": "moondream:latest",
  "prompt": "Describe what is visible in this image.",
  "images": ["<base64_encoded_image_string>"],
  "stream": false
}
```

### 2. Structured JSON LLM Request (Llama 3.1)
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

## 🔄 Customization & Swapping AI Models

The modular architecture allows developers to swap models or providers seamlessly based on available GPU VRAM or production requirements:

### 💡 Production Alternatives:

1. **Swapping Vision Models**:
   - **Llama 3.2 Vision** (`llama3.2-vision`): Replaces Moondream for detailed document/image comprehension at higher model weight.
   - **Qwen2-VL** (`qwen2-vl`): Excellent support for multilingual OCR and text-heavy visual assets.

2. **Swapping Text LLMs**:
   - **DeepSeek-R1 / Qwen 2.5**: Optimized for complex reasoning, logic, and precise tag classification.
   - **Mistral 7B / Llama 3 8B**: Balanced inference speed and output accuracy.

3. **Cloud API Integration (Optional)**:
   - The `ollama.js` client can be replaced with adapters for **OpenAI GPT-4o**, **Claude 3.5 Sonnet**, or **Google Gemini API** if self-hosted GPU hardware is not utilized.

---

## 🚀 Hardware & Performance Reference

| Model | VRAM Requirement (GPU) | CPU Fallback | Typical Response Time |
| :--- | :--- | :--- | :--- |
| **Moondream2** | ~2 - 4 GB VRAM | Supported | 2 – 8 seconds |
| **Llama 3.1 (8B)** | ~6 - 8 GB VRAM | Supported (Slower) | 3 – 12 seconds |
| **Llama 3.2 Vision (11B)** | ~10 - 12 GB VRAM | Not Recommended | 5 – 15 seconds |

### System Configuration:
Set the Ollama host URL in your `.env` configuration:
```env
OLLAMA_HOST=http://10.0.0.6:11434
```
