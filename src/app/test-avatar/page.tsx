"use client"

import { useRef, useState } from "react"
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

  const doAction = (label: string, fn: () => void) => {
    fn()
    setLastAction(label)
  }

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
        {/* Gender + View overlay */}
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => doAction("Look at camera", () => avatarRef.current?.lookAtCamera(5000))}
            >
              👁️ Look at Camera
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => doAction("Look ahead", () => avatarRef.current?.lookAhead(5000))}
            >
              ➡️ Look Ahead
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => doAction("Eye contact", () => avatarRef.current?.makeEyeContact(5000))}
            >
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
              <input
                type="checkbox"
                checked={mirrorGesture}
                onChange={(e) => setMirrorGesture(e.target.checked)}
                className="rounded"
              />
              Mirror (right hand)
            </label>
            {activeGesture && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  doAction("Stop gesture", () => {
                    setActiveGesture(null)
                    avatarRef.current?.stopGesture()
                  })
                }
              >
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
                onClick={() =>
                  doAction(`Gesture: ${g.label}`, () => {
                    setActiveGesture(g.id)
                    avatarRef.current?.playGesture(g.id, 5, mirrorGesture)
                  })
                }
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

        {/* Speak Text */}
        <Section title="🗣️ Speak Text (requires Google TTS key)" className="md:col-span-2">
          <div className="flex gap-2">
            <Input
              value={speakText}
              onChange={(e) => setSpeakText(e.target.value)}
              placeholder="Type something for the avatar to say..."
              className="flex-1 border-zinc-700 bg-zinc-800/50"
            />
            <Button
              onClick={() =>
                doAction("Speaking...", () => avatarRef.current?.speakText(speakText))
              }
            >
              Speak
            </Button>
          </div>
          <p className="mt-1 text-xs text-zinc-600">
            Note: speakText needs Google Cloud TTS configured. Emoji expressions work without any API.
          </p>
        </Section>

        {/* Audio Level Sim */}
        <Section title="🔊 Audio Level Simulation">
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[audioLevel]}
            onValueChange={(v) => setAudioLevel(v[0] ?? 0)}
          />
          <p className="mt-1 text-xs text-zinc-500">Level: {audioLevel.toFixed(2)}</p>
        </Section>
      </div>

      {/* Footer */}
      <p className="pb-6 text-center text-xs text-zinc-600">
        TalkingHead v1.7 · GLB avatars · Three.js · Built for Avatar Voice Demo
      </p>
    </main>
  )
}

function Section({
  title,
  children,
  className = "",
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border border-zinc-700/30 bg-zinc-900/40 p-4 backdrop-blur ${className}`}
    >
      <h2 className="mb-3 text-sm font-semibold text-zinc-300">{title}</h2>
      {children}
    </div>
  )
}
