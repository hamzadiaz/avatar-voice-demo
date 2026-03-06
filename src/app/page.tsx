"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Languages, Settings2, SlidersHorizontal, Sparkles } from "lucide-react"
import { GenderSelector } from "@/components/gender-selector"
import { LiveConversationPanel } from "@/components/live-conversation-panel"
import { VoiceSelector } from "@/components/voice-selector"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { DEFAULT_TTS_MODEL, GEMINI_VOICES, TTS_MODELS, type GeminiVoiceName, type TTSModelId, type VoiceGender } from "@/lib/media-utils"

type Step = "hero" | "gender" | "voice" | "conversation"

const LANGUAGE_OPTIONS = [
  { value: "en-US", label: "English (US)" },
  { value: "es-ES", label: "Español (ES)" },
  { value: "fr-FR", label: "Français (FR)" },
  { value: "ar-SA", label: "العربية" },
]

export default function Home() {
  const [step, setStep] = useState<Step>("hero")
  const [gender, setGender] = useState<VoiceGender>("female")
  const [voice, setVoice] = useState<GeminiVoiceName>("Kore")
  const [model, setModel] = useState<TTSModelId>(DEFAULT_TTS_MODEL)
  const [languageCode, setLanguageCode] = useState("en-US")
  const [mirroring, setMirroring] = useState(72)

  const currentVoiceValid = useMemo(() => GEMINI_VOICES.some((v) => v.name === voice && v.gender === gender), [voice, gender])

  useEffect(() => {
    if (!currentVoiceValid) {
      const fallback = GEMINI_VOICES.find((v) => v.gender === gender)
      if (fallback) setVoice(fallback.name)
    }
  }, [currentVoiceValid, gender])

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-8">
      <AnimatePresence mode="wait">
        {step === "hero" ? (
          <motion.section key="hero" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="relative overflow-hidden rounded-3xl border border-zinc-700/60 bg-zinc-950/45 px-5 py-10 backdrop-blur-xl md:px-14 md:py-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(34,211,238,0.25),transparent_45%),radial-gradient(circle_at_30%_90%,rgba(244,114,182,0.18),transparent_40%)]" />
            <div className="relative z-10 mx-auto max-w-3xl text-center">
              <Badge className="mb-4 border-cyan-500/30 text-cyan-300"><Sparkles className="mr-1 h-3 w-3" /> Avatar Voice Demo</Badge>
              <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-zinc-100 md:text-6xl">Talk to your AI. Face to face.</h1>
              <p className="mx-auto mt-4 max-w-2xl text-pretty text-zinc-300 md:text-lg">Choose a voice, mirror emotion in real-time, and chat with a live animated avatar with cinematic presence.</p>
              <Button onClick={() => setStep("gender")} className="mt-8 h-12 px-8 text-base" aria-label="Start avatar setup">
                Start Experience <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.section>
        ) : null}

        {step !== "hero" ? (
          <motion.section key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <Badge className="mb-2 border-cyan-500/30 text-cyan-300">Avatar Voice Demo</Badge>
                <h2 className="text-2xl font-semibold leading-tight text-zinc-100 md:text-3xl">
                  {step === "gender" ? "Choose your avatar style" : step === "voice" ? "Pick and preview your voice" : "Live conversation"}
                </h2>
              </div>
              {step !== "conversation" ? <Button variant="ghost" onClick={() => setStep("hero")}>Back to hero</Button> : null}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings2 className="h-4 w-4" /> Settings</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs tracking-wide text-zinc-400"><Languages className="h-3.5 w-3.5" /> Language</div>
                  <Select value={languageCode} onChange={(e) => setLanguageCode(e.target.value)} options={LANGUAGE_OPTIONS} aria-label="Language selector" />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs tracking-wide text-zinc-400">TTS model</div>
                  <Select value={model} onChange={(e) => setModel(e.target.value as TTSModelId)} options={TTS_MODELS.map((m) => ({ value: m.id, label: `${m.name} — ${m.description}` }))} aria-label="Text to speech model" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs tracking-wide text-zinc-400"><SlidersHorizontal className="h-3.5 w-3.5" /> Emotion sync: {mirroring}%</div>
                  <Slider value={[mirroring]} max={100} step={1} onValueChange={(v) => setMirroring(v[0] ?? 72)} aria-label="Emotion sync intensity" />
                </div>
              </CardContent>
            </Card>

            {step === "gender" ? (
              <Card>
                <CardHeader><CardTitle>1) Choose Gender</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <GenderSelector value={gender} onChange={setGender} />
                  <Button onClick={() => setStep("voice")} className="w-full md:w-auto">Continue <ArrowRight className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
            ) : null}

            {step === "voice" ? (
              <Card>
                <CardHeader><CardTitle>2) Pick Voice + Preview</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <VoiceSelector value={voice} onChange={setVoice} gender={gender} model={model} />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={() => setStep("gender")}>Back</Button>
                    <Button onClick={() => setStep("conversation")} className="sm:ml-auto">Go live <ArrowRight className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {step === "conversation" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setStep("voice")}>Change voice</Button>
                  <Button variant="ghost" onClick={() => setStep("hero")}>Home</Button>
                </div>
                <LiveConversationPanel voice={voice} gender={gender} languageCode={languageCode} mirroring={mirroring} />
              </div>
            ) : null}
          </motion.section>
        ) : null}
      </AnimatePresence>
    </main>
  )
}
