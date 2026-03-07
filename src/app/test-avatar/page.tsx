"use client"

import { useCallback, useRef, useState } from "react"
import {
  TalkingHeadAvatar,
  type TalkingHeadAvatarHandle,
} from "@/components/avatar/talking-head-avatar"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"

const MOODS = [
  { id: "neutral", label: "😐 Neutral", color: "bg-zinc-600" },
  { id: "happy", label: "😊 Happy", color: "bg-yellow-600" },
  { id: "angry", label: "😡 Angry", color: "bg-red-600" },
  { id: "sad", label: "😢 Sad", color: "bg-blue-600" },
  { id: "fear", label: "😱 Fear", color: "bg-purple-600" },
  { id: "disgust", label: "🤢 Disgust", color: "bg-green-600" },
  { id: "love", label: "😍 Love", color: "bg-pink-600" },
  { id: "sleep", label: "😴 Sleep", color: "bg-indigo-600" },
]

const GESTURES = [
  { id: "handup", label: "✋ Hand Up" },
  { id: "index", label: "☝️ Index" },
  { id: "ok", label: "👌 OK" },
  { id: "thumbup", label: "👍 Thumb Up" },
  { id: "thumbdown", label: "👎 Thumb Down" },
  { id: "side", label: "🤚 Side" },
  { id: "shrug", label: "🤷 Shrug" },
]

const VIEWS = [
  { id: "full", label: "Full Body" },
  { id: "mid", label: "Mid" },
  { id: "upper", label: "Upper" },
  { id: "head", label: "Head" },
]

const EMOJIS = ["😊", "😂", "😍", "😢", "😡", "😱", "🤔", "😴", "😎", "🥳", "😘", "🤗"]

const GEMINI_PCM_RATE = 24000

function pcm16ToFloat32(pcm: Int16Array): Float32Array {
  const f = new Float32Array(pcm.length)
  for (let i = 0; i < pcm.length; i++) {
    f[i] = pcm[i] / (pcm[i] < 0 ? 0x8000 : 0x7fff)
  }
  return f
}

function resampleAudio(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input
  const ratio = fromRate / toRate
  const len = Math.round(input.length / ratio)
  const out = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    const srcIdx = i * ratio
    const idx = Math.floor(srcIdx)
    const frac = srcIdx - idx
    out[i] = (input[idx] ?? 0) * (1 - frac) + (input[idx + 1] ?? 0) * frac
  }
  return out
}

function float32ToPcm16(f32: Float32Array): Int16Array {
  const pcm = new Int16Array(f32.length)
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]))
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return pcm
}

export default function TestAvatarPage() {
  const avatarRef = useRef<TalkingHeadAvatarHandle>(null)
  const [gender, setGender] = useState<"female" | "male">("female")
  const [activeMood, setActiveMood] = useState("neutral")
  const [activeView, setActiveView] = useState("upper")
  const [activeGesture, setActiveGesture] = useState<string | null>(null)
  const [mirrorGesture, setMirrorGesture] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [speakText, setSpeakText] = useState("Hello! I am your AI avatar. Nice to meet you!")
  const [lastAction, setLastAction] = useState("Ready")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechRate, setSpeechRate] = useState(1.0)

  const doAction = (label: string, fn: () => void) => {
    fn()
    setLastAction(label)
  }

  const handleSpeak = useCallback(async () => {
    if (!speakText.trim() || isSpeaking) return
    setIsSpeaking(true)
    setLastAction("Speaking...")

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: speakText,
          voiceName: gender === "female" ? "Kore" : "Puck",
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        setLastAction(`TTS Error: ${err.substring(0, 50)}`)
        return
      }

      const data = await res.json()
      if (!data.audioBase64) {
        setLastAction("No audio returned")
        return
      }

      // Decode base64 to PCM16 buffer
      const binaryStr = atob(data.audioBase64)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i)
      }

      // Gemini returns 24kHz PCM16 LE — send directly without resampling
      // TalkingHead's playback worklet will handle the sample rate
      const pcm16 = new Int16Array(bytes.buffer)

      // Get actual AudioContext sample rate from TalkingHead
      const head = avatarRef.current?.getHead()
      const contextRate = head?.audioCtx?.sampleRate || 48000

      // Resample to match AudioContext rate, applying speech rate
      // Higher speechRate = fewer samples = faster playback
      const float32 = pcm16ToFloat32(pcm16)
      const effectiveSourceRate = GEMINI_PCM_RATE * speechRate
      const resampled = resampleAudio(float32, effectiveSourceRate, contextRate)
      const resampledPcm = float32ToPcm16(resampled)

      // Feed to avatar — split into 100ms chunks
      const chunkSize = Math.round(contextRate * 0.1)
      for (let i = 0; i < resampledPcm.length; i += chunkSize) {
        const chunk = resampledPcm.slice(i, i + chunkSize)
        avatarRef.current?.pushAudioChunk(
          new Float32Array(0),
          contextRate,
          chunk.buffer
        )
      }

      setLastAction("Spoke: " + speakText.substring(0, 30) + "...")
    } catch (err) {
      setLastAction(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsSpeaking(false)
    }
  }, [speakText, gender, isSpeaking])

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">🧪 Avatar Test Harness</h1>
          <p className="text-sm text-zinc-500">Test all TalkingHead features — moods, gestures, emoji, views, lip-sync</p>
        </div>
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-1.5 text-xs text-cyan-400 backdrop-blur">
          Last: {lastAction}
        </div>
      </div>

      {/* Avatar Display */}
      <div className="relative h-[500px] w-full overflow-hidden rounded-2xl border border-zinc-700/30 bg-zinc-950/60 p-1 shadow-2xl shadow-cyan-500/5 backdrop-blur md:h-[550px]">
        <TalkingHeadAvatar
          ref={avatarRef}
          gender={gender}
          audioLevel={audioLevel}
          className="h-full w-full"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <button
            onClick={() => setGender("female")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium backdrop-blur transition ${
              gender === "female"
                ? "bg-pink-500/80 text-white"
                : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60"
            }`}
          >
            ♀ Female
          </button>
          <button
            onClick={() => setGender("male")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium backdrop-blur transition ${
              gender === "male"
                ? "bg-blue-500/80 text-white"
                : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60"
            }`}
          >
            ♂ Male
          </button>
        </div>
      </div>

      {/* Controls Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Speak Text — PRIMARY TEST */}
        <Section title="🗣️ Speak Text (Gemini TTS)" className="md:col-span-2">
          <div className="flex gap-2">
            <Input
              value={speakText}
              onChange={(e) => setSpeakText(e.target.value)}
              placeholder="Type something for the avatar to say..."
              className="flex-1 border-zinc-700 bg-zinc-800/50"
              onKeyDown={(e) => e.key === "Enter" && handleSpeak()}
            />
            <Button onClick={handleSpeak} disabled={isSpeaking}>
              {isSpeaking ? "Speaking..." : "Speak"}
            </Button>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Uses Gemini TTS → PCM → TalkingHead streamAudio + HeadAudio lip-sync
          </p>
        </Section>

        {/* Camera Views */}
        <Section title="📷 Camera View">
          <div className="flex flex-wrap gap-2">
            {VIEWS.map((v) => (
              <Button
                key={v.id}
                size="sm"
                variant={activeView === v.id ? "default" : "outline"}
                onClick={() =>
                  doAction(`View: ${v.label}`, () => {
                    setActiveView(v.id)
                    avatarRef.current?.setView(v.id)
                  })
                }
              >
                {v.label}
              </Button>
            ))}
          </div>
        </Section>

        {/* Eye Contact */}
        <Section title="👁️ Eye Contact">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => doAction("Look at camera", () => avatarRef.current?.lookAtCamera(5000))}>
              👁️ Look at Camera
            </Button>
            <Button size="sm" variant="outline" onClick={() => doAction("Look ahead", () => avatarRef.current?.lookAhead(5000))}>
              ➡️ Look Ahead
            </Button>
            <Button size="sm" variant="outline" onClick={() => doAction("Eye contact", () => avatarRef.current?.makeEyeContact(5000))}>
              🤝 Eye Contact
            </Button>
          </div>
        </Section>

        {/* Moods */}
        <Section title="🎭 Moods" className="md:col-span-2">
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <Button
                key={m.id}
                size="sm"
                variant={activeMood === m.id ? "default" : "outline"}
                className={activeMood === m.id ? m.color : ""}
                onClick={() =>
                  doAction(`Mood: ${m.label}`, () => {
                    setActiveMood(m.id)
                    avatarRef.current?.setMood(m.id)
                  })
                }
              >
                {m.label}
              </Button>
            ))}
          </div>
        </Section>

        {/* Gestures */}
        <Section title="🤌 Gestures" className="md:col-span-2">
          <div className="mb-2 flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input type="checkbox" checked={mirrorGesture} onChange={(e) => setMirrorGesture(e.target.checked)} className="rounded" />
              Mirror (right hand)
            </label>
            {activeGesture && (
              <Button size="sm" variant="outline" onClick={() => doAction("Stop gesture", () => { setActiveGesture(null); avatarRef.current?.stopGesture() })}>
                Stop
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {GESTURES.map((g) => (
              <Button
                key={g.id}
                size="sm"
                variant={activeGesture === g.id ? "default" : "outline"}
                onClick={() => doAction(`Gesture: ${g.label}`, () => { setActiveGesture(g.id); avatarRef.current?.playGesture(g.id, 5, mirrorGesture) })}
              >
                {g.label}
              </Button>
            ))}
          </div>
        </Section>

        {/* Emoji Expressions */}
        <Section title="😊 Emoji Expressions" className="md:col-span-2">
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => doAction(`Emoji: ${e}`, () => avatarRef.current?.speakEmoji(e))}
                className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 px-3 py-2 text-2xl transition hover:scale-110 hover:bg-zinc-700/50 active:scale-95"
              >
                {e}
              </button>
            ))}
          </div>
        </Section>

        {/* Speech Rate */}
        <Section title="⚡ Speech Rate">
          <Slider min={0.5} max={2.0} step={0.1} value={[speechRate]} onValueChange={(v) => setSpeechRate(v[0] ?? 1.0)} />
          <p className="mt-1 text-xs text-zinc-500">Rate: {speechRate.toFixed(1)}x {speechRate < 0.8 ? "(slow)" : speechRate > 1.3 ? "(fast)" : "(normal)"}</p>
        </Section>

        {/* Audio Level Sim */}
        <Section title="🔊 Audio Level Simulation">
          <Slider min={0} max={1} step={0.01} value={[audioLevel]} onValueChange={(v) => setAudioLevel(v[0] ?? 0)} />
          <p className="mt-1 text-xs text-zinc-500">Level: {audioLevel.toFixed(2)}</p>
        </Section>
      </div>

      <p className="pb-6 text-center text-xs text-zinc-600">
        TalkingHead v1.7 · HeadAudio lip-sync · Gemini TTS · Built for Avatar Voice Demo
      </p>
    </main>
  )
}

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-zinc-700/30 bg-zinc-900/40 p-4 backdrop-blur ${className}`}>
      <h2 className="mb-3 text-sm font-semibold text-zinc-300">{title}</h2>
      {children}
    </div>
  )
}
