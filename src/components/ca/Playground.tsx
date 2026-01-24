"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EdgeMode, RuleType, SimulationConfig, SimulationState } from "@/lib/ca/types";
import { createSimulation, normalizeRule, randomize, applyPresetToSimulation, step, clear, resetSimulation } from "@/lib/ca/engine";
import { presetListForRule, type PresetId } from "@/lib/ca/presets";
import { clampU32, randomSeedU32 } from "@/lib/ca/rng";
import { setCell } from "@/lib/ca/utils";
import { CanvasView } from "./CanvasView";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

type UrlState = {
  rule: RuleType;
  seed: number;
  w: number;
  h: number;
  sps: number;
  edge: EdgeMode;
  cell: number;
  grid: boolean;
  sym: boolean;
  preset?: PresetId;
};

function parseUrlState(): Partial<UrlState> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const rule = normalizeRule(p.get("rule"));
  const seedRaw = p.get("seed");
  const wRaw = p.get("w");
  const hRaw = p.get("h");
  const spsRaw = p.get("sps");
  const edgeRaw = p.get("edge");
  const cellRaw = p.get("cell");
  const gridRaw = p.get("grid");
  const symRaw = p.get("sym");
  const presetRaw = p.get("preset") as PresetId | null;

  const next: Partial<UrlState> = {};
  next.rule = rule;
  if (seedRaw != null) next.seed = clampU32(Number(seedRaw));
  if (wRaw != null) next.w = Math.max(16, Math.min(512, Math.floor(Number(wRaw) || 0)));
  if (hRaw != null) next.h = Math.max(16, Math.min(512, Math.floor(Number(hRaw) || 0)));
  if (spsRaw != null) next.sps = Math.max(1, Math.min(240, Math.floor(Number(spsRaw) || 0)));
  if (edgeRaw === "wrap" || edgeRaw === "bounded") next.edge = edgeRaw;
  if (cellRaw != null) next.cell = Math.max(2, Math.min(20, Math.floor(Number(cellRaw) || 0)));
  if (gridRaw != null) next.grid = gridRaw === "1";
  if (symRaw != null) next.sym = symRaw === "1";
  if (presetRaw) next.preset = presetRaw;
  return next;
}

function encodeUrlState(s: UrlState) {
  const p = new URLSearchParams();
  p.set("rule", s.rule);
  p.set("seed", String(clampU32(s.seed)));
  p.set("w", String(s.w));
  p.set("h", String(s.h));
  p.set("sps", String(s.sps));
  p.set("edge", s.edge);
  p.set("cell", String(s.cell));
  if (s.grid) p.set("grid", "1");
  if (s.sym) p.set("sym", "1");
  if (s.preset) p.set("preset", s.preset);
  return p.toString();
}

function defaultStateForRule(rule: RuleType): { preset: PresetId; init: "preset" | "random" } {
  if (rule === "life") return { preset: "life_glider", init: "preset" };
  if (rule === "brians_brain") return { preset: "brians_random", init: "preset" };
  return { preset: "ant_single", init: "preset" };
}

function makeCfg(rule: RuleType, params: { w: number; h: number; edge: EdgeMode; seed: number }): SimulationConfig {
  return {
    rule,
    width: params.w,
    height: params.h,
    edgeMode: params.edge,
    seed: clampU32(params.seed),
  };
}

export function Playground() {
  const initialUrl = useMemo(() => parseUrlState(), []);

  const [rule, setRule] = useState<RuleType>(initialUrl.rule ?? "life");
  const [edgeMode, setEdgeMode] = useState<EdgeMode>(initialUrl.edge ?? "wrap");
  const [width, setWidth] = useState<number>(initialUrl.w ?? 128);
  const [height, setHeight] = useState<number>(initialUrl.h ?? 128);
  const [seed, setSeed] = useState<number>(initialUrl.seed ?? randomSeedU32());
  const [stepsPerSec, setStepsPerSec] = useState<number>(initialUrl.sps ?? 30);
  const [cellSize, setCellSize] = useState<number>(initialUrl.cell ?? 6);
  const [showGridlines, setShowGridlines] = useState<boolean>(initialUrl.grid ?? false);
  const [symmetry, setSymmetry] = useState<boolean>(initialUrl.sym ?? false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [renderSignal, setRenderSignal] = useState(0);

  const defaultForRule = defaultStateForRule(rule);
  const [preset, setPreset] = useState<PresetId>(initialUrl.preset ?? defaultForRule.preset);
  const presetRef = useRef<PresetId>(preset);

  const [sim] = useState<SimulationState>(() => {
    const cfg = makeCfg(rule, { w: width, h: height, edge: edgeMode, seed });
    const s = createSimulation(cfg);
    applyPresetToSimulation(s, preset);
    return s;
  });

  useEffect(() => {
    presetRef.current = preset;
  }, [preset]);

  function resetSim(next: {
    rule: RuleType;
    edgeMode: EdgeMode;
    width: number;
    height: number;
    seed: number;
    preset: PresetId;
  }) {
    const cfg = makeCfg(next.rule, { w: next.width, h: next.height, edge: next.edgeMode, seed: next.seed });
    resetSimulation(sim, cfg);
    applyPresetToSimulation(sim, next.preset);
    setIsPlaying(false);
    setRenderSignal((n) => n + 1);
  }

  // URL sync (debounced-ish by rAF).
  const pendingUrlRef = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pendingUrlRef.current) cancelAnimationFrame(pendingUrlRef.current);
    pendingUrlRef.current = requestAnimationFrame(() => {
      const qs = encodeUrlState({
        rule,
        seed,
        w: width,
        h: height,
        sps: stepsPerSec,
        edge: edgeMode,
        cell: cellSize,
        grid: showGridlines,
        sym: symmetry,
        preset,
      });
      const url = `${window.location.pathname}?${qs}`;
      window.history.replaceState(null, "", url);
    });
  }, [rule, seed, width, height, stepsPerSec, edgeMode, cellSize, showGridlines, symmetry, preset]);

  // Simulation loop
  const lastTRef = useRef<number | null>(null);
  const accRef = useRef(0);
  const stepsCounterRef = useRef({ t0: 0, steps: 0, sps: 0 });
  const fpsCounterRef = useRef({ t0: 0, frames: 0, fps: 0 });
  const [, forceUiTick] = useState(0);
  const uiTickRef = useRef({ t0: 0 });
  const [measuredSps, setMeasuredSps] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);

  useEffect(() => {
    let raf = 0;
    const tick = (t: number) => {
      const last = lastTRef.current ?? t;
      const dt = Math.min(250, t - last);
      lastTRef.current = t;

      // FPS (render loop cadence)
      const fc = fpsCounterRef.current;
      if (fc.t0 === 0) fc.t0 = t;
      fc.frames++;
      if (t - fc.t0 >= 1000) {
        fc.fps = (fc.frames * 1000) / (t - fc.t0);
        setFps(fc.fps);
        fc.t0 = t;
        fc.frames = 0;
      }

      if (isPlaying) {
        accRef.current += dt;
        const stepMs = 1000 / Math.max(1, stepsPerSec);
        let stepsThisFrame = 0;
        while (accRef.current >= stepMs && stepsThisFrame < 20) {
          step(sim);
          accRef.current -= stepMs;
          stepsThisFrame++;
        }

        const sc = stepsCounterRef.current;
        if (sc.t0 === 0) sc.t0 = t;
        sc.steps += stepsThisFrame;
        if (t - sc.t0 >= 1000) {
          sc.sps = (sc.steps * 1000) / (t - sc.t0);
          setMeasuredSps(sc.sps);
          sc.t0 = t;
          sc.steps = 0;
        }
      }

      // Trigger lightweight UI refresh for metrics (throttled).
      if (uiTickRef.current.t0 === 0) uiTickRef.current.t0 = t;
      if (t - uiTickRef.current.t0 >= 100) {
        forceUiTick((n) => (n + 1) % 1000000);
        uiTickRef.current.t0 = t;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, stepsPerSec, sim]);

  function onPaintCell(x: number, y: number, value: number) {
    const { width: w, height: h, edgeMode: edge } = sim.config;
    const v = sim.config.rule === "brians_brain" ? (value ? 1 : 0) : value ? 1 : 0;
    setCell(sim.currentGrid, x, y, w, h, edge, v);
    // Keep nextGrid in sync for perfect deterministic stepping after edits.
    setCell(sim.nextGrid, x, y, w, h, edge, v);
    setRenderSignal((n) => n + 1);
  }

  function doStepOnce() {
    step(sim);
    setRenderSignal((n) => n + 1);
  }

  function doReset() {
    const cfg = makeCfg(rule, { w: width, h: height, edge: edgeMode, seed });
    resetSimulation(sim, cfg);
    applyPresetToSimulation(sim, preset);
    setIsPlaying(false);
    setRenderSignal((n) => n + 1);
  }

  function doClear() {
    clear(sim);
    setIsPlaying(false);
    setRenderSignal((n) => n + 1);
  }

  function doRandomize() {
    randomize(sim);
    setIsPlaying(false);
    setRenderSignal((n) => n + 1);
  }

  async function copySeed() {
    try {
      await navigator.clipboard.writeText(String(clampU32(seed)));
    } catch {
      // ignore
    }
  }

  const presets = presetListForRule(rule);
  const densityPct = (sim.metrics.density * 100).toFixed(2);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-zinc-900 text-white grid place-items-center font-semibold dark:bg-zinc-100 dark:text-black">
              CA
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Cellular Automata Lab</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">Deterministic 2D rule exploration</div>
            </div>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/" className="rounded-md px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900">
              Playground
            </Link>
            <Link href="/about" className="rounded-md px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900">
              About
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[360px_1fr]">
        <aside className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Controls</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">{isPlaying ? "Running" : "Paused"}</div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button onClick={() => setIsPlaying((v) => !v)} aria-pressed={isPlaying}>
              {isPlaying ? "Pause" : "Play"}
            </Button>
            <Button onClick={doStepOnce} disabled={isPlaying}>
              Step
            </Button>
            <Button onClick={doReset}>Reset</Button>
            <Button onClick={doClear} disabled={isPlaying}>
              Clear
            </Button>
            <Button onClick={doRandomize} disabled={isPlaying}>
              Randomize
            </Button>
            <Button
              onClick={() => {
                const nextSeed = randomSeedU32();
                setSeed(nextSeed);
                resetSim({ rule, edgeMode, width, height, seed: nextSeed, preset });
              }}
              disabled={isPlaying}
            >
              New seed
            </Button>
          </div>

          <div className="mt-4 grid gap-3">
            <Field label="Rule set" htmlFor="rule">
              <select
                id="rule"
                className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                value={rule}
                onChange={(e) => {
                  const nextRule = e.target.value as RuleType;
                  const currentPreset = presetRef.current;
                  const nextPreset = presetListForRule(nextRule).some((p) => p.id === currentPreset)
                    ? currentPreset
                    : defaultStateForRule(nextRule).preset;
                  setRule(nextRule);
                  setPreset(nextPreset);
                  resetSim({ rule: nextRule, edgeMode, width, height, seed, preset: nextPreset });
                }}
                disabled={isPlaying}
              >
                <option value="life">Conway’s Game of Life</option>
                <option value="brians_brain">Brian’s Brain</option>
                <option value="langtons_ant">Langton’s Ant</option>
              </select>
            </Field>

            <Field label="Preset" htmlFor="preset">
              <select
                id="preset"
                className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                value={preset}
                onChange={(e) => {
                  const nextPreset = e.target.value as PresetId;
                  setPreset(nextPreset);
                  resetSim({ rule, edgeMode, width, height, seed, preset: nextPreset });
                }}
                disabled={isPlaying}
              >
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Edge mode" htmlFor="edge">
              <select
                id="edge"
                className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                value={edgeMode}
                onChange={(e) => {
                  const nextEdge = e.target.value as EdgeMode;
                  setEdgeMode(nextEdge);
                  resetSim({ rule, edgeMode: nextEdge, width, height, seed, preset });
                }}
                disabled={isPlaying}
              >
                <option value="wrap">Toroidal wrap</option>
                <option value="bounded">Bounded (dead outside)</option>
              </select>
            </Field>

            <Field label="Grid size" htmlFor="size" hint="Larger grids are more computationally expensive.">
              <div className="grid grid-cols-2 gap-2">
                <input
                  id="w"
                  type="number"
                  min={16}
                  max={512}
                  step={1}
                  className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  value={width}
                  onChange={(e) => {
                    const nextW = Math.max(16, Math.min(512, Math.floor(Number(e.target.value) || 0)));
                    setWidth(nextW);
                    resetSim({ rule, edgeMode, width: nextW, height, seed, preset });
                  }}
                  disabled={isPlaying}
                  aria-label="Grid width"
                />
                <input
                  id="h"
                  type="number"
                  min={16}
                  max={512}
                  step={1}
                  className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  value={height}
                  onChange={(e) => {
                    const nextH = Math.max(16, Math.min(512, Math.floor(Number(e.target.value) || 0)));
                    setHeight(nextH);
                    resetSim({ rule, edgeMode, width, height: nextH, seed, preset });
                  }}
                  disabled={isPlaying}
                  aria-label="Grid height"
                />
              </div>
            </Field>

            <Field label="Speed (steps/sec)" htmlFor="sps">
              <div className="grid grid-cols-[1fr_64px] items-center gap-3">
                <input
                  id="sps"
                  type="range"
                  min={1}
                  max={240}
                  value={stepsPerSec}
                  onChange={(e) => setStepsPerSec(Number(e.target.value))}
                />
                <div className="text-right text-sm tabular-nums">{stepsPerSec}</div>
              </div>
            </Field>

            <Field label="Cell size (px)" htmlFor="cell">
              <div className="grid grid-cols-[1fr_64px] items-center gap-3">
                <input
                  id="cell"
                  type="range"
                  min={2}
                  max={20}
                  value={cellSize}
                  onChange={(e) => setCellSize(Number(e.target.value))}
                />
                <div className="text-right text-sm tabular-nums">{cellSize}</div>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showGridlines}
                  onChange={(e) => setShowGridlines(e.target.checked)}
                />
                Gridlines
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={symmetry} onChange={(e) => setSymmetry(e.target.checked)} />
                Symmetry
              </label>
            </div>

            <Field label="Seed" htmlFor="seed" hint="Seed is stored in the URL for reproducibility.">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                <input
                  id="seed"
                  type="number"
                  className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  value={seed}
                  onChange={(e) => {
                    const nextSeed = clampU32(Number(e.target.value) || 0);
                    setSeed(nextSeed);
                    resetSim({ rule, edgeMode, width, height, seed: nextSeed, preset });
                  }}
                  disabled={isPlaying}
                />
                <Button onClick={copySeed} type="button">
                  Copy
                </Button>
                <Button
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(window.location.href);
                    } catch {
                      // ignore
                    }
                  }}
                  type="button"
                >
                  Copy link
                </Button>
              </div>
            </Field>
          </div>

          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="text-sm font-semibold">Metrics</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div className="text-zinc-600 dark:text-zinc-400">Generation</div>
              <div className="text-right tabular-nums">{sim.metrics.generation}</div>
              <div className="text-zinc-600 dark:text-zinc-400">
                {rule === "langtons_ant" ? "Black cells" : "Alive cells"}
              </div>
              <div className="text-right tabular-nums">{sim.metrics.aliveCount}</div>
              <div className="text-zinc-600 dark:text-zinc-400">Density</div>
              <div className="text-right tabular-nums">{densityPct}%</div>
              <div className="text-zinc-600 dark:text-zinc-400">Births</div>
              <div className="text-right tabular-nums">{sim.metrics.births}</div>
              <div className="text-zinc-600 dark:text-zinc-400">Deaths</div>
              <div className="text-right tabular-nums">{sim.metrics.deaths}</div>
              <div className="text-zinc-600 dark:text-zinc-400">Measured steps/sec</div>
              <div className="text-right tabular-nums">{measuredSps ? measuredSps.toFixed(1) : "—"}</div>
              <div className="text-zinc-600 dark:text-zinc-400">FPS</div>
              <div className="text-right tabular-nums">{fps ? fps.toFixed(0) : "—"}</div>
            </div>
          </div>
        </aside>

        <main className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Canvas</div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {isPlaying
                  ? "Drawing disabled while running. Pause to edit the grid."
                  : "Click/drag to paint. Symmetry mirrors across the center axes."}
              </div>
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              {rule === "langtons_ant" ? "Ant moves on Von Neumann neighborhood." : "Moore neighborhood (8)."}
            </div>
          </div>

          <div className="mt-3 overflow-auto rounded-lg">
            <CanvasView
              sim={sim}
              cellSize={cellSize}
              showGridlines={showGridlines}
              isPlaying={isPlaying}
              symmetry={symmetry}
              renderSignal={renderSignal}
              onPaintCell={onPaintCell}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

