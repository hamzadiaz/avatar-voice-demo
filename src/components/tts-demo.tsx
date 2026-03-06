"use client"

import { useState } from "react"
import { Loader2, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { pcm16ToFloat32, type GeminiVoiceName, type TTSModelId } from "@/lib/media-utils"

interface TtsDemoProps {
  voice: GeminiVoiceName
  model: TTSModelId
}

export function TtsDemo({ voice, model }: TtsDemoProps) {
  const [text, setText] = useState("Type here and hear your selected avatar voice.")
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    if (!text.trim() || loading) return
    setLoading(true)
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceName: voice, model }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || "TTS failed")

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
      alert(error instanceof Error ? error.message : "TTS generation failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-28" />
      <Button onClick={handleGenerate} disabled={loading || !text.trim()} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
        {loading ? "Generating..." : "Speak Text"}
      </Button>
    </div>
  )
}
