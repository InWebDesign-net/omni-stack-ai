# Omni Stack Content Fill Service & Automated Metadata Pipeline

Diese Dokumentation beschreibt die Architektur, Funktionsweise und Anpassungsmöglichkeiten des **Content Fill Services** zur automatisierten Erstellung von Metadaten (Titel, Beschreibungen, Tags, Kategorien) für Bilder und Videos im Omni Stack AI System.

---

## 🎯 Überblick & Zweck

Der **Content Fill Service** verbindet Bildanalyse (Computer Vision) und Sprachmodelle (LLMs), um neu konvertierte Medien-Dateien automatisch mit qualitativen, zweisprachigen (Deutsch/Englisch) Metadaten auszustatten:

1. **KI-Bild- & Frame-Analyse**: Extraktion visueller Merkmale aus Schlüsselbildern mittels Vision-Modell (**Moondream2**).
2. **Zweisprachige Metadaten-Erstellung**: Generierung strukturierter JSON-Payloads (Titel, Kurzbeschreibung, 10 relevante Tags) mittels **Llama 3.1**.
3. **Strapi CMS Synchronisation**: Erstellen und Veröffentlichen von `Video`- und `Image`-Dokumenten über die REST-API von Strapi.
4. **Zustandsverwaltung & Duplikatsschutz**: Nutzung einer lokalen SQLite-Datenbank (`content_fill_state.db`), um berechnete Medien zu erfassen und Mehrfach-Generierungen zu vermeiden.

---

## 🏗️ Funktionsweise & Ablauf

```
 ┌────────────────┐     ┌───────────────────┐     ┌─────────────────────┐     ┌────────────────┐
 │ 1. Neue Datei  │────>│ 2. Moondream2     │────>│ 3. Llama 3.1        │────>│ 4. Strapi API  │
 │    in Output-  │     │    Visual Frame   │     │    JSON Metadata    │     │    Document    │
 │    Ordner      │     │    Analysis       │     │    Generation       │     │    Publish     │
 └────────────────┘     └───────────────────┘     └─────────────────────┘     └────────────────┘
```

### Schritt-für-Schritt-Prozess:
1. **Erfassung**: Der Service prüft die Medien-Ordner (`/mnt/media/out/videos` & `/mnt/media/out/images`) nach noch nicht verarbeiteten Elementen.
2. **Vision-Analyse (`ollama.js`)**: 
   - Ein Schlüsselbild (z. B. Thumbnail) wird an **Moondream** gesendet.
   - Moondream liefert eine präzise visuelle Beschreibung des Inhalts (*"Ein Video zeigt Boote am Seeufer unter grünen Bäumen..."*).
3. **Metadaten-Synthese (`ollama.js`)**:
   - Die visuelle Beschreibung wird an **Llama 3.1** gesendet mit der Anforderung, ein valides JSON-Format mit zweisprachigen Titeln (`title_de`, `title_en`), Beschreibungen (`summary_de`, `summary_en`) und genau 10 Tags (`tags_de`, `tags_en`) zu erstellen.
4. **Veröffentlichung (`strapi.js`)**:
   - Der Service verbindet sich mit dem Strapi CMS (`http://127.0.0.1:1337`), weist dem Element einen Demo-Creator zu und veröffentlicht das Dokument.

---

## 🔄 Entwurfsmuster: Dev/Demo vs. Produktivbetrieb (Customization)

Im Entwicklungs- und Demo-Modus agiert dieser Service als automatischer Hintergrund-Runner, um den Datenbestand fortlaufend mit realistischen Inhalten anzureichern.

Im echten Produktivbetrieb möchte man meist verhindern, dass ein autonomer Hintergrund-Dienst unkontrolliert Beschreibungen veröffentlicht. Daher lässt sich die Logik leicht anpassen:

### 💡 Produktions-Alternativen & Anpassungen:

1. **Button-basierter Assistent im Admin-Panel (Human-in-the-Loop)**:
   - Der Redakteur lädt ein Bild oder Video hoch.
   - Ein Button **"✨ KI-Vorschlag generieren"** ruft den Content-Fill-Endpunkt auf.
   - Der Redakteur sieht den generierten Titel, die Tags und die Zusammenfassung in Formularfeldern, kann diese anpassen und manuell freigeben.

2. **Moderations- & Freigabe-Queue**:
   - Der Dienst generiert die Metadaten, speichert das Strapi-Dokument jedoch mit dem Status `draft` (Entwurf). Redakteure erhalten eine Benachrichtigung zur manuellen Freigabe (`published`).

3. **Individuelle Prompts & Branchenspezifische Taxonomien**:
   - Die System-Prompts in `ollama.js` können auf spezifische Produktkategorien, E-Commerce-Tags oder Unternehmens-Vokabulare angepasst werden.

---

## 🚀 Setup & Konfiguration

### Datei-Struktur (`/root/omni-root/omni-content-fill`):
- `index.js`: Haupt-Schleife & Datei-Scrubber.
- `ollama.js`: Client für Ollama (Moondream & Llama 3.1).
- `strapi.js`: REST-Client für Strapi CMS Documents API.
- `db.js`: SQLite State-Manager (`content_fill_state.db`).

### Umgebungsvariablen (`.env`):
```env
STRAPI_URL=http://127.0.0.1:1337
STRAPI_API_TOKEN=dein_strapi_api_token
OLLAMA_HOST=http://10.0.0.6:11434
MEDIA_OUT_DIR=/mnt/media/out
```

### Start per PM2:
```bash
pm2 start ecosystem.config.js --env production
```
