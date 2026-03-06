import type { Metadata } from "next"
import Home from "../page"

export const metadata: Metadata = {
  title: "Meet your AI. Face to face. | Avatar Voice Demo",
  description:
    "Experience lifelike AI conversations with emotional intelligence, expressive 3D avatars, and premium voice models.",
  keywords: ["AI avatar", "voice demo", "3D avatars", "emotion AI", "text to speech"],
  openGraph: {
    title: "Meet your AI. Face to face.",
    description:
      "Lifelike voice conversations powered by emotional intelligence and animated 3D avatars.",
    url: "https://avatar-voice-demo.vercel.app/landing",
    siteName: "Avatar Voice Demo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meet your AI. Face to face.",
    description:
      "Try expressive AI voices, real-time emotion mirroring, and animated avatar conversations.",
  },
}

export default function LandingRoute() {
  return <Home />
}
