"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { RuleType, SimulationState } from "@/lib/ca/types";

type Palette = {
  dead: [number, number, number];
  alive: [number, number, number];
  refractory: [number, number, number];
  gridline: [number, number, number];
  ant: [number, number, number];
  background: [number, number, number];
};

function defaultPalette(): Palette {
  return {
    background: [250, 250, 250],
    dead: [250, 250, 250],
    alive: [17, 24, 39], // zinc-900
    refractory: [245, 158, 11], // amber-500
    gridline: [228, 228, 231], // zinc-200
    ant: [239, 68, 68], // red-500
  };
}

function getCellRGB(rule: RuleType, v: number, p: Palette): [number, number, number] {
  if (rule === "life") return (v & 1) === 1 ? p.alive : p.dead;
  if (rule === "brians_brain") {
    if (v === 1) return p.alive;
    if (v === 2) return p.refractory;
    return p.dead;
  }
  // langtons_ant: v is 0/1 color (white/black)
  return (v & 1) === 1 ? p.alive : p.dead;
}

export function CanvasView(props: {
  sim: SimulationState;
  cellSize: number;
  showGridlines: boolean;
  isPlaying: boolean;
  symmetry: boolean;
  renderSignal: number;
  onPaintCell: (x: number, y: number, value: number) => void;
}) {
  const { sim, cellSize, showGridlines, isPlaying, symmetry, renderSignal, onPaintCell } = props;
  const palette = useMemo(() => defaultPalette(), []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);

  // Pointer painting state
  const isDownRef = useRef(false);
  const paintValueRef = useRef<number>(1);
  const lastCellRef = useRef<{ x: number; y: number } | null>(null);

  const w = sim.config.width;
  const h = sim.config.height;
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.width = `${w * cellSize}px`;
    canvas.style.height = `${h * cellSize}px`;
    canvas.width = Math.max(1, Math.floor(w * cellSize * dpr));
    canvas.height = Math.max(1, Math.floor(h * cellSize * dpr));
  }, [w, h, cellSize, dpr]);

  const ensureOffscreen = useCallback(() => {
    if (!offscreenRef.current) offscreenRef.current = document.createElement("canvas");
    const off = offscreenRef.current;
    if (off.width !== w || off.height !== h) {
      off.width = w;
      off.height = h;
      imageDataRef.current = new ImageData(w, h);
    } else if (!imageDataRef.current || imageDataRef.current.width !== w || imageDataRef.current.height !== h) {
      imageDataRef.current = new ImageData(w, h);
    }
    return off;
  }, [w, h]);

  const renderOnce = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const off = ensureOffscreen();
    const offCtx = off.getContext("2d");
    if (!offCtx) return;

    const img = imageDataRef.current;
    if (!img) return;

    // Fill pixels from grid (each cell is 1 pixel in offscreen).
    const data = img.data;
    const grid = sim.currentGrid;
    const rule = sim.config.rule;
    for (let i = 0; i < grid.length; i++) {
      const [r, g, b] = getCellRGB(rule, grid[i], palette);
      const di = i * 4;
      data[di + 0] = r;
      data[di + 1] = g;
      data[di + 2] = b;
      data[di + 3] = 255;
    }

    // Ant overlay (draw ant as a red pixel on the offscreen, then it scales cleanly).
    if (rule === "langtons_ant" && sim.ant) {
      const i = sim.ant.y * w + sim.ant.x;
      const di = i * 4;
      data[di + 0] = palette.ant[0];
      data[di + 1] = palette.ant[1];
      data[di + 2] = palette.ant[2];
      data[di + 3] = 255;
    }

    offCtx.putImageData(img, 0, 0);

    // Draw scaled.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(off, 0, 0, w * cellSize * dpr, h * cellSize * dpr);

    if (showGridlines && cellSize >= 6) {
      ctx.strokeStyle = `rgba(${palette.gridline[0]}, ${palette.gridline[1]}, ${palette.gridline[2]}, 0.9)`;
      ctx.lineWidth = 1;
      // Vertical lines
      for (let x = 0; x <= w; x++) {
        const px = Math.floor(x * cellSize * dpr) + 0.5;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, h * cellSize * dpr);
        ctx.stroke();
      }
      // Horizontal lines
      for (let y = 0; y <= h; y++) {
        const py = Math.floor(y * cellSize * dpr) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(w * cellSize * dpr, py);
        ctx.stroke();
      }
    }
  }, [cellSize, dpr, ensureOffscreen, h, palette, showGridlines, sim, w]);

  // Render on key config/visibility changes and on explicit render signals (single-step, preset, etc).
  useEffect(() => {
    renderOnce();
  }, [renderOnce, sim.config.rule, renderSignal]);

  // While playing, render continuously on the animation frame so motion is smooth.
  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    const loop = () => {
      renderOnce();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, renderOnce, sim.config.rule, palette]);

  function clientToCell(e: PointerEvent | React.PointerEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const rx = (("clientX" in e ? e.clientX : 0) - rect.left) / rect.width;
    const ry = (("clientY" in e ? e.clientY : 0) - rect.top) / rect.height;
    const x = Math.floor(rx * w);
    const y = Math.floor(ry * h);
    if (x < 0 || x >= w || y < 0 || y >= h) return null;
    return { x, y };
  }

  function paintAt(x: number, y: number, value: number) {
    onPaintCell(x, y, value);
    if (symmetry) {
      const mx = w - 1 - x;
      const my = h - 1 - y;
      onPaintCell(mx, y, value);
      onPaintCell(x, my, value);
      onPaintCell(mx, my, value);
    }
  }

  function beginPaint(e: React.PointerEvent) {
    if (isPlaying) return;
    const cell = clientToCell(e);
    if (!cell) return;
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    isDownRef.current = true;
    lastCellRef.current = cell;

    const i = cell.y * w + cell.x;
    const cur = sim.currentGrid[i];
    const active = sim.config.rule === "brians_brain" ? cur === 1 : (cur & 1) === 1;
    paintValueRef.current = active ? 0 : 1;

    paintAt(cell.x, cell.y, paintValueRef.current);
    renderOnce();
  }

  function movePaint(e: React.PointerEvent) {
    if (!isDownRef.current || isPlaying) return;
    const cell = clientToCell(e);
    if (!cell) return;
    const last = lastCellRef.current;
    if (last && last.x === cell.x && last.y === cell.y) return;
    lastCellRef.current = cell;
    paintAt(cell.x, cell.y, paintValueRef.current);
    renderOnce();
  }

  function endPaint() {
    isDownRef.current = false;
    lastCellRef.current = null;
  }

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        className={[
          "block max-w-full rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950",
          isPlaying ? "cursor-not-allowed opacity-95" : "cursor-crosshair",
        ].join(" ")}
        onPointerDown={beginPaint}
        onPointerMove={movePaint}
        onPointerUp={endPaint}
        onPointerCancel={endPaint}
        aria-label="Cellular automata canvas"
        role="img"
      />
      {!isPlaying ? (
        <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-white/80 px-2 py-1 text-xs text-zinc-700 shadow-sm backdrop-blur dark:bg-zinc-950/70 dark:text-zinc-200">
          Drag to draw • drawing is disabled while playing
        </div>
      ) : null}
    </div>
  );
}

