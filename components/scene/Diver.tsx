"use client";

import { useMemo } from "react";
import { useFBX, useTexture } from "@react-three/drei";
import * as THREE from "three";

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
const TARGET_LENGTH = 2.0; // longest dimension in world units
const BASE_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0]; // stand → prone (swimming)

export function Diver() {
  const fbx = useFBX(MODEL);

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
      mesh.material = name?.includes("skin") ? skinMat : propsMat;
    });

    // Normalize size & position: fit longest axis to TARGET_LENGTH, center,
    // then drop so the lowest point sits on y=0 of the wrapper group.
    const box = new THREE.Box3().setFromObject(fbx);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const scale = TARGET_LENGTH / Math.max(size.x, size.y, size.z);
    fbx.scale.setScalar(scale);
    fbx.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

    return fbx;
  }, [fbx, skinD, skinN, skinORM, propsD, propsN, propsORM]);

  return (
    <group rotation={BASE_ROTATION}>
      <primitive object={model} />
    </group>
  );
}
