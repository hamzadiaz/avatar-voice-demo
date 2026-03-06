import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Avatar Voice Demo",
  description: "Gemini voice showcase with TTS, live conversation, and emotion analysis.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  )
}
