"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm"
import { useSpring } from "framer-motion"
import * as THREE from "three"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import type { VibeType } from "@/lib/constants"

export type AvatarMode = "idle" | "listening" | "speaking"

interface VRMAvatarCanvasProps {
  avatarUrl: string
  vibe: VibeType
  mode: AvatarMode
  audioLevel: number
  className?: string
}

type EmotionShape = {
  happy: number
  sad: number
  relaxed: number
  surprised: number
}

const VIBE_TO_EMOTION: Record<VibeType, EmotionShape> = {
  Neutral: { happy: 0.1, sad: 0, relaxed: 0.2, surprised: 0 },
  Joyful: { happy: 0.9, sad: 0, relaxed: 0.25, surprised: 0.1 },
  Excited: { happy: 0.65, sad: 0, relaxed: 0.05, surprised: 0.85 },
  Chill: { happy: 0.2, sad: 0, relaxed: 0.9, surprised: 0 },
  Serious: { happy: 0, sad: 0.15, relaxed: 0.15, surprised: 0 },
  Empathetic: { happy: 0.25, sad: 0.25, relaxed: 0.45, surprised: 0 },
}

function LoadedVRM({ avatarUrl, vibe, mode, audioLevel }: Omit<VRMAvatarCanvasProps, "className">) {
  const [vrm, setVrm] = useState<VRM | null>(null)
  const t = useRef(0)

  const happySpring = useSpring(0, { stiffness: 120, damping: 20 })
  const sadSpring = useSpring(0, { stiffness: 120, damping: 20 })
  const relaxedSpring = useSpring(0, { stiffness: 120, damping: 20 })
  const surprisedSpring = useSpring(0, { stiffness: 120, damping: 20 })
  const mouthSpring = useSpring(0, { stiffness: 250, damping: 22 })

  useEffect(() => {
    let disposed = false
    const loader = new GLTFLoader()
    loader.crossOrigin = "anonymous"
    loader.register((parser) => new VRMLoaderPlugin(parser))

    loader.load(
      avatarUrl,
      (gltf) => {
        if (disposed) return

        const loaded = gltf.userData.vrm as VRM
        VRMUtils.removeUnnecessaryVertices(gltf.scene)
        VRMUtils.combineSkeletons(gltf.scene)

        loaded.scene.traverse((obj) => {
          obj.frustumCulled = false
        })

        loaded.scene.rotation.y = Math.PI
        loaded.scene.position.set(0, -1.04, 0)
        setVrm(loaded)
      },
      undefined,
      (error) => {
        console.error("Failed to load VRM", error)
      }
    )

    return () => {
      disposed = true
      setVrm((old) => {
        if (!old) return null
        old.scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh
          mesh.geometry?.dispose?.()
        })
        return null
      })
    }
  }, [avatarUrl])

  const emotion = useMemo(() => VIBE_TO_EMOTION[vibe], [vibe])

  useEffect(() => {
    happySpring.set(emotion.happy)
    sadSpring.set(emotion.sad)
    relaxedSpring.set(emotion.relaxed)
    surprisedSpring.set(emotion.surprised)
  }, [emotion, happySpring, relaxedSpring, sadSpring, surprisedSpring])

  useEffect(() => {
    const mouthTarget =
      mode === "speaking"
        ? THREE.MathUtils.clamp(0.08 + audioLevel * 1.8, 0.08, 1)
        : 0
    mouthSpring.set(mouthTarget)
  }, [audioLevel, mode, mouthSpring])

  useFrame((_, delta) => {
    if (!vrm) return

    t.current += delta
    vrm.update(delta)

    const exp = vrm.expressionManager
    if (exp) {
      exp.setValue("happy", happySpring.get())
      exp.setValue("sad", sadSpring.get())
      exp.setValue("relaxed", relaxedSpring.get())
      exp.setValue("surprised", surprisedSpring.get())

      const speakingPulse = mode === "speaking" ? Math.abs(Math.sin(t.current * 14)) * 0.1 : 0
      exp.setValue("aa", THREE.MathUtils.clamp(mouthSpring.get() + speakingPulse, 0, 1))
      exp.setValue("ih", mode === "speaking" ? mouthSpring.get() * 0.35 : 0)
      exp.setValue("ou", mode === "speaking" ? mouthSpring.get() * 0.2 : 0)
      exp.setValue("ee", 0)
      exp.setValue("oh", 0)
    }

    const baseY = mode === "listening" ? -0.99 : -1.04
    const bobSpeed = mode === "speaking" ? 2 : mode === "listening" ? 1.6 : 1.1
    const bobAmp = mode === "speaking" ? 0.016 : mode === "listening" ? 0.011 : 0.007
    vrm.scene.position.y = baseY + Math.sin(t.current * bobSpeed) * bobAmp

    if (vrm.humanoid) {
      const neck = vrm.humanoid.getNormalizedBoneNode("neck")
      if (neck) {
        const targetRotX = mode === "listening" ? 0.06 : 0
        neck.rotation.x = THREE.MathUtils.damp(neck.rotation.x, targetRotX, 6, delta)
      }
    }
  })

  if (!vrm) return null
  return <primitive object={vrm.scene} />
}

export function VRMAvatarCanvas({ avatarUrl, vibe, mode, audioLevel, className }: VRMAvatarCanvasProps) {
  return (
    <div className={className}>
      <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }} camera={{ fov: 26, position: [0, 1.2, 2.2], near: 0.1, far: 100 }}>
        <ambientLight intensity={0.8} />
        <directionalLight intensity={1.05} position={[2.5, 4, 2.5]} />
        <pointLight intensity={0.25} position={[-2, 2.2, 1]} />

        <Suspense fallback={null}>
          <LoadedVRM avatarUrl={avatarUrl} vibe={vibe} mode={mode} audioLevel={audioLevel} />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  )
}
