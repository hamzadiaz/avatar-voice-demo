"use client"

import { motion } from "framer-motion"
import { User, UserRound } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AVATARS, type AvatarOption } from "@/lib/avatars"

interface AvatarSelectorProps {
  value: string
  onChange: (avatarId: string) => void
}

export function AvatarSelector({ value, onChange }: AvatarSelectorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {AVATARS.map((avatar) => {
        const selected = avatar.id === value
        const Icon = avatar.gender === "female" ? UserRound : User
        return (
          <motion.div
            key={avatar.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
          >
            <Card
              className={cn(
                "cursor-pointer transition-all",
                selected
                  ? "border-cyan-400/60 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                  : "hover:border-zinc-500"
              )}
              onClick={() => onChange(avatar.id)}
            >
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full",
                      selected
                        ? "bg-cyan-500/20 text-cyan-300"
                        : "bg-zinc-800 text-zinc-400"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-zinc-100">
                      {avatar.name}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {avatar.gender === "female" ? "Female" : "Male"} · {avatar.source}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-zinc-400">{avatar.description}</p>
                <Button
                  variant={selected ? "default" : "secondary"}
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(avatar.id)
                  }}
                  aria-label={`Select ${avatar.name}`}
                >
                  {selected ? "✓ Selected" : `Choose ${avatar.name}`}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
