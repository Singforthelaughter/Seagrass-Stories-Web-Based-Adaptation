"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useFBX, useTexture, useAnimations, Html } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { remotePoses } from "@/lib/multiplayer";

/**
 * Another player's diver, driven by synced state: its pose is interpolated from
 * the latest broadcast, its wetsuit shows their AI texture, and its emote bubble
 * shows their latest emoji. Renders prone like the local player.
 */

const MODEL = "/models/diver/diver.fbx";
const TARGET_LENGTH = 2.3;
const NORMAL_SCALE = new THREE.Vector2(1, -1);

const UPRIGHT: [number, number, number] = [-Math.PI / 2, 0, 0];
const LEAN = Math.PI * 0.42; // prone, like the swimming player
const HEAD_OFFSET = 0.5;
const EMOTE_DURATION = 3000;
const LERP = 8; // pose interpolation rate

const _v = new THREE.Vector3();

export function RemoteDiver({
  id,
  texture,
  emote,
  emoteAt,
}: {
  id: string;
  texture: string | null;
  emote: string | null;
  emoteAt: number;
}) {
  const fbx = useFBX(MODEL);
  const root = useRef<THREE.Group>(null!); // world position + yaw
  const rig = useRef<THREE.Group>(null!); // animated clone holder (lean)
  const bubble = useRef<THREE.Group>(null!);
  const headRef = useRef<THREE.Object3D | null>(null);
  const suitMat = useRef<THREE.MeshStandardMaterial | null>(null);
  const seen = useRef(false); // becomes true once we have a pose
  const yaw = useRef(0);

  const [skinD, skinN, skinORM, propsD, propsN, propsORM] = useTexture([
    "/models/diver/T_Skin_D.jpg",
    "/models/diver/T_Skin_N.jpg",
    "/models/diver/T_Skin_ORM.jpg",
    "/models/diver/T_Props_D.jpg",
    "/models/diver/T_Props_N.jpg",
    "/models/diver/T_Props_ORM.jpg",
  ]);

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
    const sMat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.5,
      metalness: 0,
      envMapIntensity: 0.8,
    });
    sMat.name = "M_Suit";
    suitMat.current = sMat;

    const obj = SkeletonUtils.clone(fbx);
    obj.traverse((child) => {
      if (child.name === "Head") headRef.current = child;
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const geom = mesh.geometry as THREE.BufferGeometry;
      if (geom.attributes.uv && !geom.attributes.uv2) geom.setAttribute("uv2", geom.attributes.uv);
      const name = (
        Array.isArray(mesh.material) ? mesh.material[0]?.name : mesh.material?.name
      )?.toLowerCase();
      if (name?.includes("suit")) mesh.material = sMat;
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

  // Play the baked idle animation on this clone's own mixer.
  const { actions, names } = useAnimations(fbx.animations, rig);
  useEffect(() => {
    const a = actions[names[0]];
    a?.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    return () => {
      a?.fadeOut(0.2);
    };
  }, [actions, names]);

  // Apply (or clear) the remote player's AI wetsuit texture.
  useEffect(() => {
    const mat = suitMat.current;
    if (!mat) return;
    if (!texture) {
      mat.map?.dispose();
      mat.map = null;
      mat.color.set("#ffffff");
      mat.needsUpdate = true;
      return;
    }
    let disposed = false;
    new THREE.TextureLoader().load(texture, (tex) => {
      if (disposed) return tex.dispose();
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      mat.map?.dispose();
      mat.map = tex;
      mat.color.set("#ffffff");
      mat.needsUpdate = true;
    });
    return () => {
      disposed = true;
    };
  }, [texture]);

  useFrame((_s, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const target = remotePoses.get(id);
    if (target) {
      if (!seen.current) {
        // snap on first sight
        root.current.position.set(target.x, target.y, target.z);
        yaw.current = target.yaw;
        root.current.visible = true;
        seen.current = true;
      } else {
        const a = 1 - Math.exp(-LERP * dt);
        root.current.position.lerp(_v.set(target.x, target.y, target.z), a);
        // shortest-path yaw lerp
        let d = target.yaw - yaw.current;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        yaw.current += d * a;
      }
      root.current.rotation.y = yaw.current;
    } else if (!seen.current) {
      root.current.visible = false;
    }

    // anchor the bubble to the head bone in world space
    const h = headRef.current;
    if (h && bubble.current) {
      h.updateWorldMatrix(true, false);
      h.getWorldPosition(_v);
      bubble.current.position.set(_v.x, _v.y + HEAD_OFFSET, _v.z);
    }
  });

  const showEmote = !!emote && Date.now() - emoteAt < EMOTE_DURATION;

  return (
    <>
      <group ref={root} visible={false}>
        <group ref={rig} rotation={[LEAN, 0, 0]}>
          <group rotation={UPRIGHT}>
            <primitive object={object} />
          </group>
        </group>
      </group>
      <group ref={bubble}>
        {showEmote && (
          <Html center distanceFactor={12} zIndexRange={[20, 0]}>
            <div key={emoteAt} className="emote-pop pointer-events-none select-none">
              <div className="emote-bubble">{emote}</div>
            </div>
          </Html>
        )}
      </group>
    </>
  );
}

useFBX.preload(MODEL);
