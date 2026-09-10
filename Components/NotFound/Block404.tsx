"use client";

/* ------------------------------------------------------------------
 * FitCheck 404 — "The Look That Fell Apart"
 *
 * The word "404" stands like a chunky 3D sculpture built from blocks
 * (a smiley nod hidden inside the "0"). Sweep your cursor through it
 * and blocks get knocked loose — they tumble with real gravity,
 * bounce off the floor, spin and scuff each other. When the pointer
 * leaves, the pieces fly back and re-stack one after another with a
 * stagger and a soft shimmer, ready to be wrecked again.
 *
 * Rendering: single requestAnimationFrame + Canvas2D (DPR-aware),
 * pseudo-3D extruded cuboids with 3-face shading, rigid-body-ish
 * physics (gravity / restitution / angular velocity), impact sparks,
 * screen shake and a subtle mouse parallax. No React re-renders per
 * frame. Respects reduced-motion.
 * ------------------------------------------------------------------ */

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";

/* ---------------- Digit bitmaps (7 wide x 10 tall) ---------------- */

const DIGIT_4 = [
  "..#####",
  ".....#.",
  ".....#.",
  ".....#.",
  ".....#.",
  "..#####",
  ".....#.",
  ".....#.",
  ".....#.",
  ".....#.",
];

const DIGIT_0 = [
  "..#####",
  ".#....#",
  ".#....#",
  ".#....#",
  ".#....#",
  ".#....#",
  ".#....#",
  ".#....#",
  ".#....#",
  "..#####",
];

const DIM_COLS = 7;
const DIM_ROWS = 10;
const DIGIT_SPACER = 2;

/* ---------------- Physics / render config ---------------- */

const GRAVITY = 0.07; // per frame at 60fps
const RESTITUTION = 0.5;
const FRICTION = 0.93;
const ANG_DAMP = 0.96;
const MAX_SPEED = 9;
const IMPACT_SPARK = 0.5; // |vy| threshold that spawns sparks
const RETURN_K = 0.16;
const RETURN_DAMP = 0.84;
const STAGGER = 0.008; // reassemble stagger per block (seconds)

/* ---------------- Types ---------------- */

type Mode = "still" | "free" | "return";

interface Block {
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  s: number;
  primary: boolean;
  mode: Mode;
  retDelay: number;
  swayPhase: number;
  swaySpeed: number;
  shadeSeed: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hot: boolean;
}

/* ---------------- Layout ---------------- */

function buildLayout(subdivision: 1 | 2): {
  cells: { x: number; y: number; primary: boolean }[];
  cols: number;
  rows: number;
} {
  const cells: { x: number; y: number; primary: boolean }[] = [];
  let cursorX = 0;

  const pushDigit = (digit: string) => {
    const map = digit === "4" ? DIGIT_4 : DIGIT_0;
    if (subdivision === 1) {
      map.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) {
          if (row[c] === "#") cells.push({ x: cursorX + c, y: r, primary: true });
        }
      });
    } else {
      map.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) {
          if (row[c] === "#") {
            cells.push({ x: (cursorX + c) * 2, y: r * 2, primary: true });
            cells.push({ x: (cursorX + c) * 2 + 1, y: r * 2, primary: true });
            cells.push({ x: (cursorX + c) * 2, y: r * 2 + 1, primary: true });
            cells.push({ x: (cursorX + c) * 2 + 1, y: r * 2 + 1, primary: true });
          }
        }
      });
    }
    cursorX += DIM_COLS + DIGIT_SPACER;
  };

  pushDigit("4");
  pushDigit("0");
  pushDigit("4");

  // Smiley inside the "0" hole (dark blocks)
  const scale = subdivision === 1 ? 1 : 2;
  const hl = (1 + DIGIT_SPACER) * scale;
  const ht = scale;
  const hw = 5 * scale;
  const hh = 8 * scale;
  const eyeC1 = hl + Math.round(hw * 0.28);
  const eyeC2 = hl + Math.round(hw * 0.72);
  const eyeR = ht + Math.round(hh * 0.32);
  const smileR = ht + Math.round(hh * 0.6);
  const smileC = hl + Math.round(hw * 0.5);
  cells.push({ x: eyeC1, y: eyeR, primary: false });
  cells.push({ x: eyeC2, y: eyeR, primary: false });
  cells.push({ x: smileC - 1, y: smileR, primary: false });
  cells.push({ x: smileC, y: smileR, primary: false });
  cells.push({ x: smileC + 1, y: smileR, primary: false });

  const cols = subdivision === 1 ? 7 * 3 + DIGIT_SPACER * 2 : 14 * 3 + DIGIT_SPACER * 2 * 2;
  const rows = subdivision === 1 ? DIM_ROWS : DIM_ROWS * 2;
  return { cells, cols, rows };
}

/* ---------------- Component ---------------- */

interface Props {
  eyebrow?: string;
  title?: string;
  description?: string;
}

export default function Block404({
  eyebrow = "STYLE STATUS · 404",
  title = "This look didn't make the cut.",
  description = "The page you're looking for has been moved — or never made it to the runway. Your next outfit is still one tap away.",
}: Props) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [interacted, setInteracted] = useState(false);
  const [reduced, setReduced] = useState(false);

  useLayoutEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const update = () => setSize({ w: scene.clientWidth, h: scene.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(scene);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setReduced(
      typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  /* ---------------- Animation ---------------- */

  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    if (!canvas || !scene || !size.w || !size.h) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx = context;

    const subdivision: 1 | 2 = size.w >= 760 ? 2 : 1;
    const { cells, cols } = buildLayout(subdivision);
    const gap = Math.max(2, Math.min(5, Math.floor(size.w * 0.004)));
    const s = Math.max(7, Math.floor((size.w - gap * (cols - 1)) / cols));
    const totalW = cols * s + (cols - 1) * gap;
    const rows = subdivision === 1 ? DIM_ROWS : DIM_ROWS * 2;
    const totalH = rows * s + (rows - 1) * gap;
    const offsetX = (size.w - totalW) / 2;
    const glyphCY = size.h * 0.4;
    const offsetY = glyphCY - totalH / 2;

    const blocks: Block[] = cells.map((c) => {
      const hx = offsetX + c.x * (s + gap);
      const hy = offsetY + c.y * (s + gap);
      return {
        hx,
        hy,
        x: hx,
        y: hy,
        vx: 0,
        vy: 0,
        rot: 0,
        vrot: 0,
        s,
        primary: c.primary,
        mode: "still",
        retDelay: 0,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.9 + Math.random() * 1.6,
        shadeSeed: Math.random(),
      };
    });

    const sparks: Spark[] = [];

    const ptr = { x: size.w / 2, y: -9999, active: false, down: 0 };
    const FLOOR_Y = size.h * 0.84;
    const K = 7.5; // repulsion reach (block-size multiples)
    let t = 0;
    let raf = 0;
    let sleeping = false;
    let idleFrames = 0;
    let shakeX = 0;
    let shakeY = 0;
    const camX = 0;

    // Reduced motion: draw once, static sculpture, no listeners
    if (reduced) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#0b0b0d";
      ctx.fillRect(0, 0, size.w, size.h);
      const fg = ctx.createLinearGradient(0, FLOOR_Y, 0, size.h);
      fg.addColorStop(0, "rgba(255,107,53,0.10)");
      fg.addColorStop(1, "rgba(255,107,53,0.02)");
      ctx.fillStyle = fg;
      ctx.fillRect(0, FLOOR_Y, size.w, size.h - FLOOR_Y);
      ctx.fillStyle = "rgba(255,107,53,0.22)";
      ctx.font = "600 10px system-ui, sans-serif";
      ctx.fillText("FITCHECK RUNWAY — 404 LOOKBOOK", 18, FLOOR_Y - 8);
      const order = blocks.map((_, i) => i).sort((a, b) => blocks[b].hy - blocks[a].hy);
      for (const i of order) {
        const b = blocks[i];
        drawCuboid(b.x + b.s / 2, b.y + b.s / 2, b.s, 0, b.primary, b.shadeSeed);
      }
      return;
    }

    const onMove = (e: PointerEvent) => {
      const rect = scene.getBoundingClientRect();
      ptr.x = e.clientX - rect.left;
      ptr.y = e.clientY - rect.top;
      ptr.active = e.clientY >= rect.top && e.clientY <= rect.bottom;
      wake();
    };
    const onDown = (e: PointerEvent) => {
      const rect = scene.getBoundingClientRect();
      ptr.x = e.clientX - rect.left;
      ptr.y = e.clientY - rect.top;
      ptr.down = 1;
      ptr.active = true;
      wake();
    };
    const deactivate = () => {
      ptr.active = false;
      ptr.down = 0;
      wake();
    };

    scene.addEventListener("pointermove", onMove, { passive: true });
    scene.addEventListener("pointerdown", onDown, { passive: true });
    scene.addEventListener("pointerleave", deactivate);
    scene.addEventListener("pointerup", deactivate);
    scene.addEventListener("pointercancel", deactivate);
    window.addEventListener("blur", deactivate);

    /* Painter's order: top rows first, then left→right */
    const renderOrder: number[] = blocks.map((_, i) => i);

    function drawCuboid(
      cx: number,
      ccy: number,
      bs: number,
      rot: number,
      primary: boolean,
      shade: number
    ) {
      const ex = bs * 0.42;
      const h = bs / 2;
      const A = hexToRgb(primary ? "#FF6B35" : "#1F1F1F");
      const B = primary ? [31, 31, 31] : [0, 0, 0];
      const front: [number, number, number] = [
        A[0] + (B[0] - A[0]) * shade,
        A[1] + (B[1] - A[1]) * shade,
        A[2] + (B[2] - A[2]) * shade,
      ];
      const side = scale(front, 0.55);
      const top = lift(front, 0.45);

      ctx.save();
      ctx.translate(cx, ccy);
      ctx.rotate(rot);
      ctx.shadowBlur = 0;

      ctx.fillStyle = rgbToCss(front[0], front[1], front[2]);
      ctx.fillRect(-h, -h, bs, bs);

      ctx.fillStyle = rgbToCss(side[0], side[1], side[2]);
      ctx.beginPath();
      ctx.moveTo(h, -h);
      ctx.lineTo(h + ex, -h - ex);
      ctx.lineTo(h + ex, h - ex);
      ctx.lineTo(h, h);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = rgbToCss(top[0], top[1], top[2]);
      ctx.beginPath();
      ctx.moveTo(-h, -h);
      ctx.lineTo(h, -h);
      ctx.lineTo(h + ex, -h - ex);
      ctx.lineTo(-h + ex, -h - ex);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const frame = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#0b0b0d";
      ctx.fillRect(0, 0, size.w, size.h);

      // Parallax + shake
      ctx.save();
      ctx.translate(camX + shakeX, shakeY);

      // Floor
      const fg = ctx.createLinearGradient(0, FLOOR_Y, 0, size.h);
      fg.addColorStop(0, "rgba(255,107,53,0.10)");
      fg.addColorStop(1, "rgba(255,107,53,0.02)");
      ctx.fillStyle = fg;
      ctx.fillRect(-20, FLOOR_Y, size.w + 40, size.h - FLOOR_Y);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(-20, FLOOR_Y, size.w + 40, 1);
      ctx.fillStyle = "rgba(255,107,53,0.22)";
      ctx.font = `600 10px system-ui, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("FITCHECK RUNWAY — 404 LOOKBOOK", 18, FLOOR_Y - 8);

      if (!reduced) {
        physicsAndDraw();
        renderSparks();
      }
      ctx.restore();

      shakeX *= 0.88;
      shakeY *= 0.88;
      t += 1 / 60;
      ptr.down *= 0.88;

      // Sleep when nothing is happening
      if (!ptr.active) {
        const anyLive = blocks.some((b) => b.mode !== "still");
        if (anyLive) idleFrames = 0;
        else idleFrames++;
        if (idleFrames > 120) {
          sleeping = true;
          cancelAnimationFrame(raf);
          return;
        }
      } else {
        idleFrames = 0;
      }
      raf = requestAnimationFrame(frame);
    };

    function physicsAndDraw() {
      const cxc = size.w / 2;

      // Reassemble wave: loose blocks fly home farthest-first, staggered
      if (!ptr.active) {
        const loose = blocks.filter((b) => b.mode === "free");
        if (loose.length) {
          loose.sort((a, z) => {
            const da = (a.x - cxc) ** 2 + (a.y - FLOOR_Y) ** 2;
            const dz = (z.x - cxc) ** 2 + (z.y - FLOOR_Y) ** 2;
            return dz - da;
          });
          loose.forEach((b, idx) => {
            b.mode = "return";
            b.retDelay = idx * STAGGER;
          });
        }
      }

      renderOrder.sort((a, b) => gridsOf(blocks[b]) - gridsOf(blocks[a]));

      for (let i = 0; i < blocks.length; i++) {
        const bb = blocks[renderOrder[i]];
        const cx0 = bb.x + bb.s / 2;
        const cy0 = bb.y + bb.s / 2;
        const R = bb.s * K;

        if (ptr.active && ptr.y > size.h * 0.05) {
          const dx = cx0 - ptr.x;
          const dy = cy0 - ptr.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) + 1e-4;
            const fall = 1 - d / R;
            const st = fall * 1.6 * (ptr.down ? 3 : 1);
            bb.vx += ((dx / d) * st + (-dy / d) * 0.28 * fall) * 60 * 0.016;
            bb.vy += ((dy / d) * st - 0.35 * fall) * 60 * 0.016;
            bb.vrot += ((dx / d) * fall * 0.05 + (bb.shadeSeed - 0.5) * 0.008) * 60 * 0.016;
            if (bb.mode !== "free") {
              bb.mode = "free";
              bb.vx += (Math.random() - 0.5) * 0.3;
              bb.vy -= Math.random() * 0.4;
            }
          }
        }

        if (bb.mode === "return" && bb.retDelay > 0) {
          bb.retDelay -= 1 / 60;
        }

        if (bb.mode === "free" || (bb.mode === "return" && bb.retDelay > 0)) {
          // Gravity free-fall
          bb.vy += GRAVITY * 60 * 0.016;
        } else if (bb.mode === "return") {
          // Spring back to home
          const sx = bb.hx + bb.s / 2 - (bb.x + bb.s / 2);
          const sy = bb.hy + bb.s / 2 - (bb.y + bb.s / 2);
          bb.vx += sx * RETURN_K * 0.12;
          bb.vy += sy * RETURN_K * 0.12;
          bb.x += bb.vx;
          bb.y += bb.vy;
          bb.vx *= RETURN_DAMP;
          bb.vy *= RETURN_DAMP;
          bb.vrot *= 0.9;
          bb.rot += bb.vrot;
          const dxr = sb(bb, "x");
          const dyr = sb(bb, "y");
          if (Math.abs(dxr) < 0.3 && Math.abs(dyr) < 0.3 && Math.abs(bb.vx) < 0.02 && Math.abs(bb.vy) < 0.02) {
            bb.x = bb.hx;
            bb.y = bb.hy;
            bb.rot = 0;
            bb.vx = 0;
            bb.vy = 0;
            bb.vrot = 0;
            bb.mode = "still";
            spawnReturnFlash(bb.x + bb.s / 2, bb.y + bb.s / 2);
          }
          drawCuboid(bb.x + bb.s / 2, bb.y + bb.s / 2, bb.s, bb.rot, bb.primary, bb.shadeSeed);
          continue;
        }

        // Integrate free mode
        bb.x += bb.vx;
        bb.y += bb.vy;
        bb.rot += bb.vrot;
        bb.vx *= FRICTION;
        bb.vy *= FRICTION;
        bb.vrot *= ANG_DAMP;

        const sp2 = bb.vx * bb.vx + bb.vy * bb.vy;
        if (sp2 > MAX_SPEED * MAX_SPEED) {
          const sc = MAX_SPEED / Math.sqrt(sp2);
          bb.vx *= sc;
          bb.vy *= sc;
        }

        // Ground collision
        const bottom = bb.y + bb.s;
        if (bottom > FLOOR_Y + 2) {
          bb.y = FLOOR_Y - bb.s + 2;
          if (bb.vy > IMPACT_SPARK) {
            spawnImpact(bb.x + bb.s / 2, FLOOR_Y);
            const k = Math.min(0.6, bb.vy * 0.9);
            shakeX += (Math.random() - 0.5) * k;
            shakeY -= Math.random() * k * 0.4;
          }
          bb.vy = -bb.vy * RESTITUTION;
          bb.vrot *= 0.7;
          bb.vx *= 0.86;
          if (Math.abs(bb.vy) < 0.05) bb.vy = 0;
        }

        const sway =
          bb.mode === "still" && !reduced
            ? Math.sin(t * bb.swaySpeed + bb.swayPhase) * 1.4
            : 0;

        drawCuboid(bb.x + bb.s / 2, bb.y + bb.s / 2, bb.s, bb.rot + sway, bb.primary, bb.shadeSeed);
      }
    }

    function renderSparks() {
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vy += 0.02;
        sp.vx *= 0.96;
        sp.life -= 0.03;
        if (sp.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.fillStyle = sp.hot
          ? `rgba(255,140,88,${sp.life.toFixed(3)})`
          : `rgba(255,255,255,${(sp.life * 0.7).toFixed(3)})`;
        const r = 1.2 + sp.life * 2;
        ctx.fillRect(sp.x - r / 2, sp.y - r / 2, r, r);
      }
    }

    function spawnImpact(x: number, y: number) {
      for (let i = 0; i < 6; i++) {
        sparks.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 1.6,
          vy: -Math.random() * 1.6 - 0.3,
          life: 0.7 + Math.random() * 0.5,
          hot: Math.random() < 0.6,
        });
      }
    }

    function spawnReturnFlash(x: number, y: number) {
      for (let i = 0; i < 4; i++) {
        sparks.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 0.7,
          vy: -Math.random() * 0.9,
          life: 0.5 + Math.random() * 0.4,
          hot: Math.random() < 0.8,
        });
      }
    }

    function gridsOf(b: Block): number {
      return b.hy; // painter by home row
    }

    function sb(bb: Block, axis: "x" | "y"): number {
      const c = bb.s / 2;
      return axis === "x" ? bb.x + c - (bb.hx + c) : bb.y + c - (bb.hy + c);
    }

    const wake = () => {
      if (!sleeping) return;
      sleeping = false;
      idleFrames = 0;
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      scene.removeEventListener("pointermove", onMove);
      scene.removeEventListener("pointerdown", onDown);
      scene.removeEventListener("pointerleave", deactivate);
      scene.removeEventListener("pointerup", deactivate);
      scene.removeEventListener("pointercancel", deactivate);
      window.removeEventListener("blur", deactivate);
    };
  }, [size.w, size.h, reduced]);

  /* Fade hint once engaged */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const onOver = () => setInteracted(true);
    scene.addEventListener("pointerdown", onOver);
    scene.addEventListener("pointermove", onOver);
    return () => {
      scene.removeEventListener("pointerdown", onOver);
      scene.removeEventListener("pointermove", onOver);
    };
  }, []);

  /* ---------------- Render ---------------- */

  return (
    <section
      ref={sceneRef}
      className="relative overflow-hidden bg-[#0b0b0d] select-none"
      aria-label="Interactive 404 experience"
      style={{ height: "min(56vh, 520px)", minHeight: 380 }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ touchAction: "none" }}
        aria-hidden="true"
      />

      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 40%, transparent 42%, rgba(0,0,0,0.5) 100%)",
        }}
        aria-hidden="true"
      />

      {/* Center hint chip */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
        <div
          className={`flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-medium uppercase tracking-[0.25em] text-white/40 backdrop-blur transition-opacity duration-700 ${
            interacted ? "opacity-0" : "opacity-100"
          }`}
          aria-hidden="true"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B35]" />
          Sweep the look apart — it rebuilds
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 py-10 text-center">
        <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.4em] text-white/50">
          {eyebrow}
        </p>

        <h1 className="sr-only">404 — Page Not Found</h1>
        <span className="sr-only">4 0 4</span>

        <h2 className="mt-4 max-w-md text-xl font-bold leading-snug text-white md:text-2xl">
          {title}
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-white/45">
          {description}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/shop"
            className="group inline-flex items-center gap-2 rounded-xl bg-[#FF6B35] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#FF6B35]/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e05a2b] hover:shadow-xl hover:shadow-[#FF6B35]/30 active:translate-y-0 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B35]"
          >
            Continue Shopping
            <svg
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-7 py-3.5 text-sm font-semibold text-white/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#FF6B35] hover:text-[#FF6B35] active:translate-y-0 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B35]"
          >
            Go Home
          </Link>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
          {[
            { label: "Men", href: "/men" },
            { label: "Women", href: "/women" },
            { label: "Kids", href: "/kids" },
            { label: "New Arrivals", href: "/new-arrivals" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-white/12 px-4 py-1.5 text-xs font-medium text-white/45 transition-all duration-200 hover:border-[#FF6B35] hover:text-[#FF6B35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B35]"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Color helpers ---------------- */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToCss(r: number, g: number, b: number): string {
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

function scale(c: [number, number, number], f: number): [number, number, number] {
  return [c[0] * f, c[1] * f, c[2] * f];
}

function lift(c: [number, number, number], v: number): [number, number, number] {
  return [
    c[0] + (255 - c[0]) * v,
    c[1] + (255 - c[1]) * v,
    c[2] + (255 - c[2]) * v,
  ];
}