"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import type { VibeType } from "@/lib/constants"
import { VRMAvatarCanvas, type AvatarMode } from "./vrm-avatar-canvas"

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

const FEMALE_AVATAR_URL = "https://raw.githubusercontent.com/met4citizen/TalkingHead/main/avatars/brunette.glb"
const MALE_AVATAR_URL = "https://raw.githubusercontent.com/met4citizen/TalkingHead/main/avatars/avatarsdk.glb"
const FEMALE_FALLBACK_VRM_URL = "/avatars/female.vrm"
const MALE_FALLBACK_VRM_URL = "/avatars/male.vrm"

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
  const [loadFailed, setLoadFailed] = useState(false)

  useImperativeHandle(ref, () => ({
    pushAudioChunk: (audio, sampleRate) => {
      if (!headRef.current || !isReady || loadFailed || mode !== "speaking") return
      headRef.current.streamAudio({ audio, sampleRate })
    },
    interrupt: () => {
      if (!headRef.current || loadFailed) return
      headRef.current.streamStop()
      void headRef.current.streamStart({ mood: VIBE_TO_MOOD[vibe] })
    },
  }), [isReady, loadFailed, mode, vibe])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      if (!containerRef.current) return
      setLoadFailed(false)

      try {
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
      } catch (error) {
        console.error("TalkingHead failed, switching to VRM fallback", error)
        setLoadFailed(true)
        setIsReady(false)
      }
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
    if (!headRef.current || !isReady || loadFailed) return
    headRef.current.setMood(VIBE_TO_MOOD[vibe])
  }, [isReady, loadFailed, vibe])

  useEffect(() => {
    if (!headRef.current || !isReady || loadFailed) return
    if (mode !== "speaking") {
      headRef.current.streamStop()
      void headRef.current.streamStart({ mood: VIBE_TO_MOOD[vibe], waitForAudioChunks: false })
    }
  }, [isReady, loadFailed, mode, vibe])

  return (
    <div className={className}>
      {loadFailed ? (
        <VRMAvatarCanvas
          avatarUrl={gender === "female" ? FEMALE_FALLBACK_VRM_URL : MALE_FALLBACK_VRM_URL}
          vibe={vibe}
          mode={mode}
          audioLevel={audioLevel}
          className="h-full w-full rounded-2xl"
        />
      ) : (
        <div
          ref={containerRef}
          className="h-full w-full rounded-2xl bg-transparent"
          style={{
            background: "transparent",
            filter: `drop-shadow(0 0 ${8 + audioLevel * 22}px rgba(56, 189, 248, ${0.12 + audioLevel * 0.3}))`,
          }}
        />
      )}
    </div>
  )
})
