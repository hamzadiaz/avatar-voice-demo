"use client"

import { motion } from "framer-motion"
import { User, UserRound } from "lucide-react"
import type { VoiceGender } from "@/lib/media-utils"
import { cn } from "@/lib/utils"

interface GenderSelectorProps {
  value: VoiceGender
  onChange: (gender: VoiceGender) => void
}

export function GenderSelector({ value, onChange }: GenderSelectorProps) {
  const cards: Array<{ value: VoiceGender; label: string; icon: typeof User }> = [
    { value: "male", label: "Male", icon: User },
    { value: "female", label: "Female", icon: UserRound },
  ]

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {cards.map((card) => {
        const selected = card.value === value
        const Icon = card.icon
        return (
          <motion.button
            key={card.value}
            type="button"
            onClick={() => onChange(card.value)}
            whileHover={{ y: -2 }}
            className={cn(
              "group relative overflow-hidden rounded-3xl border p-8 text-left transition-all",
              selected
                ? "border-cyan-400/60 bg-gradient-to-br from-cyan-500/15 to-blue-500/10"
                : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-600"
            )}
          >
            <Icon className={cn("mb-6 h-20 w-20", selected ? "text-cyan-300" : "text-zinc-400")} />
            <div className="text-2xl font-semibold text-zinc-100">{card.label}</div>
            <div className="mt-1 text-sm text-zinc-400">Voice persona filter</div>
          </motion.button>
        )
      })}
    </div>
  )
}
