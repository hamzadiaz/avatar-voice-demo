"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"

type VibeType = "Neutral" | "Joyful" | "Excited" | "Chill" | "Serious" | "Empathetic"
type AvatarMode = "idle" | "listening" | "speaking"

interface TalkingHeadAvatarProps {
  gender: "male" | "female"
  vibe?: VibeType
  mode?: AvatarMode
  audioLevel?: number
  className?: string
}

export interface TalkingHeadAvatarHandle {
  pushAudioChunk: (audio: Float32Array, sampleRate: number) => void
  interrupt: () => void
  setMood: (mood: string) => void
  setView: (view: string, opt?: Record<string, number>) => void
  playGesture: (name: string, dur?: number, mirror?: boolean) => void
  stopGesture: () => void
  speakEmoji: (emoji: string) => void
  speakText: (text: string) => void
  lookAtCamera: (t?: number) => void
  lookAhead: (t?: number) => void
  makeEyeContact: (t?: number) => void
  getHead: () => TalkingHeadInstance | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TalkingHeadInstance = any

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

export const TalkingHeadAvatar = forwardRef<TalkingHeadAvatarHandle, TalkingHeadAvatarProps>(
  function TalkingHeadAvatar({ gender, vibe = "Neutral", mode = "idle", audioLevel = 0, className }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const headRef = useRef<TalkingHeadInstance | null>(null)
    const [isReady, setIsReady] = useState(false)
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
    const [errorMsg, setErrorMsg] = useState("")

    useImperativeHandle(
      ref,
      () => ({
        pushAudioChunk: (audio, sampleRate) => {
          if (!headRef.current || !isReady) return
          headRef.current.streamAudio({ audio, sampleRate })
        },
        interrupt: () => {
          if (!headRef.current) return
          headRef.current.streamStop()
          void headRef.current.streamStart({ mood: VIBE_TO_MOOD[vibe] })
        },
        setMood: (mood: string) => {
          if (!headRef.current) return
          headRef.current.setMood(mood)
        },
        setView: (view: string, opt?: Record<string, number>) => {
          if (!headRef.current) return
          headRef.current.setView(view, opt)
        },
        playGesture: (name: string, dur = 3, mirror = false) => {
          if (!headRef.current) return
          headRef.current.playGesture(name, dur, mirror)
        },
        stopGesture: () => {
          if (!headRef.current) return
          headRef.current.stopGesture()
        },
        speakEmoji: (emoji: string) => {
          if (!headRef.current) return
          headRef.current.speakEmoji(emoji)
        },
        speakText: (text: string) => {
          if (!headRef.current) return
          headRef.current.speakText(text)
        },
        lookAtCamera: (t = 3000) => {
          if (!headRef.current) return
          headRef.current.lookAtCamera(t)
        },
        lookAhead: (t = 3000) => {
          if (!headRef.current) return
          headRef.current.lookAhead(t)
        },
        makeEyeContact: (t = 5000) => {
          if (!headRef.current) return
          headRef.current.makeEyeContact(t)
        },
        getHead: () => headRef.current,
      }),
      [isReady, mode, vibe]
    )

    useEffect(() => {
      let cancelled = false

      const init = async () => {
        if (!containerRef.current) return
        setStatus("loading")
        setErrorMsg("")

        try {
          const moduleUrl =
            "https://cdn.jsdelivr.net/npm/@met4citizen/talkinghead@1.7.0/modules/talkinghead.mjs"
          const mod = await import(/* webpackIgnore: true */ moduleUrl)
          const TalkingHead = mod.TalkingHead || mod.default
          if (!TalkingHead) throw new Error("TalkingHead class not found in module")
          if (cancelled || !containerRef.current) return

          const instance = new TalkingHead(containerRef.current, {
            modelFPS: 30,
            modelPixelRatio: Math.min(window.devicePixelRatio || 1, 2),
            cameraView: "upper",
            cameraZoomEnable: false,
            cameraPanEnable: false,
            cameraRotateEnable: true,
            lightAmbientIntensity: 2,
            lightDirectIntensity: 26,
            lightSpotIntensity: 0,
            avatarMood: VIBE_TO_MOOD[vibe],
            avatarIdleEyeContact: 0.35,
            avatarIdleHeadMove: 0.5,
            avatarSpeakingEyeContact: 0.65,
            avatarSpeakingHeadMove: 0.7,
            avatarListeningEyeContact: 0.55,
            lipsyncModules: ["en"],
            lipsyncLang: "en",
          })

          const avatarUrl = gender === "female" ? FEMALE_AVATAR_URL : MALE_AVATAR_URL

          await instance.showAvatar({
            url: avatarUrl,
            body: gender === "female" ? "F" : "M",
            lipsyncLang: "en",
            avatarMood: VIBE_TO_MOOD[vibe],
            avatarMute: false,
            avatarIdleEyeContact: 0.35,
            avatarIdleHeadMove: 0.5,
            avatarSpeakingEyeContact: 0.65,
            avatarSpeakingHeadMove: 0.7,
            avatarListeningEyeContact: 0.55,
          })

          if (cancelled) {
            instance.dispose()
            return
          }

          // Start streaming mode so streamAudio() works for lip-sync
          await instance.streamStart({
            mood: VIBE_TO_MOOD[vibe],
            waitForAudioChunks: true,
          })

          headRef.current = instance
          setIsReady(true)
          setStatus("ready")
        } catch (error) {
          console.error("[TalkingHead] Failed:", error)
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
    }, [gender]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      if (!headRef.current || !isReady) return
      headRef.current.setMood(VIBE_TO_MOOD[vibe])
    }, [isReady, vibe])

    return (
      <div className={className}>
        <div className="relative h-full w-full">
          <div
            ref={containerRef}
            className="h-full w-full rounded-2xl"
            style={{
              background: "linear-gradient(180deg, #0a0a1a 0%, #111127 100%)",
              filter: isReady
                ? `drop-shadow(0 0 ${8 + audioLevel * 22}px rgba(56, 189, 248, ${0.12 + audioLevel * 0.3}))`
                : undefined,
            }}
          />

          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-zinc-950/80">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <p className="mt-3 text-sm text-zinc-400">Loading 3D avatar...</p>
            </div>
          )}

          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-zinc-950/80 p-4">
              <p className="text-sm font-medium text-red-400">Avatar failed to load</p>
              <p className="mt-1 text-center text-xs text-zinc-500">{errorMsg}</p>
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
  }
)
