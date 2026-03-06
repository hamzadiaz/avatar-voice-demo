"use client"

import { motion } from "framer-motion"
import type { ConnectionState } from "@/hooks/use-gemini-live"
import { VIBE_COLORS, type VibeType } from "@/lib/constants"

interface SentientOrbProps {
  state: ConnectionState
  audioLevel?: number
  aiVibe?: VibeType
}

export function SentientOrb({ state, audioLevel = 0, aiVibe = "Neutral" }: SentientOrbProps) {
  const color = VIBE_COLORS[aiVibe]
  const scale = state === "connected" ? 1 + audioLevel * 0.2 : 1

  return (
    <div className="relative h-72 w-72">
      <motion.div
        className={`absolute inset-0 rounded-full bg-gradient-to-br ${color.primary} blur-2xl`}
        animate={{ scale: [1, 1.05, 1], opacity: state === "connected" ? [0.65, 0.9, 0.65] : 0.4 }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-10 rounded-full border border-white/10 bg-zinc-900/70 backdrop-blur"
        animate={{ scale, rotate: state === "connecting" ? [0, 180, 360] : 0 }}
        transition={{ duration: 2, repeat: state === "connecting" ? Number.POSITIVE_INFINITY : 0, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-[35%] rounded-full bg-white/80"
        animate={{ scale: [0.9, 1.08, 0.9] }}
        transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
    </div>
  )
}
