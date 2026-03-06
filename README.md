# Avatar Voice Demo

Next.js 15 app showcasing Gemini voice capabilities:

- 8 Gemini voices (Puck, Charon, Kore, Fenrir, Aoede, Leda, Orus, Zephyr)
- TTS with Pro/Flash model picker
- Live bidirectional conversation via Gemini Live API WebSocket
- Real-time emotion/prosody 2D plane
- Vibe detection display (Neutral, Joyful, Excited, Chill, Serious, Empathetic)
- Conversation transcript panel
- Framer Motion animations and dark-mode UI

## Setup

1. Create env file:

```bash
cp .env.example .env.local
```

2. Install dependencies:

```bash
npm install
```

3. Run dev server:

```bash
npm run dev
```

Open http://localhost:3000.

## Environment Variables

- `GEMINI_API_KEY` (required): used by `/api/tts` and `/api/live-config`
- `GEMINI_LIVE_MODEL` (optional): server-selected live model
- `NEXT_PUBLIC_GEMINI_LIVE_MODEL` (optional): local fallback model constant
