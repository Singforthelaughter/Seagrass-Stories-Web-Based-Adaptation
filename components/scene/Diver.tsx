"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFBX, useTexture, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "@/lib/store";

/**
 * The user-provided scuba diver model (FBX) with its PBR texture sets.
 *
 * The FBX ships three material slots — `M_Skin`, `M_Props_Variation01`,
 * `S_Props.001` — which we map to two Unreal-style texture sets:
 *   T_Skin_*  → the wetsuit/skin  (this is the "wetsuit" material the P4
 *               AI-texture feature will eventually re-skin)
 *   T_Props_* → tank/mask/fins/etc.
 *
 * Each set is D (albedo, sRGB) + N (normal) + ORM (packed
 * occlusion=R, roughness=G, metalness=B), the glTF/Unreal convention that
 * three's meshStandardMaterial reads natively from the right channels.
 */

const MODEL = "/models/diver/diver.fbx";

// Unreal exports DirectX-style normals; three expects OpenGL → flip green.
const NORMAL_SCALE = new THREE.Vector2(1, -1);

// Visual tuning — adjust if the diver looks too big/small or mis-oriented.
const DEFAULT_LENGTH = 2.0; // longest dimension in world units
// -90° about X stands the model upright (its authored axis is on its back).
const DEFAULT_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];

type DiverProps = {
  /** Longest-axis size in world units. */
  targetLength?: number;
  /** Extra rotation applied to the model (radians). */
  rotation?: [number, number, number];
};

export function Diver({
  targetLength = DEFAULT_LENGTH,
  rotation = DEFAULT_ROTATION,
}: DiverProps = {}) {
  const fbx = useFBX(MODEL);
  const { actions, names } = useAnimations(fbx.animations, fbx);
  const suitMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const suitTextureUrl = useGame((s) => s.suitTextureUrl);

  // Auto-play the model's baked animation (the first clip), looped.
  useEffect(() => {
    const first = names[0];
    if (!first) return;
    const action = actions[first];
    action?.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.3).play();
    return () => {
      action?.fadeOut(0.2);
    };
  }, [actions, names]);

  const [skinD, skinN, skinORM, propsD, propsN, propsORM] = useTexture([
    "/models/diver/T_Skin_D.jpg",
    "/models/diver/T_Skin_N.jpg",
    "/models/diver/T_Skin_ORM.jpg",
    "/models/diver/T_Props_D.jpg",
    "/models/diver/T_Props_N.jpg",
    "/models/diver/T_Props_ORM.jpg",
  ]);

  const model = useMemo(() => {
    // Albedo is color data (sRGB); normal + ORM are linear data.
    skinD.colorSpace = THREE.SRGBColorSpace;
    propsD.colorSpace = THREE.SRGBColorSpace;
    for (const t of [skinN, skinORM, propsN, propsORM]) {
      t.colorSpace = THREE.NoColorSpace;
    }

    const makeMaterial = (
      map: THREE.Texture,
      normalMap: THREE.Texture,
      orm: THREE.Texture,
    ) =>
      new THREE.MeshStandardMaterial({
        map,
        normalMap,
        normalScale: NORMAL_SCALE,
        // three samples roughness from G and metalness from B automatically.
        roughnessMap: orm,
        metalnessMap: orm,
        aoMap: orm, // reads R; needs a uv2 set (added below)
        roughness: 1,
        metalness: 1,
      });

    const skinMat = makeMaterial(skinD, skinN, skinORM);
    const propsMat = makeMaterial(propsD, propsN, propsORM);

    // The wetsuit (M_Suit) starts as a plain black material with no maps — the
    // AI-generated texture will be applied to it later (P4). Named so it can be
    // found and re-skinned at runtime.
    const suitMat = new THREE.MeshStandardMaterial({
      color: "#050505",
      // semi-matte wetsuit: enough sheen to read form, but not so mirror-like
      // that it reflects the (darker) environment on the camera-facing side.
      roughness: 0.5,
      metalness: 0.0,
      envMapIntensity: 0.8,
    });
    suitMat.name = "M_Suit";
    suitMatRef.current = suitMat;

    fbx.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // aoMap uses the second UV channel; reuse uv if uv2 is missing.
      const geom = mesh.geometry as THREE.BufferGeometry;
      if (geom.attributes.uv && !geom.attributes.uv2) {
        geom.setAttribute("uv2", geom.attributes.uv);
      }

      const name = (
        Array.isArray(mesh.material) ? mesh.material[0]?.name : mesh.material?.name
      )?.toLowerCase();
      if (name?.includes("suit")) mesh.material = suitMat;
      else if (name?.includes("skin")) mesh.material = skinMat;
      else mesh.material = propsMat;
    });

    // Normalize size & position deterministically: measure at scale 1,
    // fit the longest axis to targetLength, and center on the origin.
    fbx.scale.set(1, 1, 1);
    fbx.position.set(0, 0, 0);
    fbx.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(fbx);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const scale = targetLength / Math.max(size.x, size.y, size.z);
    fbx.scale.setScalar(scale);
    fbx.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

    return fbx;
  }, [fbx, targetLength, skinD, skinN, skinORM, propsD, propsN, propsORM]);

  // Apply (or clear) the AI-generated wetsuit texture on M_Suit.
  useEffect(() => {
    const mat = suitMatRef.current;
    if (!mat) return;
    if (!suitTextureUrl) {
      mat.map?.dispose();
      mat.map = null;
      mat.color.set("#050505");
      mat.needsUpdate = true;
      return;
    }
    let disposed = false;
    new THREE.TextureLoader().load(suitTextureUrl, (tex) => {
      if (disposed) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      mat.map?.dispose();
      mat.map = tex;
      mat.color.set("#ffffff"); // let the texture show its true colours
      mat.needsUpdate = true;
    });
    return () => {
      disposed = true;
    };
  }, [suitTextureUrl, model]);

  return (
    <group rotation={rotation}>
      <primitive object={model} />
    </group>
  );
}
