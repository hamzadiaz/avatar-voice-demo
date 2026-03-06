"use client"

import { VIBE_COLORS, type VibeType } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface VibeDisplayProps {
  vibe: VibeType
}

export function VibeDisplay({ vibe }: VibeDisplayProps) {
  const theme = VIBE_COLORS[vibe]

  return (
    <div className="flex flex-wrap gap-2">
      {Object.keys(VIBE_COLORS).map((item) => {
        const selected = item === vibe
        return (
          <div
            key={item}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              selected
                ? `border-transparent bg-gradient-to-r ${theme.primary} ${theme.text}`
                : "border-zinc-700 text-zinc-400"
            )}
          >
            {item}
          </div>
        )
      })}
    </div>
  )
}
