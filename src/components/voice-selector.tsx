"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Play, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GEMINI_VOICES, pcm16ToFloat32, type GeminiVoiceName, type VoiceGender, type TTSModelId } from "@/lib/media-utils"
import { cn } from "@/lib/utils"

interface VoiceSelectorProps {
  value: GeminiVoiceName
  onChange: (voice: GeminiVoiceName) => void
  gender: VoiceGender
  model: TTSModelId
  disabled?: boolean
}

export function VoiceSelector({ value, onChange, gender, model, disabled }: VoiceSelectorProps) {
  const voices = useMemo(() => GEMINI_VOICES.filter((voice) => voice.gender === gender), [gender])
  const [previewing, setPreviewing] = useState<string | null>(null)

  const playPreview = async (voiceName: GeminiVoiceName) => {
    if (previewing) return
    setPreviewing(voiceName)
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `Hi, I am ${voiceName}. Nice to meet you.`, voiceName, model }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || "Preview failed")

      const buffer = Uint8Array.from(atob(json.audioBase64), (c) => c.charCodeAt(0)).buffer
      const float32 = pcm16ToFloat32(new Int16Array(buffer))
      const audioContext = new AudioContext()
      const audioBuffer = audioContext.createBuffer(1, float32.length, json.sampleRate || 24000)
      audioBuffer.copyToChannel(float32, 0)
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)
      source.start()
      source.onended = () => void audioContext.close()
    } catch (error) {
      console.error(error)
    } finally {
      setPreviewing(null)
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {voices.map((voice) => {
        const selected = value === voice.name
        const busy = previewing === voice.name
        return (
          <motion.div key={voice.name} whileHover={{ y: -2 }} className={cn("rounded-2xl border p-4", selected ? "border-cyan-400/60 bg-cyan-500/10" : "border-zinc-800 bg-zinc-900/60")}>
            <button type="button" disabled={disabled} onClick={() => onChange(voice.name)} className="mb-3 block w-full text-left disabled:opacity-60">
              <div className="text-base font-semibold text-zinc-100">{voice.name}</div>
              <div className="text-xs text-zinc-400">{voice.style}</div>
            </button>
            <Button size="sm" variant="outline" className="w-full" onClick={() => playPreview(voice.name)} disabled={disabled || busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Preview
            </Button>
          </motion.div>
        )
      })}
    </div>
  )
}
