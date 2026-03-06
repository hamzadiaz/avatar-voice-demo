"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { ProsodyData } from "@/lib/media-utils"

interface EmotionAnalysisProps {
  prosody: ProsodyData
  aiProsody?: ProsodyData
  size?: number
  className?: string
}

export function EmotionAnalysis({ prosody, aiProsody, size = 220, className }: EmotionAnalysisProps) {
  const userDotX = prosody.brightness * size
  const userDotY = (1 - prosody.energy) * size
  const aiDotX = aiProsody ? aiProsody.brightness * size : size / 2
  const aiDotY = aiProsody ? (1 - aiProsody.energy) * size : size / 2

  return (
    <div className={cn("relative", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute inset-0">
          <rect x={0} y={0} width={size} height={size} rx={10} className="fill-zinc-950 stroke-zinc-700" />
          <line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke="rgb(63 63 70)" strokeDasharray="4 4" />
          <line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke="rgb(63 63 70)" strokeDasharray="4 4" />
          <text x={size * 0.24} y={20} className="fill-zinc-500 text-[10px]">Calm</text>
          <text x={size * 0.68} y={20} className="fill-zinc-500 text-[10px]">Forceful</text>
          <text x={size * 0.2} y={size - 10} className="fill-zinc-500 text-[10px]">Tentative</text>
          <text x={size * 0.64} y={size - 10} className="fill-zinc-500 text-[10px]">Passionate</text>
        </svg>

        <motion.div
          className="absolute h-4 w-4 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.7)]"
          animate={{ x: userDotX - 8, y: userDotY - 8 }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
        />

        {aiProsody ? (
          <motion.div
            className="absolute h-4 w-4 rounded-full bg-pink-400 shadow-[0_0_14px_rgba(244,114,182,0.7)]"
            animate={{ x: aiDotX - 8, y: aiDotY - 8 }}
            transition={{ type: "spring", stiffness: 280, damping: 20 }}
          />
        ) : null}
      </div>
    </div>
  )
}
