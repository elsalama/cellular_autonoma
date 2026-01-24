import type { AntDir, AntState, EdgeMode, StepMetrics } from "./types";
import { idx, wrap } from "./utils";

function turnRight(dir: AntDir): AntDir {
  return ((dir + 1) & 3) as AntDir;
}
function turnLeft(dir: AntDir): AntDir {
  return ((dir + 3) & 3) as AntDir;
}

export function stepLangtonsAnt(params: {
  current: Uint8Array;
  next: Uint8Array;
  ant: AntState;
  width: number;
  height: number;
  edgeMode: EdgeMode;
  generation: number;
}): { ant: AntState; metrics: StepMetrics } {
  const { current, next, ant, width, height, edgeMode } = params;

  // Double-buffer correctness: start from a copy, then apply only the one flipped cell.
  next.set(current);

  const i = idx(ant.x, ant.y, width);
  const curColor = current[i] & 1; // 0 white, 1 black

  let dir: AntDir;
  let births = 0;
  let deaths = 0;
  if (curColor === 0) {
    dir = turnRight(ant.dir);
    next[i] = 1;
    births = 1; // white -> black
  } else {
    dir = turnLeft(ant.dir);
    next[i] = 0;
    deaths = 1; // black -> white
  }

  let nx = ant.x;
  let ny = ant.y;
  if (dir === 0) ny -= 1;
  else if (dir === 1) nx += 1;
  else if (dir === 2) ny += 1;
  else nx -= 1;

  if (edgeMode === "wrap") {
    nx = wrap(nx, width);
    ny = wrap(ny, height);
  } else {
    // Bounded edges: keep the ant inside the grid.
    if (nx < 0) nx = 0;
    if (nx >= width) nx = width - 1;
    if (ny < 0) ny = 0;
    if (ny >= height) ny = height - 1;
  }

  // For Langton's Ant, we treat "alive" as black cells (1).
  // Count black cells for density; it's O(N) but keeps metrics exact.
  let blackCount = 0;
  for (let k = 0; k < next.length; k++) blackCount += next[k] & 1;

  const generation = params.generation + 1;
  const density = blackCount / (width * height);
  const metrics: StepMetrics = {
    generation,
    aliveCount: blackCount,
    density,
    births,
    deaths,
  };
  return { ant: { x: nx, y: ny, dir }, metrics };
}

