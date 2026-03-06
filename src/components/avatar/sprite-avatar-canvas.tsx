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
}

function useBlinkTicker() {
  const [blinkOn, setBlinkOn] = useState(false)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined
    let blinkTimeout: ReturnType<typeof setTimeout> | undefined

    const schedule = () => {
      timeout = setTimeout(() => {
        setBlinkOn(true)
        blinkTimeout = setTimeout(() => {
          setBlinkOn(false)
          schedule()
        }, 110)
      }, 1400 + Math.random() * 2600)
    }

    schedule()
    return () => {
      if (timeout) clearTimeout(timeout)
      if (blinkTimeout) clearTimeout(blinkTimeout)
    }
  }, [])

  return blinkOn
}

export function SpriteAvatarCanvas({ gender, vibe, mode, audioLevel, className }: SpriteAvatarCanvasProps) {
  const blinkOn = useBlinkTicker()

  const base = `/avatar-frames/${gender}`

  const src = useMemo(() => {
    if (blinkOn) return `${base}/blink.png`
    if (mode === "speaking") {
      if (audioLevel > 0.26) return `${base}/speaking-b.png`
      return `${base}/speaking-a.png`
    }
    if (mode === "listening") return `${base}/listening.png`
    if (vibe === "Joyful") return `${base}/joyful.png`
    if (vibe === "Excited") return `${base}/excited.png`
    if (vibe === "Serious") return `${base}/serious.png`
    return `${base}/idle.png`
  }, [audioLevel, base, blinkOn, mode, vibe])

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
          <Image src={src} alt="AI avatar" fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
        </motion.div>

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_60%_20%,rgba(56,189,248,0.18),transparent_42%),radial-gradient(circle_at_20%_80%,rgba(167,139,250,0.16),transparent_48%)]" />
      </motion.div>
    </div>
  )
}
