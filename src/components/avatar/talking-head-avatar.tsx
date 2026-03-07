"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"

type VibeType = "Neutral" | "Joyful" | "Excited" | "Chill" | "Serious" | "Empathetic"

interface TalkingHeadAvatarProps {
  gender: "male" | "female"
  vibe?: VibeType
  mode?: string
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getHead: () => any
  /** Connect an external AudioContext's audio node for HeadAudio lip-sync */
  connectAudioForLipSync: (audioCtx: AudioContext, sourceNode: AudioNode) => Promise<void>
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
  function TalkingHeadAvatar({ gender, vibe = "Neutral", audioLevel = 0, className }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const headRef = useRef<TalkingHeadInstance | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const headAudioRef = useRef<any>(null)
    const [isReady, setIsReady] = useState(false)
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
    const [errorMsg, setErrorMsg] = useState("")

    useImperativeHandle(
      ref,
      () => ({
        pushAudioChunk: () => {
          // Audio-driven lip-sync is handled by HeadAudio worklet
          // No need to push chunks manually anymore
        },
        interrupt: () => {
          // Nothing to interrupt in HeadAudio mode — it follows audio automatically
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
        connectAudioForLipSync: async (audioCtx: AudioContext, sourceNode: AudioNode) => {
          const head = headRef.current
          if (!head || !isReady) {
            console.warn("[TalkingHead] Not ready for HeadAudio connection")
            return
          }

          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let HeadAudioNode = (window as any).HeadAudioNode
            if (!HeadAudioNode) {
              await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error("HeadAudio load timeout")), 10000)
                window.addEventListener("headaudio-ready", () => { clearTimeout(timeout); resolve() }, { once: true })
              })
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              HeadAudioNode = (window as any).HeadAudioNode
            }
            if (!HeadAudioNode) {
              console.error("[HeadAudio] Module not available")
              return
            }

            // Register the worklet processor
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const workletUrl = (window as any).__headAudioWorkletUrl
            await audioCtx.audioWorklet.addModule(workletUrl)

            // Create HeadAudio node
            const headAudio = new HeadAudioNode(audioCtx, {
              parameterData: {
                vadGateActiveDb: -40,
                vadGateInactiveDb: -60,
              },
            })

            // Load the pre-trained viseme model
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const modelUrl = (window as any).__headAudioModelUrl
            await headAudio.loadModel(modelUrl)

            // Connect audio source → HeadAudio (for analysis only, no audio output)
            sourceNode.connect(headAudio)

            // Set the callback to drive TalkingHead's blend shapes
            headAudio.onvalue = (key: string, value: number) => {
              if (head.mtAvatar && head.mtAvatar[key]) {
                Object.assign(head.mtAvatar[key], { newvalue: value, needsUpdate: true })
              }
            }

            // Link HeadAudio's update to TalkingHead's animation loop
            head.opt.update = headAudio.update.bind(headAudio)

            headAudioRef.current = headAudio
            console.log("[HeadAudio] ✅ Connected for audio-driven lip-sync")
          } catch (err) {
            console.error("[HeadAudio] Failed to connect:", err)
          }
        },
      }),
      [isReady]
    )

    useEffect(() => {
      let cancelled = false

      const init = async () => {
        if (!containerRef.current) return
        setStatus("loading")
        setErrorMsg("")

        try {
          // Wait for TalkingHead to be loaded by the global loader script
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let TalkingHead = (window as any).TalkingHead
          if (!TalkingHead) {
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error("TalkingHead load timeout (15s)")), 15000)
              window.addEventListener("talkinghead-ready", () => {
                clearTimeout(timeout)
                resolve()
              }, { once: true })
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            TalkingHead = (window as any).TalkingHead
          }
          if (!TalkingHead) throw new Error("TalkingHead class not found on window")
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
            avatarMute: true, // We handle audio playback externally
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
            avatarMute: true,
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
