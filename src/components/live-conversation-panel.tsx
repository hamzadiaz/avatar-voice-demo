"use client"

import { useMemo, useState } from "react"
import { Loader2, Mic, MicOff, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmotionAnalysis } from "@/components/emotion-analysis"
import { TranscriptPanel } from "@/components/transcript-panel"
import { VibeDisplay } from "@/components/vibe-display"
import { VRMAvatarCanvas, type AvatarMode } from "@/components/avatar/vrm-avatar-canvas"
import { EMOTIONAL_MIRRORING_INSTRUCTION } from "@/lib/constants"
import { type GeminiVoiceName, type VoiceGender } from "@/lib/media-utils"
import { useGeminiLive } from "@/hooks/use-gemini-live"

interface LiveConversationPanelProps {
  voice: GeminiVoiceName
  gender: VoiceGender
  languageCode: string
  mirroring: number
}

function AudioRings({ level }: { level: number }) {
  const bars = new Array(18).fill(0)
  return (
    <div className="pointer-events-none absolute inset-x-6 bottom-6 z-10 flex items-end justify-center gap-1">
      {bars.map((_, i) => {
        const phase = i * 0.35
        const height = Math.max(8, Math.min(44, (Math.sin(Date.now() / 200 + phase) * 0.5 + 0.5) * level * 100 + 8))
        return <div key={i} className="w-1.5 rounded-full bg-cyan-300/70" style={{ height }} />
      })}
    </div>
  )
}

export function LiveConversationPanel({ voice, gender, languageCode, mirroring }: LiveConversationPanelProps) {
  const [textPrompt, setTextPrompt] = useState("")
  const [avatarLoading, setAvatarLoading] = useState(true)
  const dynamicInstruction = `${EMOTIONAL_MIRRORING_INSTRUCTION}\nEmotional mirroring intensity (0-100): ${Math.round(mirroring)}.`

  const { connectionState, toggle, aiVibe, transcript, userProsody, aiProsody, sendTextPrompt, clearTranscript, aiAudioLevel, userAudioLevel } = useGeminiLive({
    voiceName: voice,
    systemInstruction: dynamicInstruction,
    languageCode,
  })

  const isConnected = connectionState === "connected"
  const statusText = useMemo(() => {
    if (connectionState === "connected") return "Connected"
    if (connectionState === "connecting") return "Connecting"
    if (connectionState === "error") return "Error"
    return "Idle"
  }, [connectionState])

  const avatarUrl = gender === "male" ? "/avatars/male.vrm" : "/avatars/female.vrm"

  const avatarMode = useMemo<AvatarMode>(() => {
    if (!isConnected) return "idle"
    if (aiAudioLevel > 0.04) return "speaking"
    if (userAudioLevel > 0.04) return "listening"
    return "idle"
  }, [aiAudioLevel, isConnected, userAudioLevel])

  return (
    <div className="grid min-h-[68vh] gap-4 lg:grid-cols-[1.25fr_1fr]">
      <Card className="border-zinc-800 bg-zinc-950/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            Conversation
            <span className="flex items-center gap-2 text-sm text-zinc-400">
              <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400" : connectionState === "connecting" ? "bg-amber-400" : "bg-zinc-500"}`} />
              {statusText}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-3xl border border-zinc-800 bg-transparent">
            <VRMAvatarCanvas avatarUrl={avatarUrl} vibe={aiVibe} mode={avatarMode} audioLevel={aiAudioLevel} className="h-[380px] w-full" onLoadStateChange={setAvatarLoading} />
            {avatarLoading ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm">
                <div className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/90 px-4 py-2 text-sm text-zinc-300">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading avatar
                </div>
              </div>
            ) : null}
            {avatarMode === "speaking" ? <AudioRings level={Math.max(aiAudioLevel, 0.12)} /> : null}
          </div>

          <div className="flex gap-2">
            <Button onClick={toggle} variant={isConnected ? "secondary" : "default"} className="h-12 flex-1 text-base">
              {isConnected ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              {isConnected ? "Stop Live" : "Start Live"}
            </Button>
            <Button variant="outline" onClick={clearTranscript}>
              Clear
            </Button>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <VibeDisplay vibe={aiVibe} />
          </div>

          <EmotionAnalysis prosody={userProsody} aiProsody={aiProsody} size={220} />

          <div className="flex gap-2">
            <Input value={textPrompt} onChange={(e) => setTextPrompt(e.target.value)} placeholder="Send text during live conversation" disabled={!isConnected} />
            <Button
              onClick={() => {
                sendTextPrompt(textPrompt)
                setTextPrompt("")
              }}
              disabled={!isConnected || !textPrompt.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <TranscriptPanel transcript={transcript} />
    </div>
  )
}
