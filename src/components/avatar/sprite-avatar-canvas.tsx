"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import type { VibeType } from "@/lib/constants"
import type { AvatarMode } from "./vrm-avatar-canvas"

interface SpriteAvatarCanvasProps {
  gender: "male" | "female"
  vibe: VibeType
  mode: AvatarMode
  audioLevel: number
  className?: string
  blinkSignal?: number
}

function useBlinkTicker(enabled: boolean, blinkSignal?: number) {
  const [autoBlinkOn, setAutoBlinkOn] = useState(false)
  const [manualBlinkOn, setManualBlinkOn] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setAutoBlinkOn(false)
      return
    }

    let timeout: ReturnType<typeof setTimeout> | undefined
    let blinkTimeout: ReturnType<typeof setTimeout> | undefined

    const schedule = () => {
      timeout = setTimeout(() => {
        setAutoBlinkOn(true)
        blinkTimeout = setTimeout(() => {
          setAutoBlinkOn(false)
          schedule()
        }, 90)
      }, 1600 + Math.random() * 2400)
    }

    schedule()
    return () => {
      if (timeout) clearTimeout(timeout)
      if (blinkTimeout) clearTimeout(blinkTimeout)
    }
  }, [enabled])

  useEffect(() => {
    if (blinkSignal === undefined || !enabled) return
    setManualBlinkOn(true)
    const timeout = setTimeout(() => setManualBlinkOn(false), 95)
    return () => clearTimeout(timeout)
  }, [blinkSignal, enabled])

  return autoBlinkOn || manualBlinkOn
}

function useSpeakingFrame(mode: AvatarMode, audioLevel: number) {
  const [frame, setFrame] = useState<"a" | "b">("a")

  useEffect(() => {
    if (mode !== "speaking") {
      setFrame("a")
      return
    }

    const normalized = Math.max(0, Math.min(1, audioLevel))
    const interval = Math.max(70, Math.round(210 - normalized * 130))
    const timer = setInterval(() => setFrame((prev) => (prev === "a" ? "b" : "a")), interval)

    return () => clearInterval(timer)
  }, [audioLevel, mode])

  return frame
}

export function SpriteAvatarCanvas({ gender, vibe, mode, audioLevel, className, blinkSignal }: SpriteAvatarCanvasProps) {
  const speakingFrame = useSpeakingFrame(mode, audioLevel)
  const blinkOn = useBlinkTicker(mode !== "speaking", blinkSignal)
  const base = `/avatar-frames/${gender}`

  const targetSrc = useMemo(() => {
    if (blinkOn) return `${base}/blink.png`
    if (mode === "speaking") return `${base}/speaking-${speakingFrame}.png`
    if (mode === "listening") return `${base}/listening.png`
    if (vibe === "Joyful") return `${base}/joyful.png`
    if (vibe === "Excited") return `${base}/excited.png`
    if (vibe === "Serious") return `${base}/serious.png`
    return `${base}/idle.png`
  }, [base, blinkOn, mode, speakingFrame, vibe])

  const [currentSrc, setCurrentSrc] = useState(targetSrc)
  const [previousSrc, setPreviousSrc] = useState<string | null>(null)
  const [showCurrent, setShowCurrent] = useState(true)

  useEffect(() => {
    if (targetSrc === currentSrc) return
    setPreviousSrc(currentSrc)
    setCurrentSrc(targetSrc)
    setShowCurrent(false)
    const raf = requestAnimationFrame(() => setShowCurrent(true))
    const cleanup = setTimeout(() => setPreviousSrc(null), 280)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(cleanup)
    }
  }, [currentSrc, targetSrc])

  return (
    <div className={className}>
      <motion.div
        className="relative h-full w-full overflow-hidden rounded-2xl"
        animate={{ y: mode === "speaking" ? [0, -4, 0] : [0, -2, 0], rotate: mode === "listening" ? [0, -0.35, 0.35, 0] : [0, -0.15, 0.15, 0] }}
        transition={{ duration: mode === "speaking" ? 1.6 : 2.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      >
        <motion.div
          className="absolute inset-0"
          animate={{ scale: mode === "speaking" ? [1, 1.012, 1] : [1, 1.008, 1] }}
          transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          {previousSrc ? (
            <Image src={previousSrc} alt="AI avatar previous frame" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover opacity-100" />
          ) : null}
          <Image
            src={currentSrc}
            alt="AI avatar"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className={`object-cover transition-opacity duration-[240ms] ${showCurrent ? "opacity-100" : "opacity-0"}`}
          />
        </motion.div>

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_60%_20%,rgba(56,189,248,0.18),transparent_42%),radial-gradient(circle_at_20%_80%,rgba(167,139,250,0.16),transparent_48%)]" />
      </motion.div>
    </div>
  )
}
