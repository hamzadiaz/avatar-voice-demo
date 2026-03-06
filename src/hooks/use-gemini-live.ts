"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  analyzeProsody,
  arrayBufferToBase64,
  audioWorkletProcessorCode,
  base64ToArrayBuffer,
  pcm16ToFloat32,
  resampleAudio,
  type ProsodyData,
} from "@/lib/media-utils"
import { VIBE_TYPES, type VibeType } from "@/lib/constants"

export type ConnectionState = "idle" | "connecting" | "connected" | "error"

export interface TranscriptMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface UseGeminiLiveOptions {
  voiceName: string
  systemInstruction?: string
  languageCode?: string
}

const GEMINI_INPUT_SAMPLE_RATE = 16000
const GEMINI_OUTPUT_SAMPLE_RATE = 24000
const VIBE_TAG_REGEX = /\[VIBE:(\w+)\]/gi

export function useGeminiLive({
  voiceName,
  systemInstruction = "",
  languageCode = "en-US",
}: UseGeminiLiveOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle")
  const [userAudioLevel, setUserAudioLevel] = useState(0)
  const [aiAudioLevel, setAiAudioLevel] = useState(0)
  const [userProsody, setUserProsody] = useState<ProsodyData>({ energy: 0, brightness: 0.5 })
  const [aiProsody, setAiProsody] = useState<ProsodyData>({ energy: 0, brightness: 0.5 })
  const [aiVibe, setAiVibe] = useState<VibeType>("Neutral")
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([])

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const userAnalyserRef = useRef<AnalyserNode | null>(null)
  const aiAnalyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const playbackChainRef = useRef<Promise<void>>(Promise.resolve())
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const currentUserTextRef = useRef("")
  const currentAiTextRef = useRef("")

  const addTranscript = useCallback((role: "user" | "assistant", content: string) => {
    if (!content.trim()) return
    setTranscript((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        role,
        content: content.trim(),
        timestamp: new Date(),
      },
    ])
  }, [])

  const stopCurrentAudio = useCallback(() => {
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop()
      } catch {
        // ignore
      }
      currentAudioSourceRef.current = null
    }
  }, [])

  const queueAudio = useCallback((audioData: Float32Array<ArrayBuffer>) => {
    const audioContext = audioContextRef.current
    const analyser = aiAnalyserRef.current
    if (!audioContext) return

    playbackChainRef.current = playbackChainRef.current.then(
      () =>
        new Promise<void>((resolve) => {
          const buffer = audioContext.createBuffer(1, audioData.length, audioContext.sampleRate)
          buffer.copyToChannel(audioData, 0)
          const source = audioContext.createBufferSource()
          source.buffer = buffer
          const gainNode = audioContext.createGain()
          gainNode.gain.value = 1
          source.connect(gainNode)
          gainNode.connect(audioContext.destination)
          if (analyser) gainNode.connect(analyser)
          currentAudioSourceRef.current = source
          source.onended = () => {
            if (currentAudioSourceRef.current === source) currentAudioSourceRef.current = null
            resolve()
          }
          source.start(0)
        })
    )
  }, [])

  const clearPlayback = useCallback(() => {
    stopCurrentAudio()
    playbackChainRef.current = Promise.resolve()
  }, [stopCurrentAudio])

  const updateAudioLevels = useCallback(() => {
    if (userAnalyserRef.current) {
      const dataArray = new Uint8Array(userAnalyserRef.current.frequencyBinCount)
      userAnalyserRef.current.getByteFrequencyData(dataArray)
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      const normalized = avg / 255
      setUserAudioLevel(normalized)
      setUserProsody(analyzeProsody(dataArray, normalized))
    }

    if (aiAnalyserRef.current) {
      const dataArray = new Uint8Array(aiAnalyserRef.current.frequencyBinCount)
      aiAnalyserRef.current.getByteFrequencyData(dataArray)
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      const normalized = avg / 255
      setAiAudioLevel(normalized)
      setAiProsody(analyzeProsody(dataArray, normalized))
    }

    animationFrameRef.current = requestAnimationFrame(updateAudioLevels)
  }, [])

  const parseVibeAndCleanText = useCallback((text: string) => {
    const matches = [...text.matchAll(VIBE_TAG_REGEX)]
    for (const match of matches) {
      const vibe = match[1]
      const normalized = VIBE_TYPES.find((item) => item.toLowerCase() === vibe.toLowerCase())
      if (normalized) setAiVibe(normalized)
    }
    return text.replace(VIBE_TAG_REGEX, "").replace(/\s+/g, " ").trim()
  }, [])

  const disconnect = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    clearPlayback()

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    setConnectionState("idle")
    setUserAudioLevel(0)
    setAiAudioLevel(0)
  }, [clearPlayback])

  const connect = useCallback(async () => {
    if (connectionState === "connecting" || connectionState === "connected") return

    setConnectionState("connecting")

    try {
      const configResponse = await fetch("/api/live-config")
      const configJson = await configResponse.json()
      if (!configResponse.ok) {
        throw new Error(configJson.error || "Failed to fetch live config")
      }

      const { apiKey, liveModel } = configJson as { apiKey: string; liveModel: string }
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      if (audioContext.state === "suspended") await audioContext.resume()

      const blob = new Blob([audioWorkletProcessorCode], { type: "application/javascript" })
      const workletUrl = URL.createObjectURL(blob)
      await audioContext.audioWorklet.addModule(workletUrl)
      URL.revokeObjectURL(workletUrl)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const source = audioContext.createMediaStreamSource(stream)
      const userAnalyser = audioContext.createAnalyser()
      userAnalyser.fftSize = 256
      userAnalyserRef.current = userAnalyser
      source.connect(userAnalyser)

      const aiAnalyser = audioContext.createAnalyser()
      aiAnalyser.fftSize = 256
      aiAnalyserRef.current = aiAnalyser

      const workletNode = new AudioWorkletNode(audioContext, "pcm-processor")
      workletNodeRef.current = workletNode
      source.connect(workletNode)

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        const setupMessage: Record<string, unknown> = {
          setup: {
            model: liveModel,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName,
                  },
                },
                languageCode,
              },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        }

        if (systemInstruction.trim()) {
          ;(setupMessage.setup as Record<string, unknown>).systemInstruction = {
            parts: [{ text: systemInstruction }],
          }
        }

        ws.send(JSON.stringify(setupMessage))
      }

      ws.onmessage = async (event) => {
        let raw = ""
        if (typeof event.data === "string") {
          raw = event.data
        } else if (event.data instanceof Blob) {
          raw = await event.data.text()
        } else {
          raw = new TextDecoder().decode(event.data as ArrayBuffer)
        }

        const data = JSON.parse(raw)

        if (data.setupComplete) {
          setConnectionState("connected")
          updateAudioLevels()
        }

        if (data.serverContent?.interrupted) {
          clearPlayback()
          if (currentAiTextRef.current.trim()) {
            addTranscript("assistant", currentAiTextRef.current)
            currentAiTextRef.current = ""
          }
        }

        if (data.serverContent?.modelTurn?.parts) {
          if (currentUserTextRef.current.trim()) {
            addTranscript("user", currentUserTextRef.current)
            currentUserTextRef.current = ""
          }

          for (const part of data.serverContent.modelTurn.parts as Array<{ inlineData?: { mimeType?: string; data?: string } }>) {
            const inlineData = part.inlineData
            if (inlineData?.mimeType?.startsWith("audio/pcm") && inlineData.data) {
              const pcmBuffer = base64ToArrayBuffer(inlineData.data)
              const float32 = pcm16ToFloat32(new Int16Array(pcmBuffer))
              const outputSampleRate = audioContextRef.current?.sampleRate || 48000
              const resampled = resampleAudio(float32, GEMINI_OUTPUT_SAMPLE_RATE, outputSampleRate)
              queueAudio(resampled)
            }
          }
        }

        if (data.serverContent?.inputTranscription?.text) {
          const text = data.serverContent.inputTranscription.text as string
          const needsSpace = currentUserTextRef.current && !text.startsWith(" ")
          currentUserTextRef.current += `${needsSpace ? " " : ""}${text}`
        }

        if (data.serverContent?.outputTranscription?.text) {
          const text = parseVibeAndCleanText(data.serverContent.outputTranscription.text as string)
          if (text) {
            const needsSpace = currentAiTextRef.current && !text.startsWith(" ")
            currentAiTextRef.current += `${needsSpace ? " " : ""}${text}`
          }
        }

        if (data.serverContent?.turnComplete) {
          if (currentUserTextRef.current.trim()) {
            addTranscript("user", currentUserTextRef.current)
            currentUserTextRef.current = ""
          }
          if (currentAiTextRef.current.trim()) {
            addTranscript("assistant", currentAiTextRef.current)
            currentAiTextRef.current = ""
          }
        }
      }

      ws.onerror = () => {
        setConnectionState("error")
      }

      ws.onclose = () => {
        if (connectionState !== "error") {
          setConnectionState("idle")
        }
      }

      workletNode.port.onmessage = (event) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

        const float32 = event.data.audioData as Float32Array
        const inputSampleRate = audioContextRef.current?.sampleRate || 48000
        const resampled = resampleAudio(float32, inputSampleRate, GEMINI_INPUT_SAMPLE_RATE)

        const int16 = new Int16Array(resampled.length)
        for (let i = 0; i < resampled.length; i++) {
          const s = Math.max(-1, Math.min(1, resampled[i]))
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
        }

        wsRef.current.send(
          JSON.stringify({
            realtimeInput: {
              mediaChunks: [
                {
                  mimeType: "audio/pcm",
                  data: arrayBufferToBase64(int16.buffer),
                },
              ],
            },
          })
        )
      }
    } catch (error) {
      console.error(error)
      disconnect()
      setConnectionState("error")
    }
  }, [
    addTranscript,
    clearPlayback,
    connectionState,
    disconnect,
    languageCode,
    parseVibeAndCleanText,
    queueAudio,
    systemInstruction,
    updateAudioLevels,
    voiceName,
  ])

  const toggle = useCallback(() => {
    if (connectionState === "idle" || connectionState === "error") {
      connect()
    } else {
      disconnect()
    }
  }, [connect, connectionState, disconnect])

  const sendTextPrompt = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !text.trim()) return
    addTranscript("user", text)

    wsRef.current.send(
      JSON.stringify({
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [{ text }],
            },
          ],
          turnComplete: true,
        },
      })
    )
  }, [addTranscript])

  const clearTranscript = useCallback(() => {
    setTranscript([])
  }, [])

  useEffect(() => {
    return () => disconnect()
  }, [disconnect])

  return {
    connectionState,
    userAudioLevel,
    aiAudioLevel,
    userProsody,
    aiProsody,
    aiVibe,
    transcript,
    toggle,
    clearTranscript,
    sendTextPrompt,
  }
}
