import * as React from "react"
import { cn } from "@/lib/utils"

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none ring-offset-zinc-950 placeholder:text-zinc-500 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500", 
        className
      )}
      {...props}
    />
  )
}
