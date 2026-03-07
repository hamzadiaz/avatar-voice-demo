"use client"

import { useState } from "react"
import { TalkingHeadAvatar } from "@/components/avatar/talking-head-avatar"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import type { VibeType } from "@/lib/constants"
import type { AvatarMode } from "@/components/avatar/vrm-avatar-canvas"

const VIBES: VibeType[] = ["Neutral", "Joyful", "Excited", "Chill", "Serious", "Empathetic"]
const MODES: AvatarMode[] = ["idle", "listening", "speaking"]

export default function TestAvatarPage() {
  const [gender, setGender] = useState<"female" | "male">("female")
  const [vibe, setVibe] = useState<VibeType>("Neutral")
  const [mode, setMode] = useState<AvatarMode>("idle")
  const [audioLevel, setAudioLevel] = useState(0.35)
  const [blinkSignal, setBlinkSignal] = useState(0)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-5 px-4 py-6 md:px-8">
      <h1 className="text-2xl font-semibold text-zinc-100">Avatar Test Harness</h1>

      <div className="h-[460px] w-full rounded-2xl border border-zinc-700/50 bg-zinc-950/40 p-2">
        <TalkingHeadAvatar gender={gender} vibe={vibe} mode={mode} audioLevel={audioLevel} className="h-full w-full" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={gender === "female" ? "default" : "outline"} onClick={() => setGender("female")}>Female</Button>
        <Button variant={gender === "male" ? "default" : "outline"} onClick={() => setGender("male")}>Male</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {MODES.map((item) => (
          <Button key={item} variant={mode === item ? "default" : "outline"} onClick={() => setMode(item)}>
            {item}
          </Button>
        ))}
        <Button variant="secondary" onClick={() => setBlinkSignal((v) => v + 1)}>Trigger blink</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {VIBES.map((item) => (
          <Button key={item} variant={vibe === item ? "default" : "outline"} onClick={() => setVibe(item)}>
            {item}
          </Button>
        ))}
      </div>

      <div className="max-w-md space-y-2">
        <p className="text-sm text-zinc-300">Audio level: {audioLevel.toFixed(2)}</p>
        <Slider min={0} max={1} step={0.01} value={[audioLevel]} onValueChange={(v) => setAudioLevel(v[0] ?? 0.35)} />
      </div>
    </main>
  )
}
