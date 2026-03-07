"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import html2canvas from "html2canvas"
import { Camera, Loader2, MemoryStick, Mic, MicOff, Send, Share2, Sparkles, Volume2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmotionAnalysis } from "@/components/emotion-analysis"
import { TranscriptPanel } from "@/components/transcript-panel"
import { VibeDisplay } from "@/components/vibe-display"
import { TalkingHeadAvatar, type TalkingHeadAvatarHandle } from "@/components/avatar/talking-head-avatar"

type AvatarMode = "idle" | "listening" | "speaking"
import { EMOTIONAL_MIRRORING_INSTRUCTION } from "@/lib/constants"
import { type GeminiVoiceName, type VoiceGender } from "@/lib/media-utils"
import { useGeminiLive } from "@/hooks/use-gemini-live"

interface LiveConversationPanelProps {
  voice: GeminiVoiceName
  gender: VoiceGender
  languageCode: string
  mirroring: number
}

function playMicClick() {
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = "triangle"
  osc.frequency.setValueAtTime(820, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.06)
  gain.gain.setValueAtTime(0.001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.09)
  void ctx.close()
}

function playConnectedChime() {
  const ctx = new AudioContext()
  const now = ctx.currentTime
  const gain = ctx.createGain()
  gain.gain.value = 0.06
  gain.connect(ctx.destination)

  ;[660, 880, 1047].forEach((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.value = freq
    osc.connect(gain)
    const start = now + i * 0.08
    osc.start(start)
    osc.stop(start + 0.11)
  })

  setTimeout(() => {
    void ctx.close()
  }, 520)
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
  const [speechRate, setSpeechRate] = useState(1)
  const [speechPitch, setSpeechPitch] = useState(0)
  const [isSharing, setIsSharing] = useState(false)

  const dynamicInstruction = `${EMOTIONAL_MIRRORING_INSTRUCTION}\nEmotional mirroring intensity (0-100): ${Math.round(mirroring)}.`
  const captureRef = useRef<HTMLDivElement | null>(null)
  const talkingHeadRef = useRef<TalkingHeadAvatarHandle | null>(null)

  const lipSyncConnectedRef = useRef(false)

  const {
    connectionState,
    toggle,
    disconnect,
    aiVibe,
    transcript,
    userProsody,
    aiProsody,
    sendTextPrompt,
    clearTranscript,
    aiAudioLevel,
    userAudioLevel,
    audioContextRef,
    aiSpeechGainRef,
  } = useGeminiLive({
    voiceName: voice,
    systemInstruction: dynamicInstruction,
    languageCode,
    speechRate,
    speechPitch,
    onAiAudioChunk: () => {
      // Audio playback is handled by the hook's internal queueAudio
      // Lip-sync is handled by HeadAudio worklet connected to the audio output
    },
    onAiAudioInterrupted: () => {
      // HeadAudio follows the audio stream automatically
    },
    onMoodChange: (mood) => {
      talkingHeadRef.current?.setMood(mood)
    },
    onGesture: (gesture) => {
      talkingHeadRef.current?.playGesture(gesture, 4, false)
    },
    onEmoji: (emoji) => {
      talkingHeadRef.current?.speakEmoji(emoji)
    },
    onLook: (direction) => {
      if (direction === "camera") {
        talkingHeadRef.current?.lookAtCamera(4000)
      } else {
        talkingHeadRef.current?.lookAhead(3000)
      }
    },
    externalAudioPlayback: false,
  })

  const isConnected = connectionState === "connected"
  const statusText = useMemo(() => {
    if (connectionState === "connected") return "Connected"
    if (connectionState === "connecting") return "Connecting"
    if (connectionState === "error") return "Error"
    return "Idle"
  }, [connectionState])

  const memoryWindow = 8
  const rememberedMessages = Math.min(memoryWindow, transcript.length)

  const avatarMode = useMemo<AvatarMode>(() => {
    if (!isConnected) return "idle"
    if (aiAudioLevel > 0.04) return "speaking"
    if (userAudioLevel > 0.04) return "listening"
    return "idle"
  }, [aiAudioLevel, isConnected, userAudioLevel])

  useEffect(() => {
    if (isConnected) playConnectedChime()
  }, [isConnected])

  // Connect HeadAudio for lip-sync when conversation is live
  useEffect(() => {
    if (!isConnected || lipSyncConnectedRef.current) return
    const audioCtx = audioContextRef.current
    const speechGain = aiSpeechGainRef.current
    if (!audioCtx || !speechGain || !talkingHeadRef.current) return

    lipSyncConnectedRef.current = true
    talkingHeadRef.current.connectAudioForLipSync(audioCtx, speechGain).catch((err: unknown) => {
      console.error("[LiveConversation] HeadAudio connection failed:", err)
      lipSyncConnectedRef.current = false
    })
  }, [isConnected, audioContextRef, aiSpeechGainRef])

  // Reset lip-sync state on disconnect
  useEffect(() => {
    if (!isConnected) lipSyncConnectedRef.current = false
  }, [isConnected])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        if (event.key === "Enter" && textPrompt.trim() && isConnected) {
          event.preventDefault()
          sendTextPrompt(textPrompt)
          setTextPrompt("")
        }
        return
      }

      if (event.code === "Space") {
        event.preventDefault()
        playMicClick()
        toggle()
      }

      if (event.key === "Escape") {
        event.preventDefault()
        disconnect()
      }

      if (event.key === "Enter" && textPrompt.trim() && isConnected) {
        event.preventDefault()
        sendTextPrompt(textPrompt)
        setTextPrompt("")
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [disconnect, isConnected, sendTextPrompt, textPrompt, toggle])

  const handleMicToggle = () => {
    playMicClick()
    toggle()
  }

  const handleShare = async () => {
    if (!captureRef.current) return
    setIsSharing(true)
    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#020617",
        useCORS: true,
        scale: Math.min(window.devicePixelRatio, 2),
      })
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.96))
      if (!blob) return

      const file = new File([blob], "avatar-voice-share.png", { type: "image/png" })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Avatar Voice Demo",
          text: transcript.at(-1)?.content || "Live avatar voice conversation",
          files: [file],
        })
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = "avatar-voice-share.png"
        link.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className="grid min-h-[68vh] gap-4 lg:grid-cols-[1.25fr_1fr]">
      <Card className="border-zinc-800 bg-zinc-950/70 shadow-[0_0_0_1px_rgba(34,211,238,0.1),0_16px_40px_rgba(8,47,73,0.3)]">
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2">Conversation <Sparkles className="h-4 w-4 text-cyan-300" /></span>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400" : connectionState === "connecting" ? "bg-amber-400" : "bg-zinc-500"}`} />
              {statusText}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div ref={captureRef} className="space-y-3 rounded-2xl border border-cyan-500/20 bg-zinc-950/80 p-2">
            <div className="relative flex min-h-[290px] items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-transparent sm:min-h-[360px]">
              <TalkingHeadAvatar
                ref={talkingHeadRef}
                gender={gender}
                vibe={aiVibe}
                mode={avatarMode}
                audioLevel={aiAudioLevel}
                className="h-[320px] w-full sm:h-[380px]"
              />
              {avatarMode === "speaking" ? <AudioRings level={Math.max(aiAudioLevel, 0.12)} /> : null}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                <MemoryStick className="h-3.5 w-3.5" /> Conversation memory
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-emerald-400/40 bg-emerald-500/10 text-emerald-300">Memory active</Badge>
                <Badge className="border-cyan-500/40 bg-cyan-500/10 text-cyan-200">
                  Remembers {rememberedMessages}/{memoryWindow} recent messages
                </Badge>
              </div>
            </div>

            {transcript.length > 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-200">
                <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Last message snapshot</div>
                <div className="line-clamp-3">{transcript.at(-1)?.content}</div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-zinc-400"><Volume2 className="h-3.5 w-3.5" /> Speech rate: {speechRate.toFixed(2)}x</div>
              <Input type="range" min={0.7} max={1.35} step={0.01} value={speechRate} onChange={(e) => setSpeechRate(Number(e.target.value))} className="accent-cyan-400" />
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
              <div className="mb-1 text-xs text-zinc-400">Pitch: {speechPitch > 0 ? `+${speechPitch}` : speechPitch} cents</div>
              <Input type="range" min={-600} max={600} step={10} value={speechPitch} onChange={(e) => setSpeechPitch(Number(e.target.value))} className="accent-cyan-400" />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Avatar renderer</div>
            <p className="text-xs text-zinc-400">TalkingHead 3D avatar is active with live lip-sync, idle eye contact, and mood-driven expressions.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleMicToggle} variant={isConnected ? "secondary" : "default"} className="h-12 flex-1 min-w-[180px] text-base transition-all duration-200 hover:scale-[1.01]">
              {isConnected ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              {isConnected ? "Stop Live" : "Start Live"}
            </Button>
            <Button variant="outline" onClick={handleShare} disabled={isSharing}>
              {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              Share
            </Button>
            <Button variant="outline" onClick={handleShare} disabled={isSharing} className="sm:hidden">
              <Camera className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={clearTranscript}>Clear</Button>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <VibeDisplay vibe={aiVibe} />
          </div>

          <EmotionAnalysis prosody={userProsody} aiProsody={aiProsody} />

          <div className="flex gap-2">
            <Input value={textPrompt} onChange={(e) => setTextPrompt(e.target.value)} placeholder="Send text during live conversation (Enter to send)" disabled={!isConnected} />
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

          <p className="text-xs text-zinc-500">Shortcuts: <kbd className="rounded border border-zinc-700 px-1">Space</kbd> mic toggle · <kbd className="rounded border border-zinc-700 px-1">Esc</kbd> stop · <kbd className="rounded border border-zinc-700 px-1">Enter</kbd> send</p>
        </CardContent>
      </Card>

      <TranscriptPanel transcript={transcript} />
    </div>
  )
}
