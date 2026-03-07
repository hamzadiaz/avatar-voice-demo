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
    const pendingAudioChunksRef = useRef<Float32Array[]>([])
    const processingQueueRef = useRef(false)
    const [isReady, setIsReady] = useState(false)
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
    const [errorMsg, setErrorMsg] = useState("")

    useImperativeHandle(
      ref,
      () => ({
        pushAudioChunk: (resampledFloat32: Float32Array) => {
          if (!headRef.current || !isReady || !resampledFloat32?.length) return

          // Queue incoming chunks to preserve order during async init
          pendingAudioChunksRef.current.push(resampledFloat32)
          if (processingQueueRef.current) return
          processingQueueRef.current = true

          const processQueue = async () => {
            const head = headRef.current
            if (!head) { processingQueueRef.current = false; return }

            try {
              // 1) Resume AudioContext after user gesture-triggered call
              const ctx = head.audioCtx
              if (ctx?.state === "suspended") {
                await ctx.resume()
              }

              // 2) Ensure stream mode active
              if (!streamingRef.current) {
                head.streamStart({ lipsyncType: "none" })
                streamingRef.current = true
              }

              // 3) Set up inline analyser-based lip-sync (no HeadAudio dependency)
              if (!headAudioReadyRef.current) {
                setupAnalyserLipSync(head)
              }

              // 4) Flush all queued audio chunks in order
              const queued = pendingAudioChunksRef.current.splice(0)
              for (const chunk of queued) {
                head.streamAudio({ audio: chunk })
              }
            } catch (e) {
              console.error("[TalkingHead] audio pipeline failed:", e)
            } finally {
              processingQueueRef.current = false
              // If new chunks arrived while processing, run again
              if (pendingAudioChunksRef.current.length > 0) {
                processingQueueRef.current = true
                void processQueue()
              }
            }
          }

          void processQueue()
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

    // Inline analyser-based lip-sync — zero external dependencies
    // Uses a simple AnalyserNode on TalkingHead's audio output to drive mouth visemes
    const setupAnalyserLipSync = (head: TalkingHeadInstance) => {
      try {
        const audioCtx = head.audioCtx
        if (!audioCtx) { console.error("[LipSync] No AudioContext"); return }

        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.4

        // Connect analyser to TalkingHead's audio output chain
        const sourceNode = head.audioReverbNode || head.audioStreamGainNode || head.audioSpeechGainNode
        if (!sourceNode) { console.error("[LipSync] No audio source node"); return }
        sourceNode.connect(analyser)

        const freqData = new Uint8Array(analyser.frequencyBinCount)

        // Viseme morph target keys (RPM/VRM standard)
        const VISEME_AA = "viseme_aa"
        const VISEME_O = "viseme_O"
        const VISEME_E = "viseme_E"
        const VISEME_I = "viseme_I"
        const VISEME_U = "viseme_U"

        // Smoothing state
        let smoothAA = 0
        let smoothO = 0
        let smoothE = 0
        const ATTACK = 0.55  // How fast mouth opens (higher = faster)
        const RELEASE = 0.25 // How fast mouth closes (lower = slower, more natural)

        // Drive visemes from frequency bands in animation loop
        head.opt.update = () => {
          analyser.getByteFrequencyData(freqData)

          // Compute energy in speech-relevant frequency bands (100Hz-4kHz)
          // At 48kHz with 128 bins: each bin ≈ 187.5Hz
          // Band 1 (low vowels, ~100-800Hz): bins 1-4 → drives AA
          // Band 2 (mid vowels, ~800-2kHz): bins 4-10 → drives O/E
          // Band 3 (high freq, ~2k-4kHz): bins 10-22 → drives I/U (less weight)
          let lowSum = 0, midSum = 0, highSum = 0
          for (let i = 1; i <= 4; i++) lowSum += freqData[i]
          for (let i = 4; i <= 10; i++) midSum += freqData[i]
          for (let i = 10; i <= 22; i++) highSum += freqData[i]

          const lowEnergy = (lowSum / 4) / 255
          const midEnergy = (midSum / 7) / 255
          const highEnergy = (highSum / 13) / 255

          // Map energy to viseme targets with natural-looking scaling
          const targetAA = Math.min(1, lowEnergy * 1.8)
          const targetO = Math.min(1, midEnergy * 1.3)
          const targetE = Math.min(1, highEnergy * 0.9)

          // Asymmetric smoothing: fast attack, slow release
          const lerpAA = targetAA > smoothAA ? ATTACK : RELEASE
          const lerpO = targetO > smoothO ? ATTACK : RELEASE
          const lerpE = targetE > smoothE ? ATTACK : RELEASE

          smoothAA += (targetAA - smoothAA) * lerpAA
          smoothO += (targetO - smoothO) * lerpO
          smoothE += (targetE - smoothE) * lerpE

          // Apply to morph targets
          const mt = head.mtAvatar
          if (mt) {
            if (mt[VISEME_AA]) Object.assign(mt[VISEME_AA], { newvalue: smoothAA, needsUpdate: true })
            if (mt[VISEME_O]) Object.assign(mt[VISEME_O], { newvalue: smoothO * 0.6, needsUpdate: true })
            if (mt[VISEME_E]) Object.assign(mt[VISEME_E], { newvalue: smoothE * 0.4, needsUpdate: true })
            if (mt[VISEME_I]) Object.assign(mt[VISEME_I], { newvalue: smoothE * 0.3, needsUpdate: true })
            if (mt[VISEME_U]) Object.assign(mt[VISEME_U], { newvalue: smoothO * 0.3, needsUpdate: true })
          }
        }

        headAudioReadyRef.current = true
        console.log("[LipSync] ✅ Inline analyser lip-sync active — connected to:", head.audioReverbNode ? "audioReverbNode" : "audioStreamGainNode")
      } catch (err) {
        headAudioReadyRef.current = false
        console.error("[LipSync] Failed:", err)
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
        pendingAudioChunksRef.current = []
        processingQueueRef.current = false
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
