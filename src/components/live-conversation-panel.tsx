"use client"

import { useMemo, useState } from "react"
import { Mic, MicOff, Send } from "lucide-react"
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
}

export function LiveConversationPanel({ voice, gender }: LiveConversationPanelProps) {
  const [textPrompt, setTextPrompt] = useState("")
  const { connectionState, toggle, aiVibe, transcript, userProsody, aiProsody, sendTextPrompt, clearTranscript, aiAudioLevel, userAudioLevel } = useGeminiLive({
    voiceName: voice,
    systemInstruction: EMOTIONAL_MIRRORING_INSTRUCTION,
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
    <div className="grid min-h-[68vh] gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card className="border-zinc-800 bg-zinc-950/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            Conversation <span className="text-sm text-zinc-400">{statusText}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-3xl border border-zinc-800 bg-transparent">
            <VRMAvatarCanvas avatarUrl={avatarUrl} vibe={aiVibe} mode={avatarMode} audioLevel={aiAudioLevel} className="h-[380px] w-full" />
          </div>

          <div className="flex gap-2">
            <Button onClick={toggle} variant={isConnected ? "secondary" : "default"} className="flex-1">
              {isConnected ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
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
