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

export interface AvatarCustomization {
  skinTone: number
  hairColor: string
  outfitColor: string
}

interface VRMAvatarCanvasProps {
  avatarUrl: string
  vibe: VibeType
  mode: AvatarMode
  audioLevel: number
  customization?: AvatarCustomization
  className?: string
  onLoadStateChange?: (loading: boolean) => void
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

const defaultCustomization: AvatarCustomization = {
  skinTone: 0.5,
  hairColor: "#2d2d35",
  outfitColor: "#5eead4",
}

function tweakSkin(base: THREE.Color, amount: number) {
  const target = new THREE.Color().setHSL(0.08, 0.33, 0.35 + amount * 0.4)
  return base.clone().lerp(target, 0.8)
}

function setMaterialColor(material: THREE.Material, color: THREE.Color) {
  if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
    material.color.copy(color)
    material.needsUpdate = true
  }
}

function LoadedVRM({ avatarUrl, vibe, mode, audioLevel, customization = defaultCustomization, onLoadStateChange }: Omit<VRMAvatarCanvasProps, "className">) {
  const [vrm, setVrm] = useState<VRM | null>(null)
  const t = useRef(0)
  const originalColorsRef = useRef<Map<string, THREE.Color>>(new Map())

  const happySpring = useSpring(0, { stiffness: 120, damping: 20 })
  const sadSpring = useSpring(0, { stiffness: 120, damping: 20 })
  const relaxedSpring = useSpring(0, { stiffness: 120, damping: 20 })
  const surprisedSpring = useSpring(0, { stiffness: 120, damping: 20 })
  const mouthSpring = useSpring(0, { stiffness: 250, damping: 22 })

  useEffect(() => {
    let disposed = false
    onLoadStateChange?.(true)

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
          const mesh = obj as THREE.Mesh
          const mat = mesh.material
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
            originalColorsRef.current.set(mesh.uuid, mat.color.clone())
          }
        })

        loaded.scene.rotation.y = Math.PI
        loaded.scene.position.set(0, -1.04, 0)
        setVrm(loaded)
        onLoadStateChange?.(false)
      },
      undefined,
      (error) => {
        console.error("Failed to load VRM", error)
        onLoadStateChange?.(false)
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
      originalColorsRef.current.clear()
    }
  }, [avatarUrl, onLoadStateChange])

  useEffect(() => {
    if (!vrm) return

    const hairColor = new THREE.Color(customization.hairColor)
    const outfitColor = new THREE.Color(customization.outfitColor)

    vrm.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.material) return

      const meshName = mesh.name.toLowerCase()
      const isSkin = meshName.includes("face") || meshName.includes("skin") || meshName.includes("body") || meshName.includes("head")
      const isHair = meshName.includes("hair") || meshName.includes("bang")
      const isOutfit = meshName.includes("shirt") || meshName.includes("cloth") || meshName.includes("outfit") || meshName.includes("jacket") || meshName.includes("dress")

      const original = originalColorsRef.current.get(mesh.uuid) ?? new THREE.Color("#808080")
      const target = isSkin ? tweakSkin(original, customization.skinTone) : isHair ? hairColor : isOutfit ? outfitColor : original

      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => setMaterialColor(m, target))
      } else {
        setMaterialColor(mesh.material, target)
      }
    })
  }, [customization, vrm])

  const emotion = useMemo(() => VIBE_TO_EMOTION[vibe], [vibe])

  useEffect(() => {
    happySpring.set(emotion.happy)
    sadSpring.set(emotion.sad)
    relaxedSpring.set(emotion.relaxed)
    surprisedSpring.set(emotion.surprised)
  }, [emotion, happySpring, relaxedSpring, sadSpring, surprisedSpring])

  useEffect(() => {
    const mouthTarget = mode === "speaking" ? THREE.MathUtils.clamp(0.08 + audioLevel * 1.8, 0.08, 1) : 0
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
      const leftUpperArm = vrm.humanoid.getNormalizedBoneNode("leftUpperArm")
      const rightUpperArm = vrm.humanoid.getNormalizedBoneNode("rightUpperArm")
      const spine = vrm.humanoid.getNormalizedBoneNode("spine")

      if (neck) {
        const thinkingTilt = vibe === "Serious" ? 0.1 : 0
        const targetRotX = (mode === "listening" ? 0.06 : 0) + thinkingTilt
        neck.rotation.x = THREE.MathUtils.damp(neck.rotation.x, targetRotX, 6, delta)
        neck.rotation.z = THREE.MathUtils.damp(neck.rotation.z, vibe === "Serious" ? 0.06 : 0, 6, delta)
      }

      if (leftUpperArm && rightUpperArm) {
        const wave = Math.sin(t.current * 5.5) * 0.25
        const joyfulWave = vibe === "Joyful" ? wave : 0
        const excitedLift = vibe === "Excited" ? 0.35 : 0
        const empatheticOpen = vibe === "Empathetic" ? 0.22 : 0
        const seriousFold = vibe === "Serious" ? 0.18 : 0

        leftUpperArm.rotation.z = THREE.MathUtils.damp(leftUpperArm.rotation.z, -0.08 - empatheticOpen + seriousFold, 5, delta)
        rightUpperArm.rotation.z = THREE.MathUtils.damp(rightUpperArm.rotation.z, 0.08 + empatheticOpen - seriousFold, 5, delta)

        leftUpperArm.rotation.x = THREE.MathUtils.damp(leftUpperArm.rotation.x, excitedLift * 0.6, 5, delta)
        rightUpperArm.rotation.x = THREE.MathUtils.damp(rightUpperArm.rotation.x, joyfulWave + excitedLift, 6, delta)
      }

      if (spine) {
        const targetSpineY = vibe === "Chill" ? -0.08 : vibe === "Excited" ? 0.1 : 0
        spine.rotation.y = THREE.MathUtils.damp(spine.rotation.y, targetSpineY, 4, delta)
      }
    }
  })

  if (!vrm) return null
  return <primitive object={vrm.scene} />
}

export function VRMAvatarCanvas({ avatarUrl, vibe, mode, audioLevel, customization, className, onLoadStateChange }: VRMAvatarCanvasProps) {
  return (
    <div className={className}>
      <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }} camera={{ fov: 26, position: [0, 1.2, 2.2], near: 0.1, far: 100 }}>
        <ambientLight intensity={0.8} />
        <directionalLight intensity={1.05} position={[2.5, 4, 2.5]} />
        <pointLight intensity={0.25} position={[-2, 2.2, 1]} />

        <Suspense fallback={null}>
          <LoadedVRM avatarUrl={avatarUrl} vibe={vibe} mode={mode} audioLevel={audioLevel} customization={customization} onLoadStateChange={onLoadStateChange} />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  )
}
