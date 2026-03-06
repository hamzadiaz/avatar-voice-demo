# 3D Avatar Integration Plan (Avatar Voice Demo)

## Goal
Render browser-based 3D avatars (male + female) with:
- Lip sync from TTS audio
- Emotions (`happy`, `thinking`, `sad`, `excited`)
- Animation states (`idle`, `listening`, `speaking`, `reacting`)
- Transparent background overlay
- Mobile browser support
- Avatar customization support (skin/hair/clothes)

---

## Recommended Stack (best fit for this project)

### Core rendering
- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `@pixiv/three-vrm`
- `three-stdlib` (helpers/utilities used by many r3f setups)

### Lip sync options
1. **Viseme timeline (recommended for TTS)**
   - Best for deterministic TTS (if your backend can return timed phonemes/visemes)
   - Lowest CPU, mobile-friendly
2. **Audio-analysis fallback (optional)**
   - `wlipsync` (WASM/WebAudio; MFCC-based)
   - Good for mic/live input or if TTS timings are unavailable

### Optional animation source
- `@pixiv/three-vrm-animation` (if using VRMA clips)
- Or FBX/GLTF idle clips retargeted to humanoid rig

---

## Exact install commands

```bash
npm install three @react-three/fiber @react-three/drei @pixiv/three-vrm three-stdlib
```

Optional (advanced lip sync):

```bash
npm install wlipsync
```

---

## Model sources researched (free/open + web-friendly)

### 1) Ready Player Me (best for customization at scale)
- Avatar creator: https://readyplayer.me/avatar
- API docs (3D avatars): https://docs.readyplayer.me/ready-player-me/api-reference/rest-api/avatars/get-3d-avatars
- Morph targets docs: https://docs.readyplayer.me/ready-player-me/api-reference/avatars/morph-targets

Why RPM is strong:
- Strong web pipeline + CDN delivery
- Good customization flow (hair/skin/clothes)
- Supports ARKit + Oculus viseme/morph-target export via URL parameters
- Easy to optimize for mobile via `lod`, `textureAtlas`, `textureFormat=webp`

**Suggested RPM URL format for production**

```text
https://models.readyplayer.me/<avatarId>.glb?morphTargets=ARKit,Oculus%20Visemes&lod=2&textureAtlas=512&textureFormat=webp
```

### 2) VRoid Hub / VRM ecosystem (good open VRM options)
- VRM license/usage FAQ: https://vroid.pixiv.help/hc/en-us/articles/360016417013-About-VRoid-Hub-s-conditions-of-use-and-VRM-license
- Model browser: https://hub.vroid.com/en/models

---

## Identified base avatars (male + female)

> Requirement asked for “Ready Player Me or similar”. These two are from **VRoid Hub** (similar + VRM-native) and are suitable as immediate base models for prototyping.

### Female base candidate
- **Alicia Solid**
- VRoid Hub page: https://hub.vroid.com/en/characters/515144657245174640/models/6438391937465666012
- Also referenced in UniVRM sample set.

### Male base candidate
- **Fred (Free to use character)**
- VRoid Hub page: https://hub.vroid.com/en/characters/7404759744605846862/models/7304684792940112239

> Before production use, verify each model’s latest usage terms on its page (commercial use / attribution / redistribution).

---

## Working references found (Three.js / R3F / VRM + lip sync)

- three-vrm repo + examples: https://github.com/pixiv/three-vrm
- basic loader example: https://raw.githubusercontent.com/pixiv/three-vrm/release/packages/three-vrm/examples/basic.html
- VU-VRM (mic-driven lipsync VRM client): https://github.com/Automattic/VU-VRM
- wLipSync (WASM/WebAudio lip sync): https://github.com/mrxz/wLipSync

---

## Proof-of-concept implementation added

### Files added
- `src/components/avatar/vrm-avatar-canvas.tsx`
- `src/components/avatar/avatar-demo-panel.tsx`

### What the PoC already does
- Loads a VRM in React Three Fiber
- Transparent canvas (`alpha: true`) for overlay UI scenes
- Basic idle bobbing animation
- Supports mode switching: `idle | listening | speaking | reacting`
- Emotion morphs: `happy`, `thinking` (mapped to `relaxed`), `sad`, `excited` (mapped to `surprised`)
- Viseme-based lip sync with simple mapping to VRM vowel expressions (`aa`, `ih`, `ou`, `ee`, `oh`)
- Optional speaking fallback when no viseme cues are available

### Viseme mapping currently used
```ts
PP -> oh
FF/TH/CH/SS -> ih
DD/kk/aa -> aa
RR/ou -> ou
E/nn/sil -> ee
```

---

## Usage snippet

```tsx
"use client";

import { useRef } from "react";
import { VRMAvatarCanvas, type VisemeCue } from "@/components/avatar/vrm-avatar-canvas";

const visemes: VisemeCue[] = [
  { time: 0.10, duration: 0.12, viseme: "aa" },
  { time: 0.24, duration: 0.12, viseme: "ih" },
  { time: 0.36, duration: 0.14, viseme: "oh" },
];

export default function AvatarSection() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  return (
    <div className="h-[420px] w-full">
      <audio ref={audioRef} src="/tts/output.wav" preload="auto" />
      <VRMAvatarCanvas
        avatarUrl="/avatars/female-base.vrm"
        emotion="thinking"
        mode="speaking"
        visemes={visemes}
        audioRef={audioRef}
      />
    </div>
  );
}
```

---

## Integration architecture recommendation

### Backend (TTS + timing)
Return both audio + viseme timeline:

```json
{
  "audioUrl": "/api/tts/audio/123.wav",
  "visemes": [
    { "time": 0.10, "duration": 0.12, "viseme": "aa", "value": 0.9 },
    { "time": 0.24, "duration": 0.10, "viseme": "ih", "value": 0.8 }
  ],
  "emotion": "happy"
}
```

Frontend drives avatar with:
- `audioRef.current.currentTime`
- active viseme cue
- emotion state from NLP/sentiment pipeline

### State model
```ts
type AvatarState = {
  mode: "idle" | "listening" | "speaking" | "reacting";
  emotion: "neutral" | "happy" | "thinking" | "sad" | "excited";
  visemes: VisemeCue[];
};
```

---

## Mobile optimization checklist

- Use RPM URL params: `lod=2`, `textureAtlas=512`, `textureFormat=webp`
- Limit DPR in `<Canvas dpr={[1, 2]}>`
- Avoid heavy post-processing
- Keep one key + one fill light
- Preload avatar/audio
- Pause animation loop when avatar hidden/offscreen
- Consider fallback to 2D portrait if FPS drops below threshold

---

## Next steps

1. Finalize two production avatars (RPM strongly recommended for customization flow).
2. Store them under `public/avatars/` or use signed CDN URLs.
3. Connect real TTS viseme timings from backend.
4. Add `AvatarController` that maps conversation state -> mode/emotion.
5. Add animation clips (VRMA idle/listening/reacting) for richer motion.

---

## Notes
- VRM expression names vary by model; test each target avatar and adjust mapping.
- Always check each avatar’s license terms before commercial use.
