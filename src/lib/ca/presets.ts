import type { AntState, RuleType, SimulationConfig } from "./types";
import { mulberry32 } from "./rng";
import { idx, setCell } from "./utils";

export type PresetId =
  | "life_glider"
  | "life_pulsar"
  | "life_gosper_glider_gun"
  | "brians_random"
  | "ant_single";

export function presetListForRule(rule: RuleType): { id: PresetId; label: string }[] {
  if (rule === "life") {
    return [
      { id: "life_glider", label: "Glider" },
      { id: "life_pulsar", label: "Pulsar" },
      { id: "life_gosper_glider_gun", label: "Gosper Glider Gun" },
    ];
  }
  if (rule === "brians_brain") {
    return [{ id: "brians_random", label: "Random seeded start" }];
  }
  return [{ id: "ant_single", label: "Single ant at center" }];
}

function placePattern(
  grid: Uint8Array,
  cfg: SimulationConfig,
  pattern: Array<[number, number]>,
  value: number,
) {
  const ox = Math.floor(cfg.width / 2);
  const oy = Math.floor(cfg.height / 2);
  for (const [dx, dy] of pattern) {
    setCell(grid, ox + dx, oy + dy, cfg.width, cfg.height, cfg.edgeMode, value);
  }
}

export function clearGrid(grid: Uint8Array) {
  grid.fill(0);
}

export function seedRandom(params: {
  grid: Uint8Array;
  cfg: SimulationConfig;
  aliveProbability: number;
  aliveValue: number;
}) {
  const { grid, cfg, aliveProbability, aliveValue } = params;
  const rand = mulberry32(cfg.seed);
  for (let i = 0; i < grid.length; i++) {
    grid[i] = rand() < aliveProbability ? aliveValue : 0;
  }
}

export function applyPreset(params: {
  preset: PresetId;
  cfg: SimulationConfig;
  grid: Uint8Array;
}): { ant?: AntState } {
  const { preset, cfg, grid } = params;
  clearGrid(grid);

  if (preset === "life_glider") {
    // Classic glider (upper-left moving down-right when placed).
    placePattern(
      grid,
      cfg,
      [
        [0, -1],
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
      ],
      1,
    );
    return {};
  }

  if (preset === "life_pulsar") {
    // Pulsar centered (period 3). Coordinates from standard pattern.
    const p: Array<[number, number]> = [];
    const add = (x: number, y: number) => p.push([x, y]);
    const bars = [2, 3, 4];
    for (const k of bars) {
      add(-k, -6);
      add(-k, -1);
      add(-k, 1);
      add(-k, 6);
      add(k, -6);
      add(k, -1);
      add(k, 1);
      add(k, 6);

      add(-6, -k);
      add(-1, -k);
      add(1, -k);
      add(6, -k);
      add(-6, k);
      add(-1, k);
      add(1, k);
      add(6, k);
    }
    placePattern(grid, cfg, p, 1);
    return {};
  }

  if (preset === "life_gosper_glider_gun") {
    // Gosper Glider Gun anchored around center-left.
    // Coordinates are for the canonical gun, adapted for a centered origin.
    const gun: Array<[number, number]> = [
      // Left square
      [-18, -4],
      [-17, -4],
      [-18, -3],
      [-17, -3],
      // Left part
      [-8, -4],
      [-7, -4],
      [-9, -3],
      [-6, -3],
      [-10, -2],
      [-5, -2],
      [-10, -1],
      [-5, -1],
      [-10, 0],
      [-5, 0],
      [-9, 1],
      [-6, 1],
      [-8, 2],
      [-7, 2],
      // Middle
      [-4, -2],
      [-3, -2],
      [-4, -1],
      [-3, -1],
      // Right part
      [2, -4],
      [2, -3],
      [2, -2],
      [3, -4],
      [4, -3],
      [5, -2],
      [5, -1],
      [4, 0],
      [3, 1],
      // Right square
      [12, -2],
      [13, -2],
      [12, -1],
      [13, -1],
    ];

    // Place slightly left so it has room to shoot to the right on modest grids.
    const ox = Math.floor(cfg.width / 3);
    const oy = Math.floor(cfg.height / 2);
    for (const [dx, dy] of gun) {
      setCell(grid, ox + dx, oy + dy, cfg.width, cfg.height, cfg.edgeMode, 1);
    }
    return {};
  }

  if (preset === "brians_random") {
    // Seeded start with a modest density; alive only (refractory emerges from dynamics).
    seedRandom({ grid, cfg, aliveProbability: 0.18, aliveValue: 1 });
    return {};
  }

  // ant_single
  clearGrid(grid);
  const ant: AntState = {
    x: Math.floor(cfg.width / 2),
    y: Math.floor(cfg.height / 2),
    dir: 0,
  };
  // Ensure starting tile is white.
  grid[idx(ant.x, ant.y, cfg.width)] = 0;
  return { ant };
}

