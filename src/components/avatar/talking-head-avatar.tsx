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
  /** Feed resampled Float32 audio at AudioContext rate (48kHz) */
  pushAudioChunk: (resampledFloat32: Float32Array) => void
  interrupt: () => void
  startStreaming: () => void
  stopStreaming: () => void
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
    const streamingRef = useRef(false)
    const headAudioReadyRef = useRef(false)
    const headAudioInitPromiseRef = useRef<Promise<void> | null>(null)
    const pendingAudioChunksRef = useRef<Float32Array[]>([])
    const [isReady, setIsReady] = useState(false)
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
    const [errorMsg, setErrorMsg] = useState("")

    useImperativeHandle(
      ref,
      () => ({
        pushAudioChunk: (resampledFloat32: Float32Array) => {
          if (!headRef.current || !isReady || !resampledFloat32?.length) return
          const head = headRef.current

          // Ensure audio context running
          const ctx = head.audioCtx
          if (ctx?.state === "suspended") {
            ctx.resume().catch(() => {})
          }

          // Ensure stream mode active
          if (!streamingRef.current) {
            try {
              head.streamStart({ lipsyncType: "none" })
              streamingRef.current = true
            } catch (e) {
              console.error("[TalkingHead] streamStart failed:", e)
              return
            }
          }

          // Ensure HeadAudio is connected before sending chunks for lip-sync
          if (!headAudioReadyRef.current) {
            pendingAudioChunksRef.current.push(resampledFloat32)
            if (!headAudioInitPromiseRef.current) {
              headAudioInitPromiseRef.current = connectHeadAudio(head).then(() => {
                const queued = pendingAudioChunksRef.current.splice(0)
                for (const chunk of queued) {
                  try { head.streamAudio({ audio: chunk }) } catch {}
                }
              }).finally(() => {
                headAudioInitPromiseRef.current = null
              })
            }
            return
          }

          try {
            head.streamAudio({ audio: resampledFloat32 })
          } catch (e) {
            console.error("[TalkingHead] streamAudio failed:", e)
          }
        },
        interrupt: () => {
          if (!headRef.current || !streamingRef.current) return
          try {
            headRef.current.streamInterrupt()
          } catch {
            // ignore
          }
        },
        startStreaming: () => {
          if (!headRef.current || streamingRef.current) return
          try {
            headRef.current.streamStart()
            streamingRef.current = true
            console.log("[TalkingHead] Stream started")
          } catch (e) {
            console.error("[TalkingHead] streamStart failed:", e)
          }
        },
        stopStreaming: () => {
          if (!headRef.current || !streamingRef.current) return
          try {
            headRef.current.streamStop()
            streamingRef.current = false
            headAudioReadyRef.current = false
            pendingAudioChunksRef.current = []
          } catch {
            // ignore
          }
        },
        setMood: (mood: string) => {
          headRef.current?.setMood(mood)
        },
        setView: (view: string, opt?: Record<string, number>) => {
          headRef.current?.setView(view, opt)
        },
        playGesture: (name: string, dur = 3, mirror = false) => {
          headRef.current?.playGesture(name, dur, mirror)
        },
        stopGesture: () => {
          headRef.current?.stopGesture()
        },
        speakEmoji: (emoji: string) => {
          headRef.current?.speakEmoji(emoji)
        },
        speakText: (text: string) => {
          headRef.current?.speakText(text)
        },
        lookAtCamera: (t = 3000) => {
          headRef.current?.lookAtCamera(t)
        },
        lookAhead: (t = 3000) => {
          headRef.current?.lookAhead(t)
        },
        makeEyeContact: (t = 5000) => {
          headRef.current?.makeEyeContact(t)
        },
        getHead: () => headRef.current,
        connectAudioForLipSync: async () => {
          // Not needed — TalkingHead handles lip-sync internally via streamAudio
        },
      }),
      [isReady]
    )

    // Connect HeadAudio worklet for audio-driven lip-sync
    const connectHeadAudio = async (head: TalkingHeadInstance) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let HeadAudioNode = (window as any).HeadAudioNode
        if (!HeadAudioNode) {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("HeadAudio timeout")), 10000)
            window.addEventListener("headaudio-ready", () => { clearTimeout(timeout); resolve() }, { once: true })
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          HeadAudioNode = (window as any).HeadAudioNode
        }
        if (!HeadAudioNode) { console.error("[HeadAudio] Module not loaded"); return }

        // TalkingHead exposes its AudioContext and speech gain node
        const audioCtx = head.audioCtx
        if (!audioCtx) { console.error("[HeadAudio] No AudioContext on TalkingHead"); return }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const workletUrl = (window as any).__headAudioWorkletUrl
        await audioCtx.audioWorklet.addModule(workletUrl)

        const headAudio = new HeadAudioNode(audioCtx, {
          parameterData: { vadGateActiveDb: -40, vadGateInactiveDb: -60 },
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const modelUrl = (window as any).__headAudioModelUrl
        await headAudio.loadModel(modelUrl)

        // Connect the streaming audio path → HeadAudio (analysis only)
        // Streaming audio flows: playback-worklet → audioStreamGainNode + audioAnalyzerNode
        // We tap into audioStreamGainNode (or audioAnalyzerNode as fallback)
        const sourceNode = head.audioStreamGainNode || head.audioAnalyzerNode || head.audioSpeechGainNode
        if (sourceNode) {
          sourceNode.connect(headAudio)
          console.log("[HeadAudio] Connected to:", head.audioStreamGainNode ? "audioStreamGainNode" : head.audioAnalyzerNode ? "audioAnalyzerNode" : "audioSpeechGainNode")
        } else {
          console.error("[HeadAudio] No audio node found to connect to")
          return
        }

        // Smooth viseme values to prevent jittery lip movement
        const smoothedValues: Record<string, number> = {}
        const SMOOTHING = 0.35 // 0 = no smoothing, 1 = frozen. 0.35 = natural human-like

        headAudio.onvalue = (key: string, value: number) => {
          if (!head.mtAvatar?.[key]) return
          // Exponential smoothing: lerp between current and target
          const prev = smoothedValues[key] ?? 0
          const smoothed = prev + (value - prev) * (1 - SMOOTHING)
          smoothedValues[key] = smoothed
          Object.assign(head.mtAvatar[key], { newvalue: smoothed, needsUpdate: true })
        }

        // Link update to animation loop
        head.opt.update = headAudio.update.bind(headAudio)

        headAudioReadyRef.current = true
        console.log("[HeadAudio] ✅ Connected — audio-driven lip-sync active")
      } catch (err) {
        headAudioReadyRef.current = false
        console.error("[HeadAudio] Failed:", err)
      }
    }

    useEffect(() => {
      let cancelled = false

      const init = async () => {
        if (!containerRef.current) return
        setStatus("loading")
        setErrorMsg("")

        try {
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
            avatarMute: false,
            ttsEndpoint: "about:blank", // Disable built-in Google TTS (we use Gemini TTS)
            avatarIdleEyeContact: 0.35,
            avatarIdleHeadMove: 0.5,
            avatarSpeakingEyeContact: 0.65,
            avatarSpeakingHeadMove: 0.7,
            lipsyncModules: ["en"],
            lipsyncLang: "en",
            pcmSampleRate: 24000, // Gemini outputs 24kHz PCM
          })

          const avatarUrl = gender === "female" ? FEMALE_AVATAR_URL : MALE_AVATAR_URL

          await instance.showAvatar({
            url: avatarUrl,
            body: gender === "female" ? "F" : "M",
            lipsyncLang: "en",
            avatarMood: VIBE_TO_MOOD[vibe],
          })

          if (cancelled) {
            instance.dispose()
            return
          }

          headRef.current = instance

          // Defer streaming + HeadAudio connection until first real audio chunk
          streamingRef.current = false
          headAudioReadyRef.current = false
          pendingAudioChunksRef.current = []

          setIsReady(true)
          setStatus("ready")
          console.log("[TalkingHead] ✅ Avatar loaded, stream/lip-sync will initialize on first audio")
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
        streamingRef.current = false
        headAudioReadyRef.current = false
        headAudioInitPromiseRef.current = null
        pendingAudioChunksRef.current = []
        if (headRef.current) {
          try { headRef.current.streamStop() } catch { /* ignore */ }
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
