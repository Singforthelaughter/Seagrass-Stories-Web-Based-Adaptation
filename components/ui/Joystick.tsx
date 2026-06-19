"use client";

import { useRef } from "react";
import { useGame } from "@/lib/store";

const BASE = 132; // px — outer ring diameter
const KNOB = 58; // px — thumb diameter
const MAX_R = BASE / 2 - KNOB / 2 + 8; // max knob travel from center

/** Bottom-right virtual joystick that drives the diver's swim input. */
export function Joystick() {
  const setMove = useGame((s) => s.setMove);
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const center = useRef({ x: 0, y: 0 });
  const pid = useRef<number | null>(null);

  const placeKnob = (x: number, y: number) => {
    if (knobRef.current) knobRef.current.style.transform = `translate(${x}px, ${y}px)`;
  };

  const onDown = (e: React.PointerEvent) => {
    const rect = baseRef.current!.getBoundingClientRect();
    center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    pid.current = e.pointerId;
    baseRef.current!.setPointerCapture(e.pointerId);
    onMove(e);
  };

  const onMove = (e: React.PointerEvent) => {
    if (pid.current !== e.pointerId) return;
    const dx = e.clientX - center.current.x;
    const dy = e.clientY - center.current.y;
    const dist = Math.hypot(dx, dy);
    const m = Math.min(dist, MAX_R);
    const ang = Math.atan2(dy, dx);
    const kx = Math.cos(ang) * m;
    const ky = Math.sin(ang) * m;
    placeKnob(kx, ky);
    setMove(kx / MAX_R, ky / MAX_R); // screen-down = +Z (toward camera)
  };

  const onUp = (e: React.PointerEvent) => {
    if (pid.current !== e.pointerId) return;
    pid.current = null;
    placeKnob(0, 0);
    setMove(0, 0);
  };

  return (
    <div
      ref={baseRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className="absolute bottom-10 right-7 z-20 touch-none select-none rounded-full border border-white/25 bg-white/10 shadow-inner backdrop-blur"
      style={{ width: BASE, height: BASE }}
    >
      <div
        ref={knobRef}
        className="pointer-events-none absolute left-1/2 top-1/2 rounded-full bg-white/75 shadow-lg"
        style={{
          width: KNOB,
          height: KNOB,
          marginLeft: -KNOB / 2,
          marginTop: -KNOB / 2,
          transition: "transform 0.08s ease-out",
        }}
      />
    </div>
  );
}
