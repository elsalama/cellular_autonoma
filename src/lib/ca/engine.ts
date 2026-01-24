import type { PresetId } from "./presets";
import { applyPreset, clearGrid, seedRandom } from "./presets";
import type { RuleType, SimulationConfig, SimulationState } from "./types";
import { clampU32 } from "./rng";
import { stepLife } from "./life";
import { stepBriansBrain } from "./briansBrain";
import { stepLangtonsAnt } from "./langtonsAnt";

function recomputeSnapshotMetrics(state: SimulationState) {
  const { rule, width, height } = state.config;
  let aliveCount = 0;
  if (rule === "life") {
    for (let i = 0; i < state.currentGrid.length; i++) aliveCount += state.currentGrid[i] & 1;
  } else if (rule === "brians_brain") {
    for (let i = 0; i < state.currentGrid.length; i++) aliveCount += state.currentGrid[i] === 1 ? 1 : 0;
  } else {
    for (let i = 0; i < state.currentGrid.length; i++) aliveCount += state.currentGrid[i] & 1; // black
  }
  state.metrics = {
    generation: 0,
    aliveCount,
    density: aliveCount / (width * height),
    births: 0,
    deaths: 0,
  };
}

export function createSimulation(cfg: SimulationConfig): SimulationState {
  const width = Math.max(1, Math.floor(cfg.width));
  const height = Math.max(1, Math.floor(cfg.height));
  const seed = clampU32(cfg.seed);

  const config: SimulationConfig = { ...cfg, width, height, seed };
  const currentGrid = new Uint8Array(width * height);
  const nextGrid = new Uint8Array(width * height);

  const state: SimulationState = {
    config,
    currentGrid,
    nextGrid,
    ant: cfg.rule === "langtons_ant"
      ? { x: Math.floor(width / 2), y: Math.floor(height / 2), dir: 0 }
      : undefined,
    metrics: {
      generation: 0,
      aliveCount: 0,
      density: 0,
      births: 0,
      deaths: 0,
    },
  };

  return state;
}

export function resetSimulation(state: SimulationState, cfg: SimulationConfig) {
  const next = createSimulation(cfg);
  state.config = next.config;
  state.currentGrid = next.currentGrid;
  state.nextGrid = next.nextGrid;
  state.ant = next.ant;
  state.metrics = next.metrics;
}

export function clear(state: SimulationState) {
  clearGrid(state.currentGrid);
  clearGrid(state.nextGrid);
  state.metrics = { generation: 0, aliveCount: 0, density: 0, births: 0, deaths: 0 };
  if (state.config.rule === "langtons_ant") {
    state.ant = {
      x: Math.floor(state.config.width / 2),
      y: Math.floor(state.config.height / 2),
      dir: 0,
    };
  } else {
    state.ant = undefined;
  }
}

export function randomize(state: SimulationState, aliveProbability?: number) {
  const rule = state.config.rule;
  if (rule === "life") {
    seedRandom({
      grid: state.currentGrid,
      cfg: state.config,
      aliveProbability: aliveProbability ?? 0.22,
      aliveValue: 1,
    });
  } else if (rule === "brians_brain") {
    seedRandom({
      grid: state.currentGrid,
      cfg: state.config,
      aliveProbability: aliveProbability ?? 0.18,
      aliveValue: 1,
    });
  } else {
    // Langton: randomize cell colors but keep the ant in the center.
    seedRandom({
      grid: state.currentGrid,
      cfg: state.config,
      aliveProbability: aliveProbability ?? 0.35,
      aliveValue: 1,
    });
    state.ant = {
      x: Math.floor(state.config.width / 2),
      y: Math.floor(state.config.height / 2),
      dir: 0,
    };
  }

  clearGrid(state.nextGrid);
  recomputeSnapshotMetrics(state);
}

export function applyPresetToSimulation(state: SimulationState, preset: PresetId) {
  const { ant } = applyPreset({ preset, cfg: state.config, grid: state.currentGrid });
  state.ant = ant;
  clearGrid(state.nextGrid);
  recomputeSnapshotMetrics(state);
}

export function step(state: SimulationState) {
  const { rule, width, height, edgeMode } = state.config;
  const generation = state.metrics.generation;

  if (rule === "life") {
    state.metrics = stepLife({
      current: state.currentGrid,
      next: state.nextGrid,
      width,
      height,
      edgeMode,
      generation,
    });
  } else if (rule === "brians_brain") {
    state.metrics = stepBriansBrain({
      current: state.currentGrid,
      next: state.nextGrid,
      width,
      height,
      edgeMode,
      generation,
    });
  } else {
    if (!state.ant) {
      state.ant = { x: Math.floor(width / 2), y: Math.floor(height / 2), dir: 0 };
    }
    const res = stepLangtonsAnt({
      current: state.currentGrid,
      next: state.nextGrid,
      ant: state.ant,
      width,
      height,
      edgeMode,
      generation,
    });
    state.ant = res.ant;
    state.metrics = res.metrics;
  }

  // Swap buffers (no in-place mutation).
  const tmp = state.currentGrid;
  state.currentGrid = state.nextGrid;
  state.nextGrid = tmp;
}

export function normalizeRule(rule: string | null | undefined): RuleType {
  if (rule === "brians_brain") return "brians_brain";
  if (rule === "langtons_ant") return "langtons_ant";
  return "life";
}

