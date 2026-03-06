"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TranscriptMessage } from "@/hooks/use-gemini-live"

interface TranscriptPanelProps {
  transcript: TranscriptMessage[]
}

export function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Transcript</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
        {transcript.length === 0 ? <div className="text-sm text-zinc-500">No messages yet.</div> : null}
        {transcript.map((message) => (
          <div
            key={message.id}
            className={message.role === "user" ? "ml-auto max-w-[90%]" : "mr-auto max-w-[90%]"}
          >
            <div className="mb-1 text-xs uppercase text-zinc-500">{message.role}</div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
              {message.content}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
