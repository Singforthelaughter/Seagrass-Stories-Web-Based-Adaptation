"use client";

/**
 * The sandy seafloor. Movement is driven by the on-screen joystick now;
 * later phases will layer tap-to-place (anchor baskets) back on top of this.
 */
export function Seafloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200, 1, 1]} />
      <meshStandardMaterial color="#c2a878" roughness={1} metalness={0} />
    </mesh>
  );
}
