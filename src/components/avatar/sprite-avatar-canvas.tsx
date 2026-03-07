"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { VibeType } from "@/lib/constants"
import type { AvatarMode } from "./vrm-avatar-canvas"

interface SpriteAvatarCanvasProps {
  gender: "male" | "female"
  vibe: VibeType
  mode: AvatarMode
  audioLevel: number
  className?: string
}

// ── Human-like timing constants ──
const BLINK_DURATION_MS = 100        // Human blink: 100-150ms
const BLINK_MIN_INTERVAL = 2000      // Min time between blinks
const BLINK_MAX_INTERVAL = 5000      // Max time between blinks
const BREATHING_CYCLE_MS = 4000      // Full breath cycle: ~4s
const SPEAK_FRAME_MIN_MS = 80        // Fast mouth movement at high audio
const SPEAK_FRAME_MAX_MS = 250       // Slow mouth movement at low audio

// Speaking mouth shapes cycle: closed → slight → wide → E-shape → slight → closed
const SPEAK_FRAMES = ["speaking-a", "speaking-b", "speaking-c", "speaking-a"] as const

export function SpriteAvatarCanvas({ gender, vibe, mode, audioLevel, className }: SpriteAvatarCanvasProps) {
  const base = `/avatar-frames/${gender}`

  // ── Blink state ──
  const [isBlinking, setIsBlinking] = useState(false)
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // ── Breathing state (0-1 sine wave) ──
  const [breathPhase, setBreathPhase] = useState(0)
  const breathFrameRef = useRef<number>(undefined)

  // ── Speaking frame index ──
  const [speakFrameIdx, setSpeakFrameIdx] = useState(0)
  const speakTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // ── Previous frame for crossfade ──
  const [currentSrc, setCurrentSrc] = useState(`${base}/idle.png`)
  const [prevSrc, setPrevSrc] = useState<string | null>(null)
  const [transitioning, setTransitioning] = useState(false)

  // ── Natural blinking: random intervals, NEVER during speaking mouth movement ──
  useEffect(() => {
    const scheduleBlink = () => {
      const delay = BLINK_MIN_INTERVAL + Math.random() * (BLINK_MAX_INTERVAL - BLINK_MIN_INTERVAL)
      blinkTimerRef.current = setTimeout(() => {
        // Don't blink during active speaking (looks unnatural)
        if (mode !== "speaking") {
          setIsBlinking(true)
          setTimeout(() => {
            setIsBlinking(false)
            scheduleBlink()
          }, BLINK_DURATION_MS)
        } else {
          scheduleBlink()
        }
      }, delay)
    }
    scheduleBlink()
    return () => { if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current) }
  }, [mode])

  // ── Breathing animation (continuous sine wave) ──
  useEffect(() => {
    let start: number | null = null
    const tick = (ts: number) => {
      if (!start) start = ts
      const elapsed = ts - start
      setBreathPhase(Math.sin((elapsed / BREATHING_CYCLE_MS) * Math.PI * 2) * 0.5 + 0.5)
      breathFrameRef.current = requestAnimationFrame(tick)
    }
    breathFrameRef.current = requestAnimationFrame(tick)
    return () => { if (breathFrameRef.current) cancelAnimationFrame(breathFrameRef.current) }
  }, [])

  // ── Speaking frame cycling: speed based on audio level ──
  useEffect(() => {
    if (mode !== "speaking") {
      setSpeakFrameIdx(0)
      return
    }
    const interval = SPEAK_FRAME_MAX_MS - (audioLevel * (SPEAK_FRAME_MAX_MS - SPEAK_FRAME_MIN_MS))
    speakTimerRef.current = setTimeout(() => {
      setSpeakFrameIdx(prev => (prev + 1) % SPEAK_FRAMES.length)
    }, Math.max(SPEAK_FRAME_MIN_MS, interval))
    return () => { if (speakTimerRef.current) clearTimeout(speakTimerRef.current) }
  }, [mode, audioLevel, speakFrameIdx])

  // ── Determine current frame ──
  const targetSrc = useMemo(() => {
    // Priority 1: Blink (quick overlay)
    if (isBlinking) return `${base}/blink.png`

    // Priority 2: Speaking (cycle mouth shapes)
    if (mode === "speaking") return `${base}/${SPEAK_FRAMES[speakFrameIdx]}.png`

    // Priority 3: Emotion-based idle
    if (mode === "listening") return `${base}/listening.png`

    // Priority 4: Vibe expressions
    switch (vibe) {
      case "Joyful": return `${base}/joyful.png`
      case "Excited": return `${base}/excited.png`
      case "Serious": return `${base}/serious.png`
      case "Empathetic": return `${base}/sad.png`
      default: break
    }

    // Priority 5: Breathing (alternate idle/breathing-in)
    if (breathPhase > 0.7) return `${base}/breathing-in.png`

    return `${base}/idle.png`
  }, [base, isBlinking, mode, speakFrameIdx, vibe, breathPhase])

  // ── Crossfade logic ──
  const handleFrameChange = useCallback((newSrc: string) => {
    if (newSrc === currentSrc) return
    // For blinks and speaking, instant swap (no crossfade — needs to be snappy)
    if (newSrc.includes("blink") || newSrc.includes("speaking")) {
      setCurrentSrc(newSrc)
      return
    }
    // For emotion/state changes, crossfade
    setPrevSrc(currentSrc)
    setCurrentSrc(newSrc)
    setTransitioning(true)
    setTimeout(() => {
      setTransitioning(false)
      setPrevSrc(null)
    }, 250)
  }, [currentSrc])

  useEffect(() => {
    handleFrameChange(targetSrc)
  }, [targetSrc, handleFrameChange])

  // ── Breathing scale (subtle chest expansion) ──
  const breathScale = 1 + breathPhase * 0.008

  // ── Subtle idle sway ──
  const swayAmount = mode === "speaking" ? 3 : 1.5

  return (
    <div className={className}>
      <motion.div
        className="relative h-full w-full overflow-hidden rounded-2xl"
        animate={{
          y: [0, -swayAmount, 0],
          rotate: [0, mode === "listening" ? -0.4 : -0.2, mode === "listening" ? 0.4 : 0.2, 0],
        }}
        transition={{
          duration: mode === "speaking" ? 1.8 : 3.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Breathing scale wrapper */}
        <motion.div
          className="absolute inset-0"
          style={{ scale: breathScale }}
        >
          {/* Previous frame (fading out during crossfade) */}
          {transitioning && prevSrc && (
            <motion.div
              className="absolute inset-0 z-10"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Image src={prevSrc} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            </motion.div>
          )}

          {/* Current frame */}
          <Image
            src={currentSrc}
            alt="AI avatar"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </motion.div>

        {/* Ambient lighting overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_60%_20%,rgba(56,189,248,0.15),transparent_42%),radial-gradient(circle_at_20%_80%,rgba(167,139,250,0.12),transparent_48%)]" />

        {/* Speaking glow indicator */}
        {mode === "speaking" && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-2xl"
            animate={{ boxShadow: [`inset 0 0 30px rgba(56,189,248,${0.05 + audioLevel * 0.15})`, `inset 0 0 50px rgba(56,189,248,${0.02 + audioLevel * 0.08})`] }}
            transition={{ duration: 0.3, repeat: Infinity, repeatType: "reverse" }}
          />
        )}
      </motion.div>
    </div>
  )
}
