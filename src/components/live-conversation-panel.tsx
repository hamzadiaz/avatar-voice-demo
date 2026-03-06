"use client"

import { useMemo, useState } from "react"
import { Mic, MicOff, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmotionAnalysis } from "@/components/emotion-analysis"
import { TranscriptPanel } from "@/components/transcript-panel"
import { VibeDisplay } from "@/components/vibe-display"
import { SentientOrb } from "@/components/sentient-orb"
import { EMOTIONAL_MIRRORING_INSTRUCTION } from "@/lib/constants"
import { type GeminiVoiceName } from "@/lib/media-utils"
import { useGeminiLive } from "@/hooks/use-gemini-live"

interface LiveConversationPanelProps {
  voice: GeminiVoiceName
}

export function LiveConversationPanel({ voice }: LiveConversationPanelProps) {
  const [textPrompt, setTextPrompt] = useState("")
  const { connectionState, toggle, aiVibe, transcript, userProsody, aiProsody, sendTextPrompt, clearTranscript, aiAudioLevel } = useGeminiLive({
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

  return (
    <div className="grid min-h-[68vh] gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card className="border-zinc-800 bg-zinc-950/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">Conversation <span className="text-sm text-zinc-400">{statusText}</span></CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative flex min-h-[360px] items-center justify-center rounded-3xl border border-zinc-800 bg-black/30">
            <SentientOrb state={connectionState} aiVibe={aiVibe} audioLevel={aiAudioLevel} />
          </div>

          <div className="flex gap-2">
            <Button onClick={toggle} variant={isConnected ? "secondary" : "default"} className="flex-1">
              {isConnected ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isConnected ? "Stop Live" : "Start Live"}
            </Button>
            <Button variant="outline" onClick={clearTranscript}>Clear</Button>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <VibeDisplay vibe={aiVibe} />
          </div>

          <EmotionAnalysis prosody={userProsody} aiProsody={aiProsody} size={220} />

          <div className="flex gap-2">
            <Input value={textPrompt} onChange={(e) => setTextPrompt(e.target.value)} placeholder="Send text during live conversation" disabled={!isConnected} />
            <Button onClick={() => { sendTextPrompt(textPrompt); setTextPrompt("") }} disabled={!isConnected || !textPrompt.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <TranscriptPanel transcript={transcript} />
    </div>
  )
}
