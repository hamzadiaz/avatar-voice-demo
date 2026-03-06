export const VIBE_TYPES = [
  "Neutral",
  "Joyful",
  "Excited",
  "Chill",
  "Serious",
  "Empathetic",
] as const

export type VibeType = typeof VIBE_TYPES[number]

export const VIBE_COLORS: Record<VibeType, { primary: string; glow: string; text: string }> = {
  Neutral: {
    primary: "from-slate-400/60 to-slate-500/50",
    glow: "rgba(148, 163, 184, 0.35)",
    text: "text-slate-300",
  },
  Joyful: {
    primary: "from-amber-400/60 to-yellow-500/50",
    glow: "rgba(251, 191, 36, 0.35)",
    text: "text-yellow-300",
  },
  Excited: {
    primary: "from-orange-500/60 to-red-500/50",
    glow: "rgba(249, 115, 22, 0.35)",
    text: "text-orange-300",
  },
  Chill: {
    primary: "from-cyan-400/60 to-blue-500/50",
    glow: "rgba(34, 211, 238, 0.35)",
    text: "text-cyan-300",
  },
  Serious: {
    primary: "from-indigo-500/60 to-violet-600/50",
    glow: "rgba(99, 102, 241, 0.35)",
    text: "text-indigo-300",
  },
  Empathetic: {
    primary: "from-pink-400/60 to-rose-500/50",
    glow: "rgba(244, 114, 182, 0.35)",
    text: "text-pink-300",
  },
}

export const EMOTIONAL_MIRRORING_INSTRUCTION = `
[Emotional Mirroring Mode]
Include a hidden emotion tag at the START of each response to indicate your current emotional tone. Choose from: [VIBE:Neutral], [VIBE:Joyful], [VIBE:Excited], [VIBE:Chill], [VIBE:Serious], or [VIBE:Empathetic].
The tag will be automatically stripped and not shown to the user - it is for internal emotional state tracking only.
Match your vocal tone and word choice to the vibe you select. Be genuine and responsive to the user's energy.
`

export const EMOTION_PROMPT = `You are an expert vocal emotion analyst. Analyze prosody and transcript. Return JSON with vibe, energy, brightness, and summary.`
