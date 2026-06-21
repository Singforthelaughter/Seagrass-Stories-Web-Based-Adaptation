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
 * (closed), then auto-opens by driving its "Open" morph 0 → 1.
 *
 * COLOUR: the basket uses an UNLIT material (MeshBasicMaterial). The texture's
 * UVs are correct (the woven alpha cutouts land in the right place), so the
 * only reason earlier (lit) attempts looked white was the bright scene lighting
 * + tone-mapping washing the brown albedo out. Unlit = the texture's real
 * colour is exactly what renders, independent of scene lights.
 *
 * SHADOW: an exact duplicate of the basket — same clone, same normalisation,
 * same drop, same "Open" morph value every frame — only the colour differs
 * (black). It sits at the IDENTICAL position for now (no offset); we can nudge
 * it once alignment is confirmed.
 */

const MODEL = "/models/basket/basket.glb"
const TEXTURE = "/models/basket/basket.png"
const TARGET_SIZE = 3.2 // longest dimension in world units

const DROP_HEIGHT = 4 // spawns this high, then drops to the seabed
const DROP_DUR = 0.6 // fade-in + drop time
const OPEN_DELAY = 0.15 // pause closed after landing
const OPEN_DUR = 1.0 // morph open time

const SHADOW_OPACITY = 0.4 // darkness of the duplicate "shadow"

/** Build a normalised, per-instance clone of the basket with the given material
 *  factory, and return its root + the mesh that carries the "Open" morph. */
function buildClone(source: THREE.Object3D, makeMaterial: () => THREE.Material) {
  const root = source.clone(true)

  let morphMesh: THREE.Mesh | null = null
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = false
    mesh.receiveShadow = false
    mesh.material = makeMaterial()
    if (mesh.morphTargetInfluences) morphMesh = mesh
  })

  // Normalise size and sit the base on the seabed (y = 0), centred on x/z.
  const box = new THREE.Box3().setFromObject(root)
  const size = new THREE.Vector3()
  box.getSize(size)
  const s = TARGET_SIZE / Math.max(size.x, size.y, size.z)
  root.scale.setScalar(s)
  box.setFromObject(root)
  const center = new THREE.Vector3()
  box.getCenter(center)
  root.position.set(-center.x, -box.min.y, -center.z)

  return { root, morphMesh: morphMesh as THREE.Mesh | null }
}

function Basket({ pos }: { pos: PlacedBasket["pos"] }) {
  const gltf = useGLTF(MODEL)
  const tex = useTexture(TEXTURE)

  const { root, morphMesh, morphIndex, mats, shadowRoot, shadowMats } = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.flipY = false // matches the glTF UV convention (top-left origin)
    tex.needsUpdate = true

    // --- basket: unlit so the texture colour is exactly what you see ---
    const mats: THREE.MeshBasicMaterial[] = []
    const { root, morphMesh } = buildClone(gltf.scene, () => {
      const m = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true, // texture alpha (woven holes) + fade-in
        opacity: 0,
      })
      mats.push(m)
      return m
    })

    const dict = morphMesh?.morphTargetDictionary
    const morphIndex = dict?.["Open"] ?? 0

    // --- shadow: duplicate, black tint, kept fully OPEN; it grows by scaling
    //     up (see useFrame) rather than morphing, like an expanding contact
    //     shadow that spreads out as the basket opens. ---
    const shadowMats: THREE.MeshBasicMaterial[] = []
    const { root: shadowRoot, morphMesh: shadowMorph } = buildClone(gltf.scene, () => {
      const m = new THREE.MeshBasicMaterial({
        map: tex, // keep alpha so the woven holes match
        color: "#000000", // black × albedo = dark silhouette
        transparent: true,
        opacity: 0,
        depthWrite: false, // overlaps the basket exactly → don't fight depth
        depthTest: false,
      })
      shadowMats.push(m)
      return m
    })
    if (shadowMorph) shadowMorph.morphTargetInfluences![morphIndex] = 1 // hold open
    // Drop buildClone's baked centring offset so the wrapper group fully owns
    // the shadow's placement (matching how the basket root is positioned), and
    // so it scales cleanly around the group origin.
    shadowRoot.position.set(0, 0, 0)

    return { root, morphMesh, morphIndex, mats, shadowRoot, shadowMats }
  }, [gltf, tex])

  const outer = useRef<THREE.Group>(null!)
  const shadowGroup = useRef<THREE.Group>(null!)
  const age = useRef(0)

  useFrame((_s, dt) => {
    age.current += Math.min(dt, 0.05)
    const a = age.current
    // 1) fade in while dropping to seabed level (y = 0)
    const drop = smootherstep(Math.min(a / DROP_DUR, 1))
    outer.current.position.y = THREE.MathUtils.lerp(DROP_HEIGHT, 0, drop)
    for (const m of mats) m.opacity = drop
    for (const m of shadowMats) m.opacity = drop * SHADOW_OPACITY
    // 2) open via morph once landed; the (already-open) shadow scales up from 0
    //    on the same timeline, spreading out beneath the basket.
    const open = smootherstep(Math.min(Math.max((a - DROP_DUR - OPEN_DELAY) / OPEN_DUR, 0), 1))
    if (morphMesh) morphMesh.morphTargetInfluences![morphIndex] = open
    shadowGroup.current.scale.setScalar(open)
  })

  return (
    <group ref={outer} position={[pos[0], DROP_HEIGHT, pos[2]]}>
      <primitive object={root} position={[0, 0.02, 0]} />
      {/* shadow: held fully open, scaled up from 0 around the basket's footprint
          centre (seabed level) so it grows out as the basket opens. */}
      <group ref={shadowGroup} position={[-0.025, 0.005, -0.025]} scale={0}>
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
