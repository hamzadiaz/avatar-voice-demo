"use client"

import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface AccordionItemData {
  id: string
  trigger: string
  content: string
}

interface AccordionProps {
  items: AccordionItemData[]
  className?: string
}

export function Accordion({ items, className }: AccordionProps) {
  const [openId, setOpenId] = useState<string>(items[0]?.id ?? "")

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => {
        const isOpen = item.id === openId
        return (
          <div
            key={item.id}
            className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-xl"
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? "" : item.id)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-medium text-zinc-100">{item.trigger}</span>
              <ChevronDown
                className={cn("h-4 w-4 text-zinc-400 transition-transform duration-300", isOpen && "rotate-180")}
              />
            </button>
            <div
              className={cn(
                "grid transition-all duration-300",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-sm text-zinc-300">{item.content}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
