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

function setInitialNaturalRestPose(vrm: VRM) {
  const humanoid = vrm.humanoid
  if (!humanoid) return

  const hips = humanoid.getNormalizedBoneNode("hips")
  const spine = humanoid.getNormalizedBoneNode("spine")
  const chest = humanoid.getNormalizedBoneNode("chest")
  const neck = humanoid.getNormalizedBoneNode("neck")
  const leftUpperArm = humanoid.getNormalizedBoneNode("leftUpperArm")
  const rightUpperArm = humanoid.getNormalizedBoneNode("rightUpperArm")
  const leftLowerArm = humanoid.getNormalizedBoneNode("leftLowerArm")
  const rightLowerArm = humanoid.getNormalizedBoneNode("rightLowerArm")
  const leftHand = humanoid.getNormalizedBoneNode("leftHand")
  const rightHand = humanoid.getNormalizedBoneNode("rightHand")

  if (hips) {
    hips.rotation.z = -0.03
    hips.rotation.y = 0.06
  }

  if (spine) {
    spine.rotation.x = 0.05
    spine.rotation.y = 0.03
  }

  if (chest) {
    chest.rotation.x = 0.03
  }

  if (neck) {
    neck.rotation.x = 0.04
    neck.rotation.z = 0.08
  }

  if (leftUpperArm) {
    leftUpperArm.rotation.x = 0.1
    leftUpperArm.rotation.z = -1.15
  }

  if (rightUpperArm) {
    rightUpperArm.rotation.x = 0.1
    rightUpperArm.rotation.z = 1.15
  }

  if (leftLowerArm) {
    leftLowerArm.rotation.x = -0.16
    leftLowerArm.rotation.z = -0.24
  }

  if (rightLowerArm) {
    rightLowerArm.rotation.x = -0.16
    rightLowerArm.rotation.z = 0.24
  }

  if (leftHand) {
    leftHand.rotation.x = -0.08
    leftHand.rotation.y = -0.05
    leftHand.rotation.z = -0.06
  }

  if (rightHand) {
    rightHand.rotation.x = -0.08
    rightHand.rotation.y = 0.05
    rightHand.rotation.z = 0.06
  }

  vrm.scene.updateMatrixWorld(true)
}

function LoadedVRM({ avatarUrl, vibe, mode, audioLevel, customization = defaultCustomization, onLoadStateChange }: Omit<VRMAvatarCanvasProps, "className">) {
  const [vrm, setVrm] = useState<VRM | null>(null)
  const t = useRef(0)
  const originalColorsRef = useRef<Map<string, THREE.Color>>(new Map())
  const blinkTimer = useRef(0)
  const blinkProgress = useRef(0)
  const nextBlinkIn = useRef(2 + Math.random() * 3)
  const microShiftSeed = useRef(Math.random() * 10)

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
        setInitialNaturalRestPose(loaded)
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
    const mouthTarget = mode === "speaking" ? THREE.MathUtils.clamp(0.12 + audioLevel * 2.25, 0.12, 1) : 0
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

      blinkTimer.current += delta
      if (blinkTimer.current > nextBlinkIn.current) {
        blinkTimer.current = 0
        blinkProgress.current = 1
        nextBlinkIn.current = 2 + Math.random() * 3
      }
      blinkProgress.current = Math.max(0, blinkProgress.current - delta * 6.2)
      const blink = Math.sin(blinkProgress.current * Math.PI)

      const speakingPulse = mode === "speaking" ? Math.abs(Math.sin(t.current * 17)) * 0.24 : 0
      const mouth = THREE.MathUtils.clamp(mouthSpring.get() + speakingPulse, 0, 1)
      exp.setValue("blink", blink)
      exp.setValue("aa", mouth)
      exp.setValue("ih", mode === "speaking" ? mouth * 0.48 : 0)
      exp.setValue("ou", mode === "speaking" ? mouth * 0.3 : 0)
      exp.setValue("ee", mode === "speaking" ? mouth * 0.25 : 0)
      exp.setValue("oh", mode === "speaking" ? mouth * 0.34 : 0)
    }

    const baseY = mode === "listening" ? -1.01 : -1.04
    const breathingAmp = mode === "speaking" ? 0.012 : 0.008
    const breathingSpeed = mode === "speaking" ? 1.9 : 1.25
    const weightShift = Math.sin(t.current * 0.65 + microShiftSeed.current) * (mode === "speaking" ? 0.03 : 0.018)

    vrm.scene.position.y = baseY + Math.sin(t.current * breathingSpeed) * breathingAmp
    vrm.scene.position.x = weightShift
    vrm.scene.rotation.y = Math.PI + Math.sin(t.current * 0.58) * 0.035

    if (vrm.humanoid) {
      const neck = vrm.humanoid.getNormalizedBoneNode("neck")
      const chest = vrm.humanoid.getNormalizedBoneNode("chest")
      const spine = vrm.humanoid.getNormalizedBoneNode("spine")
      const hips = vrm.humanoid.getNormalizedBoneNode("hips")
      const leftUpperArm = vrm.humanoid.getNormalizedBoneNode("leftUpperArm")
      const rightUpperArm = vrm.humanoid.getNormalizedBoneNode("rightUpperArm")
      const leftLowerArm = vrm.humanoid.getNormalizedBoneNode("leftLowerArm")
      const rightLowerArm = vrm.humanoid.getNormalizedBoneNode("rightLowerArm")
      const leftHand = vrm.humanoid.getNormalizedBoneNode("leftHand")
      const rightHand = vrm.humanoid.getNormalizedBoneNode("rightHand")

      if (hips) {
        const hipsLean = mode === "speaking" ? Math.sin(t.current * 2.1) * 0.03 : Math.sin(t.current * 0.7) * 0.015
        hips.rotation.z = THREE.MathUtils.damp(hips.rotation.z, -0.03 + hipsLean, 5, delta)
        hips.rotation.y = THREE.MathUtils.damp(hips.rotation.y, 0.05 + Math.sin(t.current * 0.55) * 0.03, 5, delta)
      }

      if (spine) {
        const spineBreath = Math.sin(t.current * breathingSpeed) * (mode === "speaking" ? 0.045 : 0.03)
        const sideShift = Math.sin(t.current * 0.8) * 0.04
        spine.rotation.x = THREE.MathUtils.damp(spine.rotation.x, 0.04 + spineBreath, 6, delta)
        spine.rotation.y = THREE.MathUtils.damp(spine.rotation.y, sideShift, 4, delta)
      }

      if (chest) {
        const chestBreath = Math.sin(t.current * breathingSpeed + 0.6) * (mode === "speaking" ? 0.06 : 0.035)
        chest.rotation.x = THREE.MathUtils.damp(chest.rotation.x, 0.03 + chestBreath, 6, delta)
      }

      if (neck) {
        const idleHeadTilt = 0.08 + Math.sin(t.current * 0.9) * 0.03
        const microNod = Math.sin(t.current * (mode === "speaking" ? 4.2 : 1.4)) * (mode === "speaking" ? 0.08 : 0.02)
        neck.rotation.x = THREE.MathUtils.damp(neck.rotation.x, 0.03 + microNod, 7, delta)
        neck.rotation.z = THREE.MathUtils.damp(neck.rotation.z, idleHeadTilt, 6, delta)
        neck.rotation.y = THREE.MathUtils.damp(neck.rotation.y, Math.sin(t.current * 0.65) * 0.06, 5, delta)
      }

      if (leftUpperArm && rightUpperArm) {
        const armMicro = Math.sin(t.current * 1.6) * 0.04
        const speakingGestureL = mode === "speaking" ? Math.sin(t.current * 5.1) * 0.24 : 0
        const speakingGestureR = mode === "speaking" ? Math.sin(t.current * 4.7 + 0.8) * 0.3 : 0

        leftUpperArm.rotation.z = THREE.MathUtils.damp(leftUpperArm.rotation.z, -1.15 + armMicro + speakingGestureL * 0.35, 8, delta)
        rightUpperArm.rotation.z = THREE.MathUtils.damp(rightUpperArm.rotation.z, 1.15 - armMicro - speakingGestureR * 0.35, 8, delta)

        leftUpperArm.rotation.x = THREE.MathUtils.damp(leftUpperArm.rotation.x, 0.1 + speakingGestureL * 0.85, 8, delta)
        rightUpperArm.rotation.x = THREE.MathUtils.damp(rightUpperArm.rotation.x, 0.1 + speakingGestureR, 8, delta)
      }

      if (leftLowerArm && rightLowerArm) {
        const idleFlex = Math.sin(t.current * 1.3 + 0.3) * 0.03
        const speakingFlex = mode === "speaking" ? Math.sin(t.current * 6.2) * 0.22 : 0

        leftLowerArm.rotation.x = THREE.MathUtils.damp(leftLowerArm.rotation.x, -0.16 + idleFlex + speakingFlex * 0.6, 8, delta)
        rightLowerArm.rotation.x = THREE.MathUtils.damp(rightLowerArm.rotation.x, -0.16 - idleFlex + speakingFlex * 0.5, 8, delta)
        leftLowerArm.rotation.z = THREE.MathUtils.damp(leftLowerArm.rotation.z, -0.24 + speakingFlex * 0.4, 8, delta)
        rightLowerArm.rotation.z = THREE.MathUtils.damp(rightLowerArm.rotation.z, 0.24 - speakingFlex * 0.4, 8, delta)
      }

      if (leftHand && rightHand) {
        const handIdle = Math.sin(t.current * 1.9) * 0.05
        const speakingFlick = mode === "speaking" ? Math.sin(t.current * 8.4) * 0.12 : 0
        leftHand.rotation.x = THREE.MathUtils.damp(leftHand.rotation.x, -0.08 + handIdle + speakingFlick * 0.5, 8, delta)
        rightHand.rotation.x = THREE.MathUtils.damp(rightHand.rotation.x, -0.08 - handIdle + speakingFlick * 0.5, 8, delta)
        leftHand.rotation.y = THREE.MathUtils.damp(leftHand.rotation.y, -0.05 + handIdle * 0.5, 8, delta)
        rightHand.rotation.y = THREE.MathUtils.damp(rightHand.rotation.y, 0.05 - handIdle * 0.5, 8, delta)
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
