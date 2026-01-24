export type RuleType = "life" | "brians_brain" | "langtons_ant";

export type EdgeMode = "wrap" | "bounded";

export type AntDir = 0 | 1 | 2 | 3; // N,E,S,W

export type AntState = {
  x: number;
  y: number;
  dir: AntDir;
};

export type StepMetrics = {
  generation: number;
  aliveCount: number;
  density: number; // 0..1
  births: number;
  deaths: number;
};

export type SimulationConfig = {
  rule: RuleType;
  width: number;
  height: number;
  edgeMode: EdgeMode;
  seed: number;
};

export type SimulationState = {
  config: SimulationConfig;
  currentGrid: Uint8Array;
  nextGrid: Uint8Array;
  ant?: AntState;
  metrics: StepMetrics;
};

