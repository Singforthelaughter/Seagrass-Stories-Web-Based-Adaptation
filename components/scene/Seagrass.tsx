"use client"

import { useEffect, useMemo, useRef } from "react"
import { Clone, useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { smootherstep } from "@/lib/ease"
import { playSfx } from "@/lib/audio"
import { useGame } from "@/lib/store"
import type { PlacedBasket } from "@/lib/store"
import {
  BASKET_LIFETIME,
  FADE_OUT_DUR,
  STARTING_SEAGRASS,
  SEAGRASS_PER_BASKET,
} from "@/lib/gameConfig"

/**
 * The seagrass meadow. Two authored variants (SM_SeaGrass_01 / _02) are mixed
 * randomly for variety, normalised to a consistent height.
 *
 * Restoration loop:
 *  - SeagrassField  — the sparse starting meadow: just a few random clumps.
 *  - BasketSeagrass — new growth only appears around placed anchor baskets,
 *    sprouting in (scaling up, staggered) over time once a basket is dropped.
 */

const MODELS = ["/models/seagrass/seagrass0.glb", "/models/seagrass/seagrass1.glb"] as const

const TARGET_HEIGHT = 1.6 // world units, tallest blade ~ this

// --- starting meadow ---
const FIELD_BOUND = 88 // spread (just inside the diver's SWIM_BOUND of 90)
const START_COUNT = STARTING_SEAGRASS // sparse: the meadow has been damaged

// --- growth around baskets ---
const PER_BASKET = SEAGRASS_PER_BASKET // sprouts grown per anchor basket
const CLUSTER_MIN = 0.25 // ring around the basket the sprouts grow in
const CLUSTER_MAX = 1.25
const GROW_DUR = 1.6 // seconds for one sprout to grow to full
const GROW_STAGGER = 0.45 // delay between successive sprouts in a cluster
const GROW_START_DELAY = 1.75 // pause after a basket is placed before the first
// sprout grows (≈ the basket's drop + open time, so grass appears once it opens)

type Blade = {
  variant: 0 | 1
  x: number
  z: number
  rotY: number
  scale: number
}

/** Loads both seagrass variants and the per-variant scale that normalises them
 *  to TARGET_HEIGHT. Models are cached, so this is shared cheaply. */
function useSeagrassModels() {
  const gltf0 = useGLTF(MODELS[0])
  const gltf1 = useGLTF(MODELS[1])
  const scenes = useMemo(() => [gltf0.scene, gltf1.scene], [gltf0.scene, gltf1.scene])
  const baseScale = useMemo(
    () =>
      scenes.map((scene) => {
        const box = new THREE.Box3().setFromObject(scene)
        const size = new THREE.Vector3()
        box.getSize(size)
        return TARGET_HEIGHT / Math.max(size.y, 1e-4)
      }),
    [scenes],
  )
  return { scenes, baseScale }
}

/** The sparse starting meadow — a handful of random clumps. Rendered inside the
 *  seafloor's scaling group, so it grows in with the floor on dive-in. */
export function SeagrassField() {
  const { scenes, baseScale } = useSeagrassModels()

  const blades = useMemo<Blade[]>(() => {
    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    return Array.from({ length: START_COUNT }, () => ({
      variant: (Math.random() < 0.5 ? 0 : 1) as 0 | 1,
      x: rand(-FIELD_BOUND, FIELD_BOUND),
      z: rand(-FIELD_BOUND, FIELD_BOUND),
      rotY: rand(0, Math.PI * 2),
      scale: rand(0.75, 1.4),
    }))
  }, [])

  return (
    <group>
      {blades.map((b, i) => (
        <Clone key={i} object={scenes[b.variant]} position={[b.x, 0, b.z]} rotation={[0, b.rotY, 0]} scale={baseScale[b.variant] * b.scale} castShadow receiveShadow />
      ))}
    </group>
  )
}

/** A single sprout that scales up from 0 → full over GROW_DUR after `delay`,
 *  then fades out with its basket at the end of the shared lifetime.
 *
 *  Unlike <Clone>, this owns a deep clone with UNIQUE (transparent) materials so
 *  its opacity can be faded without affecting every other seagrass instance. */
function Sprout({ object, position, rotY, scale, delay }: { object: THREE.Object3D; position: [number, number, number]; rotY: number; scale: number; delay: number }) {
  const ref = useRef<THREE.Group>(null!)
  const age = useRef(0)

  const { obj, mats } = useMemo(() => {
    const obj = object.clone(true)
    const mats: THREE.Material[] = []
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      const src = mesh.material
      const cloned = Array.isArray(src) ? src.map((m) => m.clone()) : src.clone()
      ;(Array.isArray(cloned) ? cloned : [cloned]).forEach((m) => {
        m.transparent = true
        mats.push(m)
      })
      mesh.material = cloned
    })
    return { obj, mats }
  }, [object])

  useFrame((_s, dt) => {
    age.current += Math.min(dt, 0.05)
    const a = age.current
    const grow = smootherstep(THREE.MathUtils.clamp((a - delay) / GROW_DUR, 0, 1))
    ref.current.scale.setScalar(grow * scale)
    // fade out on the same lifetime as the basket it belongs to
    const vis = 1 - THREE.MathUtils.clamp((a - BASKET_LIFETIME) / FADE_OUT_DUR, 0, 1)
    for (const m of mats) m.opacity = vis
  })
  return (
    <group ref={ref} position={position} rotation={[0, rotY, 0]} scale={0}>
      <primitive object={obj} />
    </group>
  )
}

/** Deterministic PRNG (mulberry32) seeded from a string, so a basket always
 *  grows the exact same sprout layout — stable across the frequent basket-list
 *  refreshes (realtime sync rebuilds the array each change) and identical on
 *  every client. */
function seededRand(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let s = h >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Seagrass grown around one anchor basket. */
function Cluster({ id, pos, createdAt }: { id: string; pos: PlacedBasket["pos"]; createdAt: number }) {
  const { scenes, baseScale } = useSeagrassModels()

  // Play the growing SFX once, when this cluster's first sprout starts growing.
  // Skip baskets that were already grown before we arrived (late joiners): only
  // schedule if the grow-start moment is still in the (near) future/now.
  useEffect(() => {
    const startsIn = createdAt + GROW_START_DELAY * 1000 - Date.now()
    if (startsIn < -250) return // already growing/grown before we saw it
    const t = setTimeout(() => playSfx("seaGrassGrowing"), Math.max(0, startsIn))
    return () => clearTimeout(t)
  }, [createdAt])

  // Seed from the basket id (not Math.random) so the layout is fixed for this
  // basket and never shuffles when the basket list is rebuilt by the sync.
  const sprouts = useMemo(() => {
    const rng = seededRand(id)
    const rand = (a: number, b: number) => a + rng() * (b - a)
    return Array.from({ length: PER_BASKET }, (_, i) => {
      const variant = (rng() < 0.5 ? 0 : 1) as 0 | 1
      const ang = rand(0, Math.PI * 2)
      const r = rand(CLUSTER_MIN, CLUSTER_MAX)
      return {
        variant,
        position: [pos[0] + Math.cos(ang) * r, 0, pos[2] + Math.sin(ang) * r] as [number, number, number],
        rotY: rand(0, Math.PI * 2),
        scale: baseScale[variant] * rand(0.7, 1.2),
        delay: GROW_START_DELAY + i * GROW_STAGGER,
      }
    })
    // pos[0]/pos[2] are stable values for a given id; depend on id so a new
    // array reference from the realtime refresh doesn't recompute the layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, baseScale])

  return (
    <>
      {sprouts.map((s, i) => (
        <Sprout key={i} object={scenes[s.variant]} position={s.position} rotY={s.rotY} scale={s.scale} delay={s.delay} />
      ))}
    </>
  )
}

/** Grows seagrass around every placed anchor basket. */
export function BasketSeagrass() {
  const baskets = useGame((s) => s.baskets)
  return (
    <>
      {baskets.map((b) => (
        <Cluster key={b.id} id={b.id} pos={b.pos} createdAt={b.createdAt} />
      ))}
    </>
  )
}

useGLTF.preload(MODELS[0])
useGLTF.preload(MODELS[1])
