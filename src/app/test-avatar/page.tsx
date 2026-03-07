"use client"

import { useRef, useState } from "react"
import { TalkingHeadAvatar, type TalkingHeadAvatarHandle } from "@/components/avatar/talking-head-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import type { VibeType } from "@/lib/constants"

type AvatarMode = "idle" | "listening" | "speaking"

const VIEWS = ["full", "mid", "upper", "head"]
const MOODS = ["neutral", "happy", "angry", "sad", "fear", "disgust", "love", "sleep"]
const GESTURES = ["handup", "index", "ok", "thumbup", "thumbdown", "side", "shrug"]
const EMOJIS = ["😊", "😂", "😍", "😢", "😡", "😱", "🤔", "😴"]

export default function TestAvatarPage() {
  const avatarRef = useRef<TalkingHeadAvatarHandle | null>(null)
  const [gender, setGender] = useState<"female" | "male">("female")
  const [vibe] = useState<VibeType>("Neutral")
  const [mode] = useState<AvatarMode>("idle")
  const [audioLevel, setAudioLevel] = useState(0.35)
  const [currentView, setCurrentView] = useState("upper")
  const [currentMood, setCurrentMood] = useState("neutral")
  const [mirrorGesture, setMirrorGesture] = useState(false)

  const handleViewChange = (view: string) => {
    setCurrentView(view)
    avatarRef.current?.setView(view)
  }

  const handleMoodChange = (mood: string) => {
    setCurrentMood(mood)
    avatarRef.current?.setMood(mood)
  }

  const handleGesture = (name: string) => {
    avatarRef.current?.playGesture(name, undefined, mirrorGesture)
  }

  const handleEmoji = (emoji: string) => {
    avatarRef.current?.speakEmoji(emoji)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-zinc-100">TalkingHead Test Harness</h1>
        <div className="flex gap-2">
          <Button variant={gender === "female" ? "default" : "outline"} onClick={() => setGender("female")}>
            Female
          </Button>
          <Button variant={gender === "male" ? "default" : "outline"} onClick={() => setGender("male")}>
            Male
          </Button>
        </div>
      </div>

      {/* Avatar Display */}
      <Card className="border-zinc-800 bg-zinc-950/70">
        <CardContent className="p-4">
          <div className="h-[500px] w-full">
            <TalkingHeadAvatar
              ref={avatarRef}
              gender={gender}
              vibe={vibe}
              mode={mode}
              audioLevel={audioLevel}
              className="h-full w-full"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Camera Views */}
        <Card className="border-zinc-800 bg-zinc-950/70">
          <CardHeader>
            <CardTitle className="text-lg text-zinc-100">Camera Views</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {VIEWS.map((view) => (
              <Button
                key={view}
                variant={currentView === view ? "default" : "outline"}
                onClick={() => handleViewChange(view)}
              >
                {view}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Moods */}
        <Card className="border-zinc-800 bg-zinc-950/70">
          <CardHeader>
            <CardTitle className="text-lg text-zinc-100">Moods</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {MOODS.map((mood) => (
              <Button
                key={mood}
                variant={currentMood === mood ? "default" : "outline"}
                onClick={() => handleMoodChange(mood)}
              >
                {mood}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Gestures */}
        <Card className="border-zinc-800 bg-zinc-950/70">
          <CardHeader>
            <CardTitle className="text-lg text-zinc-100">Gestures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="mirror"
                checked={mirrorGesture}
                onChange={(e) => setMirrorGesture(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="mirror" className="text-sm text-zinc-300">
                Mirror gesture
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {GESTURES.map((gesture) => (
                <Button key={gesture} variant="outline" onClick={() => handleGesture(gesture)}>
                  {gesture}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Emojis */}
        <Card className="border-zinc-800 bg-zinc-950/70">
          <CardHeader>
            <CardTitle className="text-lg text-zinc-100">Emoji Expressions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {EMOJIS.map((emoji) => (
              <Button key={emoji} variant="outline" onClick={() => handleEmoji(emoji)} className="text-2xl">
                {emoji}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Eye Contact */}
        <Card className="border-zinc-800 bg-zinc-950/70">
          <CardHeader>
            <CardTitle className="text-lg text-zinc-100">Eye Contact</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => avatarRef.current?.lookAtCamera()}>
              Look at Camera
            </Button>
            <Button variant="outline" onClick={() => avatarRef.current?.lookAhead()}>
              Look Ahead
            </Button>
          </CardContent>
        </Card>

        {/* Audio Level */}
        <Card className="border-zinc-800 bg-zinc-950/70">
          <CardHeader>
            <CardTitle className="text-lg text-zinc-100">Audio Level</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-zinc-300">Level: {audioLevel.toFixed(2)}</div>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[audioLevel]}
              onValueChange={(v) => setAudioLevel(v[0] ?? 0.35)}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
