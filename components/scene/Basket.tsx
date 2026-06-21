"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useGLTF, useTexture } from "@react-three/drei"
import * as THREE from "three"
import { useGame } from "@/lib/store"
import type { PlacedBasket } from "@/lib/store"
import { smootherstep } from "@/lib/ease"

/**
 * An anchor basket placed on the seafloor. It fades in and drops to the seabed
 * (closed), then auto-opens by driving its "Open" morph 0 → 1. The GLB ships no
 * texture, so basket.png is applied as the matte albedo of M_basket.
 *
 * The shadow is a dark, flattened clone of the basket mesh kept fully OPEN,
 * offset slightly so a sliver of it shows next to the basket as a fake shadow.
 */

const MODEL = "/models/basket/basket.glb"
const TEXTURE = "/models/basket/basket.png"
const TARGET_SIZE = 3.2 // longest dimension in world units

const DROP_HEIGHT = 4 // spawns this high, then drops to the seabed
const DROP_DUR = 0.6 // fade-in + drop time
const OPEN_DELAY = 0.15 // pause closed after landing
const OPEN_DUR = 1.0 // morph open time

const SHADOW_OPACITY = 0.4 // darkness of the fake shadow
const SHADOW_FLAT = 0.05 // vertical squash → lies flat on the sand
const SHADOW_Y = -0.001 // just below the basket base (which sits at y=0)

function Basket({ pos }: { pos: PlacedBasket["pos"] }) {
  const gltf = useGLTF(MODEL)
  const tex = useTexture(TEXTURE)

  // Clone per instance so each basket has its own morph influences + transform.
  const { root, morphMesh, morphIndex, mats, shadowRoot, shadowMats } = useMemo(() => {
    const root = gltf.scene.clone(true)
    // tex.colorSpace = THREE.SRGBColorSpace
    tex.flipY = false // Blender-exported PNG (sampling was hitting empty atlas)
    tex.needsUpdate = true // re-upload after the flipY/colorSpace change

    let morphMesh: THREE.Mesh | null = null
    const mats: THREE.MeshStandardMaterial[] = []
    root.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = false // we fake the shadow below
      mesh.receiveShadow = true
      // The GLB material has no texture, so build a fresh one with the texture
      // as albedo (cloning the GLB material wasn't picking up the map).
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        metalness: 0,
        roughness: 0.85,
        envMapIntensity: 0.1, // keep the bright IBL from washing the brown out
        transparent: true, // for the fade-in
        opacity: 0,
      })
      mat.needsUpdate = true
      mesh.material = mat
      mats.push(mat)
      if (mesh.morphTargetInfluences) morphMesh = mesh
    })

    // Normalise size and sit the base on the seabed (y = 0).
    const box = new THREE.Box3().setFromObject(root)
    const size = new THREE.Vector3()
    box.getSize(size)
    const s = TARGET_SIZE / Math.max(size.x, size.y, size.z)
    root.scale.setScalar(s)
    box.setFromObject(root)
    const center = new THREE.Vector3()
    box.getCenter(center)
    root.position.set(-center.x, -box.min.y, -center.z)

    const dict = (morphMesh as THREE.Mesh | null)?.morphTargetDictionary
    const morphIndex = dict?.["Open"] ?? 0

    // --- shadow: clone the ALREADY-NORMALISED basket so its transform is
    // identical (guaranteed alignment), then black it out and keep it open. ---
    const shadowRoot = root.clone(true)
    const shadowMats: THREE.MeshBasicMaterial[] = []
    shadowRoot.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const smat = new THREE.MeshBasicMaterial({
        map: tex, // texture alpha → the woven holes show in the shadow
        color: "#000000", // black × albedo = black silhouette
        transparent: true,
        opacity: 0,
        depthWrite: true,
      })
      mesh.material = smat
      shadowMats.push(smat)
      if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[morphIndex] = 1 // open
    })
    return {
      root,
      morphMesh: morphMesh as THREE.Mesh | null,
      morphIndex,
      mats,
      shadowRoot,
      shadowMats,
    }
  }, [gltf, tex])

  const outer = useRef<THREE.Group>(null!)
  const shadow = useRef<THREE.Group>(null!)
  const age = useRef(0)

  useFrame((_s, dt) => {
    age.current += Math.min(dt, 0.05)
    const a = age.current
    // 1) fade in while dropping down to seabed level (y = 0, flush with floor)
    const drop = smootherstep(Math.min(a / DROP_DUR, 1))
    outer.current.position.y = THREE.MathUtils.lerp(DROP_HEIGHT, 0, drop)
    for (const m of mats) m.opacity = drop
    // 2) open via morph once landed; the flattened shadow grows in with it
    const open = smootherstep(Math.min(Math.max((a - DROP_DUR - OPEN_DELAY) / OPEN_DUR, 0), 1))
    if (morphMesh) morphMesh.morphTargetInfluences![morphIndex] = open
    shadow.current.scale.set(open, open * SHADOW_FLAT, open)
    for (const m of shadowMats) m.opacity = open * SHADOW_OPACITY
  })

  return (
    <group ref={outer} position={[pos[0], DROP_HEIGHT, pos[2]]}>
      <primitive object={root} />
      {/* shadow nested in the basket group → exact same x/z as the basket.
          Flattened (squashed Y) so it lies flat as a fake contact shadow. */}
      <group ref={shadow} position={[0, SHADOW_Y, 0]} scale={0}>
        <primitive object={shadowRoot} />
      </group>
    </group>
  )
}

/** Renders every placed basket. */
export function Baskets() {
  const baskets = useGame((s) => s.baskets)
  return (
    <>
      {baskets.map((b) => (
        <Basket key={b.id} pos={b.pos} />
      ))}
    </>
  )
}

useGLTF.preload(MODEL)
useTexture.preload(TEXTURE)
