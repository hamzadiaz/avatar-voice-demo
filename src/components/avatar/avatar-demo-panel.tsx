"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { VRMAvatarCanvas, type AvatarMode } from "./vrm-avatar-canvas"
import type { VibeType } from "@/lib/constants"

export function AvatarDemoPanel({ avatarUrl }: { avatarUrl: string }) {
  const [vibe, setVibe] = useState<VibeType>("Neutral")
  const [mode, setMode] = useState<AvatarMode>("idle")
  const [audioLevel, setAudioLevel] = useState(0.15)

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="h-[420px] w-full rounded-2xl bg-transparent">
          <VRMAvatarCanvas avatarUrl={avatarUrl} vibe={vibe} mode={mode} audioLevel={audioLevel} />
        </div>

        <div className="flex flex-wrap gap-2">
          {(["Neutral", "Joyful", "Excited", "Chill", "Serious", "Empathetic"] as VibeType[]).map((item) => (
            <Button key={item} type="button" variant="outline" size="sm" onClick={() => setVibe(item)}>
              {item}
            </Button>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={() => setMode("idle")}>idle</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setMode("listening")}>listening</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setMode("speaking")}>speaking</Button>
        </div>
        <Slider min={0} max={1} step={0.01} value={[audioLevel]} onValueChange={(v) => setAudioLevel(v[0] ?? 0.15)} aria-label="Audio level" />
      </CardContent>
    </Card>
  )
}
