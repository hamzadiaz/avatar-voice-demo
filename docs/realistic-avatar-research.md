# Realistic Avatar Research (URGENT)

Date: 2026-03-07
Project: `avatar-voice-demo`

## Goal
Upgrade from a static, mannequin-like VRM into something that feels alive, expressive, and futuristic, with strong realism and fast integration (1–2 days).

---

## Sources reviewed

### X / Twitter discovery queries
- `site:x.com realistic 3D avatar browser AI avatar lip sync web three.js`
- Notable surfaced threads/posts: HeyGen Avatar 3.0, Decart Lip Sync API, OmniHuman/X-Portrait style posts, JS lip-sync library announcements.

### Web / Brave queries
- `realistic 3D avatar browser AI avatar lip sync web three.js realistic character talking avatar react digital human web`
- `Mixamo VRM animation three-vrm example github`
- `simli.com tavus.io synthesia api d-id api heygen api alternatives digital human realtime web`
- `AvatarSample_A.vrm download`
- `Ready Player Me animation library mixamo three.js lip sync web avatar`

### Specifically checked
- `pixiv/three-vrm` (core VRM runtime and examples)
- `pixiv/ChatVRM` (archived, but strong reference architecture)
- three-vrm hosted examples (including `humanoidAnimation` / Mixamo path)
- `madjin/vrm-samples` (usable sample VRM models, including clothed AvatarSample A/B/C)
- Ready Player Me docs (animation library / Mixamo flow)
- TalkingHead (open-source browser lip-sync avatar framework)

---

## Option evaluation

| Approach | Visual realism | Lip sync | Idle micro-motions | Gestures/emotions | Complexity | Perf | 1–2 day fit |
|---|---:|---:|---:|---:|---:|---:|---:|
| **A) Upgraded VRM (three-vrm + better model + better animation logic)** | Medium–High (depends on model quality) | Good (blendshape driven) | Good (breathing/blink/sway doable) | Good (bone/expression control) | Medium | Good | **Yes** |
| **B) 2D video/avatar API (D-ID/HeyGen/Tavus/Simli)** | High–Very High | Very High | Very High | Medium–High | Medium–High (API, billing, streaming, latency) | Good (rendered stream) | Maybe (if API access ready) |
| **C) AI-generated frame sprite avatar (Nano Banana Pro)** | **High** (photoreal portrait quality) | Medium (state-based mouth frames, not true phonemes) | Medium–Good (animated transitions + blink) | Medium (frame set coverage) | **Low–Medium** | **Excellent** | **Yes** |
| **D) Hybrid (3D body + video face)** | Potentially very high | High | High | High | High | Medium | No (for 1–2 day target) |

---

## Decision

### Chosen production path for now: **Hybrid shipping strategy**
1. **Primary default renderer:** AI-generated realistic sprite avatar (Nano Banana Pro frames) for immediate “wow” realism.
2. **Secondary fallback renderer:** Enhanced VRM path with improved animation behavior and better clothed sample VRMs.

Why this wins now:
- Immediate dramatic visual quality increase without deep rigging pipeline.
- Keeps existing 3D stack alive and improved for future expansion.
- Feasible and fully integrated in this sprint window.

---

## What was implemented

## 1) Replaced ugly mannequin models with clothed VRMs
- Source: `madjin/vrm-samples` (`vroid/stable`)
- Updated assets:
  - `public/avatars/male.vrm` → `AvatarSample_B.vrm`
  - `public/avatars/female.vrm` → `AvatarSample_A.vrm`

## 2) Upgraded VRM animation behavior (`vrm-avatar-canvas.tsx`)
Added/Improved:
- **Natural random blink cycle** (timed random intervals + close/open profile)
- **Breathing** (chest motion + speaking-intensity boost)
- **Idle sway + subtle rotational drift**
- **Speaking mouth dynamics** (multi-viseme weights: aa/ih/ou/ee/oh)
- **More active upper/lower arm speaking gestures**
- **Spine micro-motion for alive posture**

Net effect: VRM now feels significantly less static and less robotic.

## 3) Implemented AI-generated realistic avatar renderer (new)
- New component: `src/components/avatar/sprite-avatar-canvas.tsx`
- Uses generated portrait frames and state switching:
  - idle
  - speaking-a
  - speaking-b
  - blink
  - joyful
  - serious
  - excited
  - listening
- Adds continuous cinematic micro-motion (breathing/sway), and randomized blinking.

## 4) Integrated renderer switch in live panel
- `LiveConversationPanel` now supports two renderers:
  - **Realistic** (default): sprite/avatar-frame mode
  - **3D VRM**: upgraded VRM mode
- UI toggle added in “Avatar customizer” block.

## 5) Generated realistic frame sets with Nano Banana Pro
Generated assets:
- `public/avatar-frames/male/*.png`
- `public/avatar-frames/female/*.png`

Used command pattern:
```bash
uv run ~/.nvm/versions/node/v24.13.0/lib/node_modules/openclaw/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "..." --filename "..." --resolution 1K [-i reference.png]
```

Used `-i` reference chaining for identity consistency.

---

## API-based digital human alternatives (future)
- **HeyGen / D-ID / Tavus / Simli** can produce stronger lip-sync realism than sprite states, but add:
  - API dependency and billing
  - latency/network variability
  - integration overhead for real-time conversational loops

Recommendation: keep as phase-2 if you want full photoreal talking-head streaming.

---

## Build verification
- `npm run build` ✅ passed.

---

## Final recommendation
For this codebase and deadline, keep the current dual-mode setup:
- **Default: Realistic sprite mode** for immediate premium visual impact.
- **Optional: Enhanced 3D VRM mode** for interactive 3D presence and future animation extensibility.

If we continue next iteration, phase-2 should be:
1) true phoneme-to-viseme timings for sprite mode, or
2) fully managed real-time talking-head API integration (HeyGen/Simli/Tavus) with latency budget + failover.
