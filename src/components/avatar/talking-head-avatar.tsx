"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import type { VibeType } from "@/lib/constants"
import type { AvatarMode } from "./vrm-avatar-canvas"

interface TalkingHeadAvatarProps {
  gender: "male" | "female"
  vibe: VibeType
  mode: AvatarMode
  audioLevel: number
  className?: string
}

export interface TalkingHeadAvatarHandle {
  pushAudioChunk: (audio: Float32Array, sampleRate: number) => void
  interrupt: () => void
}

type TalkingHeadInstance = {
  showAvatar: (avatar: {
    url: string
    body?: "F" | "M"
    lipsyncLang?: string
    avatarMood?: string
    avatarMute?: boolean
    avatarIdleEyeContact?: number
    avatarIdleHeadMove?: number
    avatarSpeakingEyeContact?: number
    avatarSpeakingHeadMove?: number
    avatarListeningEyeContact?: number
  }) => Promise<void>
  streamStart: (opt?: { mood?: string; waitForAudioChunks?: boolean }) => Promise<void>
  streamAudio: (data: { audio: Float32Array; sampleRate?: number }) => void
  streamStop: () => void
  setMood: (mood: string) => void
  dispose: () => void
}

const FEMALE_AVATAR_URL = "/avatars-3d/female.glb"
const MALE_AVATAR_URL = "/avatars-3d/male.glb"

const VIBE_TO_MOOD: Record<VibeType, string> = {
  Neutral: "neutral",
  Joyful: "happy",
  Excited: "love",
  Chill: "neutral",
  Serious: "neutral",
  Empathetic: "sad",
}

export const TalkingHeadAvatar = forwardRef<TalkingHeadAvatarHandle, TalkingHeadAvatarProps>(function TalkingHeadAvatar(
  { gender, vibe, mode, audioLevel, className },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const headRef = useRef<TalkingHeadInstance | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState("")

  useImperativeHandle(ref, () => ({
    pushAudioChunk: (audio, sampleRate) => {
      if (!headRef.current || !isReady || mode !== "speaking") return
      headRef.current.streamAudio({ audio, sampleRate })
    },
    interrupt: () => {
      if (!headRef.current) return
      headRef.current.streamStop()
      void headRef.current.streamStart({ mood: VIBE_TO_MOOD[vibe] })
    },
  }), [isReady, mode, vibe])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      if (!containerRef.current) return
      setStatus("loading")
      setErrorMsg("")

      try {
        console.log("[TalkingHead] Loading module from CDN...")
        const moduleUrl = "https://cdn.jsdelivr.net/npm/@met4citizen/talkinghead@1.7.0/modules/talkinghead.mjs"
        const mod = await import(/* webpackIgnore: true */ moduleUrl)
        const TalkingHead = mod.TalkingHead || mod.default
        if (!TalkingHead) throw new Error("TalkingHead class not found in module")
        if (cancelled || !containerRef.current) return
        console.log("[TalkingHead] Module loaded, creating instance...")

        const instance = new TalkingHead(containerRef.current, {
          modelFPS: 30,
          modelPixelRatio: Math.min(window.devicePixelRatio || 1, 2),
          cameraView: "upper",
          cameraZoomEnable: false,
          cameraPanEnable: false,
          cameraRotateEnable: false,
          lightAmbientIntensity: 2,
          lightDirectIntensity: 26,
          lightSpotIntensity: 0,
          avatarMood: VIBE_TO_MOOD[vibe],
          avatarIdleEyeContact: 0.35,
          avatarIdleHeadMove: 0.5,
          avatarSpeakingEyeContact: 0.65,
          avatarSpeakingHeadMove: 0.7,
          avatarListeningEyeContact: 0.55,
        }) as TalkingHeadInstance

        const avatarUrl = gender === "female" ? FEMALE_AVATAR_URL : MALE_AVATAR_URL
        console.log(`[TalkingHead] Loading avatar: ${avatarUrl}`)

        await instance.showAvatar({
          url: avatarUrl,
          body: gender === "female" ? "F" : "M",
          lipsyncLang: "en",
          avatarMood: VIBE_TO_MOOD[vibe],
          avatarMute: true,
          avatarIdleEyeContact: 0.35,
          avatarIdleHeadMove: 0.5,
          avatarSpeakingEyeContact: 0.65,
          avatarSpeakingHeadMove: 0.7,
          avatarListeningEyeContact: 0.55,
        })
        console.log("[TalkingHead] Avatar loaded, starting stream...")

        await instance.streamStart({ mood: VIBE_TO_MOOD[vibe], waitForAudioChunks: false })

        if (cancelled) {
          instance.dispose()
          return
        }

        headRef.current = instance
        setIsReady(true)
        setStatus("ready")
        console.log("[TalkingHead] ✅ Ready!")
      } catch (error) {
        console.error("[TalkingHead] ❌ Failed to initialize:", error)
        setStatus("error")
        setErrorMsg(error instanceof Error ? error.message : String(error))
        setIsReady(false)
      }
    }

    void init()

    return () => {
      cancelled = true
      setIsReady(false)
      if (headRef.current) {
        headRef.current.dispose()
        headRef.current = null
      }
    }
  }, [gender])

  useEffect(() => {
    if (!headRef.current || !isReady) return
    headRef.current.setMood(VIBE_TO_MOOD[vibe])
  }, [isReady, vibe])

  useEffect(() => {
    if (!headRef.current || !isReady) return
    if (mode !== "speaking") {
      headRef.current.streamStop()
      void headRef.current.streamStart({ mood: VIBE_TO_MOOD[vibe], waitForAudioChunks: false })
    }
  }, [isReady, mode, vibe])

  return (
    <div className={className}>
      <div className="relative h-full w-full">
        {/* TalkingHead container — always mounted */}
        <div
          ref={containerRef}
          className="h-full w-full rounded-2xl"
          style={{
            background: "linear-gradient(180deg, #0a0a1a 0%, #111127 100%)",
            filter: isReady ? `drop-shadow(0 0 ${8 + audioLevel * 22}px rgba(56, 189, 248, ${0.12 + audioLevel * 0.3}))` : undefined,
          }}
        />

        {/* Loading overlay */}
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-zinc-950/80">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <p className="mt-3 text-sm text-zinc-400">Loading 3D avatar...</p>
          </div>
        )}

        {/* Error overlay */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-zinc-950/80 p-4">
            <p className="text-sm font-medium text-red-400">Avatar failed to load</p>
            <p className="mt-1 text-xs text-zinc-500 text-center">{errorMsg}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 rounded-lg bg-cyan-600 px-4 py-1.5 text-xs text-white hover:bg-cyan-500"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
})
