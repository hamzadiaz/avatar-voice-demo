"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

export function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex w-full touch-none select-none items-center py-2", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-800/80">
        <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-cyan-400 to-fuchsia-400" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label="Slider thumb"
        className="block h-5 w-5 rounded-full border border-cyan-200/40 bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.35)] ring-offset-zinc-950 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      />
    </SliderPrimitive.Root>
  )
}
