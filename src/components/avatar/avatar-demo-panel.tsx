"use client"

import { useState } from "react"
import { VRMAvatarCanvas, type AvatarMode } from "./vrm-avatar-canvas"
import type { VibeType } from "@/lib/constants"

export function AvatarDemoPanel({ avatarUrl }: { avatarUrl: string }) {
  const [vibe, setVibe] = useState<VibeType>("Neutral")
  const [mode, setMode] = useState<AvatarMode>("idle")
  const [audioLevel, setAudioLevel] = useState(0.15)

  return (
    <div className="space-y-4">
      <div className="h-[420px] w-full rounded-2xl bg-transparent">
        <VRMAvatarCanvas avatarUrl={avatarUrl} vibe={vibe} mode={mode} audioLevel={audioLevel} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["Neutral", "Joyful", "Excited", "Chill", "Serious", "Empathetic"] as VibeType[]).map((item) => (
          <button key={item} type="button" className="rounded-md border px-3 py-1 text-sm" onClick={() => setVibe(item)}>
            {item}
          </button>
        ))}
        <button type="button" className="rounded-md border px-3 py-1 text-sm" onClick={() => setMode("idle")}>
          idle
        </button>
        <button type="button" className="rounded-md border px-3 py-1 text-sm" onClick={() => setMode("listening")}>
          listening
        </button>
        <button type="button" className="rounded-md border px-3 py-1 text-sm" onClick={() => setMode("speaking")}>
          speaking
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={audioLevel}
          onChange={(e) => setAudioLevel(Number(e.target.value))}
          className="w-36"
        />
      </div>
    </div>
  )
}
