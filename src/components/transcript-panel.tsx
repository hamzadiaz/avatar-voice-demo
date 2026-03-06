"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { TranscriptMessage } from "@/hooks/use-gemini-live"

interface TranscriptPanelProps {
  transcript: TranscriptMessage[]
}

export function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Chat</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-[70vh] pr-2">
          <div className="space-y-3">
            {transcript.length === 0 ? <div className="text-sm text-zinc-500">No messages yet.</div> : null}
            {transcript.map((message) => (
              <div key={message.id} className={message.role === "user" ? "ml-auto max-w-[90%]" : "mr-auto max-w-[90%]"}>
                <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-500">
                  <span>{message.role === "user" ? "You" : "AI"}</span>
                  <span className="normal-case tracking-normal text-zinc-600">{message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className={message.role === "user" ? "rounded-2xl rounded-br-sm border border-cyan-500/30 bg-cyan-600/20 px-3 py-2 text-sm text-zinc-100" : "rounded-2xl rounded-bl-sm border border-zinc-700/80 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-200"}>
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
