"use client"

import { motion } from "framer-motion"
import { User, UserRound } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => {
        const selected = card.value === value
        const Icon = card.icon
        return (
          <motion.div key={card.value} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}>
            <Card className={cn("transition-colors", selected ? "border-cyan-400/60 bg-gradient-to-br from-cyan-500/10 to-blue-500/10" : "hover:border-zinc-500") }>
              <CardContent className="space-y-4 p-6">
                <Icon className={cn("h-16 w-16", selected ? "text-cyan-300" : "text-zinc-400")} />
                <div>
                  <div className="text-xl font-semibold text-zinc-100">{card.label}</div>
                  <div className="mt-1 text-sm text-zinc-400">Voice persona filter</div>
                </div>
                <Button variant={selected ? "default" : "secondary"} className="w-full" onClick={() => onChange(card.value)} aria-label={`Select ${card.label} voice persona`}>
                  {selected ? "Selected" : `Choose ${card.label}`}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
