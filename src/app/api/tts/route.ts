import { NextRequest, NextResponse } from "next/server"
import { DEFAULT_TTS_MODEL, DEFAULT_VOICE, type GeminiVoiceName, type TTSModelId } from "@/lib/media-utils"

interface TtsRequestBody {
  text: string
  voiceName?: GeminiVoiceName
  model?: TTSModelId
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is missing" }, { status: 500 })
  }

  const body = (await request.json()) as TtsRequestBody
  const text = body.text?.trim()
  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 })
  }

  const voiceName = body.voiceName || DEFAULT_VOICE
  const model = body.model || DEFAULT_TTS_MODEL

  const payload = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      response_modalities: ["AUDIO"],
      speech_config: {
        voice_config: {
          prebuilt_voice_config: {
            voice_name: voiceName,
          },
        },
      },
    },
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    return NextResponse.json({ error }, { status: response.status })
  }

  const data = await response.json()
  const inlineData = data.candidates?.[0]?.content?.parts?.find(
    (part: { inlineData?: { data?: string; mimeType?: string } }) => part.inlineData?.data
  )?.inlineData

  if (!inlineData?.data) {
    return NextResponse.json({ error: "No audio returned by Gemini" }, { status: 502 })
  }

  return NextResponse.json({
    audioBase64: inlineData.data,
    mimeType: inlineData.mimeType || "audio/pcm;rate=24000",
    sampleRate: 24000,
  })
}
