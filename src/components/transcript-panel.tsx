"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TranscriptMessage } from "@/hooks/use-gemini-live"

interface TranscriptPanelProps {
  transcript: TranscriptMessage[]
}

export function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  return (
    <Card className="h-full border-zinc-800 bg-zinc-950/60">
      <CardHeader>
        <CardTitle>Chat</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[70vh] overflow-y-auto">
        {transcript.length === 0 ? <div className="text-sm text-zinc-500">No messages yet.</div> : null}
        {transcript.map((message) => (
          <div key={message.id} className={message.role === "user" ? "ml-auto max-w-[90%]" : "mr-auto max-w-[90%]"}>
            <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-500">
              <span>{message.role === "user" ? "You" : "AI"}</span>
              <span className="normal-case tracking-normal text-zinc-600">
                {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div
              className={message.role === "user" ? "rounded-2xl rounded-br-sm bg-cyan-600/20 px-3 py-2 text-sm text-zinc-100 border border-cyan-500/30" : "rounded-2xl rounded-bl-sm border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"}
            >
              {message.content}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
