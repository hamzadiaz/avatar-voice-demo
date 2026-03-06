"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { GenderSelector } from "@/components/gender-selector"
import { LiveConversationPanel } from "@/components/live-conversation-panel"
import { TtsDemo } from "@/components/tts-demo"
import { VoiceSelector } from "@/components/voice-selector"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { DEFAULT_TTS_MODEL, GEMINI_VOICES, TTS_MODELS, type GeminiVoiceName, type TTSModelId, type VoiceGender } from "@/lib/media-utils"

export default function Home() {
  const [gender, setGender] = useState<VoiceGender>("female")
  const [voice, setVoice] = useState<GeminiVoiceName>("Kore")
  const [model, setModel] = useState<TTSModelId>(DEFAULT_TTS_MODEL)

  const currentVoiceValid = useMemo(() => GEMINI_VOICES.some((v) => v.name === voice && v.gender === gender), [voice, gender])

  useEffect(() => {
    if (!currentVoiceValid) {
      const fallback = GEMINI_VOICES.find((v) => v.gender === gender)
      if (fallback) setVoice(fallback.name)
    }
  }, [currentVoiceValid, gender])

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <Badge className="mb-3 border-cyan-500/30 text-cyan-300"><Sparkles className="mr-1 h-3 w-3" /> Avatar Voice Demo</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 md:text-5xl">Pick Voice, Feel the Vibe</h1>
        <p className="mt-2 text-zinc-400">Gender + voice presets, TTS, and Gemini Live conversation with real-time emotion plane.</p>
      </motion.div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>1) Choose Gender</CardTitle></CardHeader>
          <CardContent>
            <GenderSelector value={gender} onChange={setGender} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>2) Pick Voice + Preview</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <VoiceSelector value={voice} onChange={setVoice} gender={gender} model={model} />
            <Select
              value={model}
              onChange={(e) => setModel(e.target.value as TTSModelId)}
              options={TTS_MODELS.map((m) => ({ value: m.id, label: `${m.name} — ${m.description}` }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>3) Text-to-Speech Mode</CardTitle></CardHeader>
          <CardContent>
            <TtsDemo voice={voice} model={model} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>4) Full-Screen Live Conversation</CardTitle></CardHeader>
          <CardContent>
            <LiveConversationPanel voice={voice} gender={gender} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
