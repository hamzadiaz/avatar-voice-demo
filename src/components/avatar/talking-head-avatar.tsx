"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import type { VibeType } from "@/lib/constants"
import type { AvatarMode } from "./vrm-avatar-canvas"

interface TalkingHeadAvatarProps {
  gender: "male" | "female"
  vibe: VibeType
  mode: AvatarMode
  audioLevel: number
  className?: string
}

export interface TalkingHeadAvatarHandle {
  pushAudioChunk: (audio: Float32Array, sampleRate: number) => void
  interrupt: () => void
}

type TalkingHeadInstance = {
  showAvatar: (avatar: {
    url: string
    body?: "F" | "M"
    lipsyncLang?: string
    avatarMood?: string
    avatarMute?: boolean
    avatarIdleEyeContact?: number
    avatarIdleHeadMove?: number
    avatarSpeakingEyeContact?: number
    avatarSpeakingHeadMove?: number
    avatarListeningEyeContact?: number
  }) => Promise<void>
  streamStart: (opt?: { mood?: string; waitForAudioChunks?: boolean }) => Promise<void>
  streamAudio: (data: { audio: Float32Array; sampleRate?: number }) => void
  streamStop: () => void
  setMood: (mood: string) => void
  dispose: () => void
}

const FEMALE_AVATAR_URL = "https://models.readyplayer.me/64c0f2f8f2fa0f5f9f95d9b7.glb"
const MALE_AVATAR_URL = "https://models.readyplayer.me/64c0f31ff2fa0f5f9f95dc71.glb"

const VIBE_TO_MOOD: Record<VibeType, string> = {
  Neutral: "neutral",
  Joyful: "happy",
  Excited: "love",
  Chill: "neutral",
  Serious: "neutral",
  Empathetic: "sad",
}

export const TalkingHeadAvatar = forwardRef<TalkingHeadAvatarHandle, TalkingHeadAvatarProps>(function TalkingHeadAvatar(
  { gender, vibe, mode, audioLevel, className },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const headRef = useRef<TalkingHeadInstance | null>(null)
  const [isReady, setIsReady] = useState(false)

  useImperativeHandle(ref, () => ({
    pushAudioChunk: (audio, sampleRate) => {
      if (!headRef.current || !isReady || mode !== "speaking") return
      headRef.current.streamAudio({ audio, sampleRate })
    },
    interrupt: () => {
      if (!headRef.current) return
      headRef.current.streamStop()
      void headRef.current.streamStart({ mood: VIBE_TO_MOOD[vibe] })
    },
  }), [isReady, mode, vibe])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      if (!containerRef.current) return

      const moduleUrl = "https://cdn.jsdelivr.net/npm/@met4citizen/talkinghead@1.7.0/modules/talkinghead.mjs"
      const { TalkingHead } = await import(/* webpackIgnore: true */ moduleUrl)
      if (cancelled || !containerRef.current) return

      const instance = new TalkingHead(containerRef.current, {
        modelFPS: 30,
        modelPixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        cameraView: "upper",
        cameraZoomEnable: false,
        cameraPanEnable: false,
        cameraRotateEnable: false,
        lightAmbientIntensity: 2,
        lightDirectIntensity: 26,
        lightSpotIntensity: 0,
        avatarMood: VIBE_TO_MOOD[vibe],
        avatarIdleEyeContact: 0.35,
        avatarIdleHeadMove: 0.5,
        avatarSpeakingEyeContact: 0.65,
        avatarSpeakingHeadMove: 0.7,
        avatarListeningEyeContact: 0.55,
      }) as TalkingHeadInstance

      await instance.showAvatar({
        url: gender === "female" ? FEMALE_AVATAR_URL : MALE_AVATAR_URL,
        body: gender === "female" ? "F" : "M",
        lipsyncLang: "en",
        avatarMood: VIBE_TO_MOOD[vibe],
        avatarMute: true,
        avatarIdleEyeContact: 0.35,
        avatarIdleHeadMove: 0.5,
        avatarSpeakingEyeContact: 0.65,
        avatarSpeakingHeadMove: 0.7,
        avatarListeningEyeContact: 0.55,
      })

      await instance.streamStart({ mood: VIBE_TO_MOOD[vibe], waitForAudioChunks: false })

      if (cancelled) {
        instance.dispose()
        return
      }

      headRef.current = instance
      setIsReady(true)
    }

    void init()

    return () => {
      cancelled = true
      setIsReady(false)
      if (headRef.current) {
        headRef.current.dispose()
        headRef.current = null
      }
    }
  }, [gender])

  useEffect(() => {
    if (!headRef.current || !isReady) return
    headRef.current.setMood(VIBE_TO_MOOD[vibe])
  }, [isReady, vibe])

  useEffect(() => {
    if (!headRef.current || !isReady) return
    if (mode !== "speaking") {
      headRef.current.streamStop()
      void headRef.current.streamStart({ mood: VIBE_TO_MOOD[vibe], waitForAudioChunks: false })
    }
  }, [isReady, mode, vibe])

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className="h-full w-full rounded-2xl bg-transparent"
        style={{
          background: "transparent",
          filter: `drop-shadow(0 0 ${8 + audioLevel * 22}px rgba(56, 189, 248, ${0.12 + audioLevel * 0.3}))`,
        }}
      />
    </div>
  )
})
