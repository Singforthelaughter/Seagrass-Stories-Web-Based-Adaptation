"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFBX, useTexture, useAnimations, Html } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

/**
 * A stationary NPC diver — a stand-in for another player in multiplayer — that
 * idles in place and shows a cycling emoji speech bubble, so we can preview how
 * a remote player's emotes will read. It clones the diver FBX (the player's
 * Diver uses the shared cached instance, which can't be rendered twice) and
 * gives it its own tinted suit so it's clearly a different diver.
 */

const MODEL = "/models/diver/diver.fbx";
const TARGET_LENGTH = 2.3;
const NORMAL_SCALE = new THREE.Vector2(1, -1); // DirectX → OpenGL normals
const SUIT_TINT = "#5fa9d6"; // distinct from the player's (white/AI) suit

const EMOTES = ["👋", "👍", "❤️", "😄", "🐠", "🌱", "🤿", "✨"];
const CYCLE_MS = 3500; // how often the NPC shows a new emote
const HEAD_Y = 1.6; // bubble height above the NPC's centre
const UPRIGHT: [number, number, number] = [-Math.PI / 2, 0, 0]; // stand it up

export function NpcDiver({
  position = [3, 1.3, -3],
}: {
  position?: [number, number, number];
}) {
  const fbx = useFBX(MODEL);
  const group = useRef<THREE.Group>(null!);
  const [skinD, skinN, skinORM, propsD, propsN, propsORM] = useTexture([
    "/models/diver/T_Skin_D.jpg",
    "/models/diver/T_Skin_N.jpg",
    "/models/diver/T_Skin_ORM.jpg",
    "/models/diver/T_Props_D.jpg",
    "/models/diver/T_Props_N.jpg",
    "/models/diver/T_Props_ORM.jpg",
  ]);

  // Independent clone with its own materials, normalised + centred.
  const object = useMemo(() => {
    skinD.colorSpace = THREE.SRGBColorSpace;
    propsD.colorSpace = THREE.SRGBColorSpace;
    for (const t of [skinN, skinORM, propsN, propsORM]) t.colorSpace = THREE.NoColorSpace;

    const make = (map: THREE.Texture, n: THREE.Texture, orm: THREE.Texture) =>
      new THREE.MeshStandardMaterial({
        map,
        normalMap: n,
        normalScale: NORMAL_SCALE,
        roughnessMap: orm,
        metalnessMap: orm,
        aoMap: orm,
        roughness: 1,
        metalness: 1,
      });
    const skinMat = make(skinD, skinN, skinORM);
    const propsMat = make(propsD, propsN, propsORM);
    const suitMat = new THREE.MeshStandardMaterial({
      color: SUIT_TINT,
      roughness: 0.5,
      metalness: 0,
      envMapIntensity: 0.8,
    });

    const obj = SkeletonUtils.clone(fbx);
    obj.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const geom = mesh.geometry as THREE.BufferGeometry;
      if (geom.attributes.uv && !geom.attributes.uv2) geom.setAttribute("uv2", geom.attributes.uv);
      const name = (
        Array.isArray(mesh.material) ? mesh.material[0]?.name : mesh.material?.name
      )?.toLowerCase();
      if (name?.includes("suit")) mesh.material = suitMat;
      else if (name?.includes("skin")) mesh.material = skinMat;
      else mesh.material = propsMat;
    });

    obj.scale.set(1, 1, 1);
    obj.position.set(0, 0, 0);
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = TARGET_LENGTH / Math.max(size.x, size.y, size.z);
    obj.scale.setScalar(s);
    obj.position.set(-center.x * s, -center.y * s, -center.z * s);
    return obj;
  }, [fbx, skinD, skinN, skinORM, propsD, propsN, propsORM]);

  // Play the diver's baked idle animation on this clone's own mixer.
  const { actions, names } = useAnimations(fbx.animations, group);
  useEffect(() => {
    const a = actions[names[0]];
    a?.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    return () => {
      a?.fadeOut(0.2);
    };
  }, [actions, names]);

  // Cycle the emote so different emojis can be previewed.
  const [emote, setEmote] = useState(EMOTES[0]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setEmote(EMOTES[Math.floor(Math.random() * EMOTES.length)]);
      setTick((t) => t + 1);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <group position={position}>
      <group ref={group} rotation={UPRIGHT}>
        <primitive object={object} />
      </group>
      <group position={[0, HEAD_Y, 0]}>
        <Html center distanceFactor={12} zIndexRange={[20, 0]}>
          <div key={tick} className="emote-pop pointer-events-none select-none">
            <div className="emote-bubble">{emote}</div>
          </div>
        </Html>
      </group>
    </group>
  );
}

useFBX.preload(MODEL);
