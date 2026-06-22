"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A "play while you wait" mini-game, shown over a full-screen popup while the
 * wetsuit texture generates (~20s). It's the Chrome dinosaur game reskinned:
 * a scuba diver 🤿 swims along the seabed and you tap / press space to bob up
 * and over incoming sea animals. Everything is drawn with emoji — no assets.
 *
 * The popup auto-opens when generation starts (`open` → true) and auto-closes
 * once the texture is applied (`open` → false); we hold a brief "ready!" beat
 * so the close isn't jarring.
 */

// Logical canvas resolution (CSS scales it to the container width, ratio kept).
const W = 640;
const H = 240;
const GROUND_Y = 196; // baseline the diver and obstacles sit on

// Physics (px / s, px / s²).
const GRAVITY = 2600;
const JUMP_V = -880;
const START_SPEED = 300; // obstacle scroll speed
const MAX_SPEED = 660;
const SPEED_RAMP = 9; // speed gained per second survived

const OBSTACLES = ["🦈", "🐡", "🦀", "🐙", "🦞", "🪸"];

type GamePhase = "hidden" | "playing" | "done";

type Obstacle = { x: number; emoji: string; size: number };

export function DiverRunnerGame({ open }: { open: boolean }) {
  const [phase, setPhase] = useState<GamePhase>("hidden");

  // Mount on open; on close, flash a "ready" beat, then unmount.
  useEffect(() => {
    if (open) {
      setPhase("playing");
      return;
    }
    let t: ReturnType<typeof setTimeout> | undefined;
    setPhase((p) => {
      if (p === "hidden") return "hidden";
      t = setTimeout(() => setPhase("hidden"), 1200);
      return "done";
    });
    return () => t && clearTimeout(t);
  }, [open]);

  if (phase === "hidden") return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#04161f]/90 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0a2230] p-4 shadow-2xl">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">
              {phase === "done" ? "✨ Your wetsuit is ready!" : "Stitching your wetsuit…"}
            </h2>
            <p className="text-xs text-[#7fa3b0]">
              {phase === "done" ? "Diving back in…" : "Play while you wait · tap or press space to swim up"}
            </p>
          </div>
          {phase === "playing" && (
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
        </div>

        <RunnerCanvas running={phase === "playing"} />
      </div>
    </div>
  );
}

function RunnerCanvas({ running }: { running: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);

  // All fast-changing game state lives in a ref so the rAF loop never causes
  // React re-renders (we only surface score / game-over to the UI).
  const game = useRef({
    diverY: GROUND_Y, // baseline of the diver (its feet)
    vel: 0,
    grounded: true,
    speed: START_SPEED,
    obstacles: [] as Obstacle[],
    spawnIn: 0.8,
    score: 0,
    over: false,
    elapsed: 0,
  });

  function reset() {
    const g = game.current;
    g.diverY = GROUND_Y;
    g.vel = 0;
    g.grounded = true;
    g.speed = START_SPEED;
    g.obstacles = [];
    g.spawnIn = 0.8;
    g.score = 0;
    g.over = false;
    g.elapsed = 0;
    setScore(0);
    setOver(false);
  }

  function jump() {
    const g = game.current;
    if (g.over) {
      reset();
      return;
    }
    if (g.grounded) {
      g.vel = JUMP_V;
      g.grounded = false;
    }
  }

  // Input: tap the canvas or press space / up arrow.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset whenever the game (re)starts running.
  useEffect(() => {
    if (running) reset();
  }, [running]);

  // Main loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const g = game.current;

      if (running && !g.over) {
        g.elapsed += dt;
        g.speed = Math.min(MAX_SPEED, START_SPEED + g.elapsed * SPEED_RAMP);

        // diver physics
        g.vel += GRAVITY * dt;
        g.diverY += g.vel * dt;
        if (g.diverY >= GROUND_Y) {
          g.diverY = GROUND_Y;
          g.vel = 0;
          g.grounded = true;
        }

        // spawn obstacles
        g.spawnIn -= dt;
        if (g.spawnIn <= 0) {
          g.obstacles.push({
            x: W + 30,
            emoji: OBSTACLES[(Math.random() * OBSTACLES.length) | 0],
            size: 30 + Math.random() * 8,
          });
          const gap = 0.95 + Math.random() * 0.7; // seconds-ish between spawns
          g.spawnIn = gap * (START_SPEED / g.speed);
        }

        // move + cull obstacles, advance score
        for (const o of g.obstacles) o.x -= g.speed * dt;
        g.obstacles = g.obstacles.filter((o) => o.x > -40);
        g.score += dt * 10;
        setScore(Math.floor(g.score));

        // collision (shrunk hitboxes so it feels fair)
        const dX = 70;
        const dR = 16;
        const dCY = g.diverY - 16;
        for (const o of g.obstacles) {
          const oR = o.size * 0.32;
          const oCY = GROUND_Y - o.size * 0.4;
          const dx = dX - o.x;
          const dy = dCY - oCY;
          if (Math.hypot(dx, dy) < dR + oR) {
            g.over = true;
            setOver(true);
            setBest((b) => Math.max(b, Math.floor(g.score)));
            break;
          }
        }
      }

      // ── render ──
      ctx.clearRect(0, 0, W, H);

      // water gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#0d3346");
      grad.addColorStop(1, "#08222f");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // seabed
      ctx.fillStyle = "#123141";
      ctx.fillRect(0, GROUND_Y + 14, W, H - GROUND_Y - 14);
      ctx.strokeStyle = "rgba(160,210,225,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y + 14);
      ctx.lineTo(W, GROUND_Y + 14);
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";

      // obstacles
      for (const o of g.obstacles) {
        ctx.font = `${o.size}px serif`;
        ctx.fillText(o.emoji, o.x, GROUND_Y + 12);
      }

      // diver (a touch of squash on landing-ready feel via fixed size)
      ctx.font = "40px serif";
      ctx.fillText("🤿", 70, game.current.diverY + 6);

      // score
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.fillStyle = "rgba(207,234,242,0.85)";
      ctx.textAlign = "right";
      ctx.fillText(`${Math.floor(game.current.score)}`, W - 14, 26);

      // game over overlay
      if (g.over) {
        ctx.fillStyle = "rgba(4,18,26,0.55)";
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px system-ui, sans-serif";
        ctx.fillText("Caught! 🫧", W / 2, H / 2 - 6);
        ctx.font = "14px system-ui, sans-serif";
        ctx.fillStyle = "rgba(207,234,242,0.85)";
        ctx.fillText("tap to try again", W / 2, H / 2 + 20);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  return (
    <div className="select-none">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onPointerDown={(e) => {
          e.preventDefault();
          jump();
        }}
        className="w-full cursor-pointer rounded-xl"
        style={{ height: "auto", touchAction: "none" }}
      />
      <div className="mt-1 flex items-center justify-between px-1 text-xs text-[#7fa3b0]">
        <span>{over ? "Caught! Tap to retry" : "Score " + score}</span>
        <span>Best {best}</span>
      </div>
    </div>
  );
}
