import { NextResponse } from "next/server"

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY
  const liveModel = process.env.GEMINI_LIVE_MODEL || "models/gemini-2.5-flash-native-audio-preview-12-2025"

  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is missing" }, { status: 500 })
  }

  return NextResponse.json({ apiKey, liveModel })
}
