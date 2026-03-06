"use client"

import { useCallback, useRef, useState } from "react"

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)

  const requestMic = useCallback(async () => {
    if (streamRef.current) return streamRef.current
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream
    return stream
  }, [])

  const start = useCallback(async () => {
    await requestMic()
    setIsRecording(true)
  }, [requestMic])

  const stop = useCallback(() => {
    setIsRecording(false)
  }, [])

  const release = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsRecording(false)
  }, [])

  return { isRecording, start, stop, requestMic, release }
}
