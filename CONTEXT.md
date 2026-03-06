# Avatar Voice Demo - Context

## Existing Code Reference
Copy and adapt from: /Users/hamzadiaz/clawd/projects/live-voice/

### Key files to reference:
- `lib/media-utils.ts` - GEMINI_VOICES (Puck, Charon, Kore, Fenrir, Aoede, Leda, Orus, Zephyr), TTS_MODELS, emotion types, prosody analysis, PCM/WAV encoding
- `lib/constants.ts` - VIBE_TYPES (Neutral, Joyful, Excited, Chill, Serious, Empathetic), VIBE_COLORS, languages, system instruction presets, EMOTION_PROMPT
- `components/voice-selector.tsx` - Voice picker UI grid
- `components/emotion-analysis.tsx` - 2D emotion plane visualization
- `components/sentient-orb.tsx` - Animated orb that reacts to audio/emotion
- `hooks/use-gemini-live.ts` - WebSocket connection to Gemini Live API, audio processing, transcript handling
- `hooks/use-audio-recorder.ts` - Mic capture
- `app/actions.ts` - Server actions for TTS/transcription
- `worker/src/index.ts` - Cloudflare Worker proxy for Gemini WebSocket

### Gemini Voice Config:
- 8 voices: Puck (Upbeat), Charon (Informative), Kore (Firm), Fenrir (Excitable), Aoede (Breezy), Leda (Youthful), Orus (Firm), Zephyr (Bright)
- TTS Models: gemini-2.5-pro-preview-tts (highest quality), gemini-2.5-flash-preview-tts (low latency)
- Live Model: models/gemini-2.5-flash-native-audio-preview-12-2025
- Analysis Model: gemini-3-flash-preview

### Emotion System:
- Vibes: Neutral, Joyful, Excited, Chill, Serious, Empathetic
- Prosody: energy (0-1) + brightness (0-1) = 2D emotion plane
- Vocal characteristics detection
- Emotional mirroring with synchronicity slider (0-10)

## What to Build
A Next.js app with:
1. Voice selector (all 8 Gemini voices)
2. TTS model selector (Pro vs Flash)
3. Text input → speak with selected voice
4. Live voice conversation mode (bidirectional)
5. Emotion detection display (2D plane + vibe label)
6. Prosody visualization
7. Transcript panel
8. Dark mode, beautiful UI (Tailwind + Framer Motion)

Use Next.js 15+, React 19, Tailwind v4, shadcn/ui components.
