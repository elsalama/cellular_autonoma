import type { EdgeMode, StepMetrics } from "./types";
import { getCell, idx } from "./utils";

// States:
// 0 = dead
// 1 = alive
// 2 = refractory
export function stepBriansBrain(params: {
  current: Uint8Array;
  next: Uint8Array;
  width: number;
  height: number;
  edgeMode: EdgeMode;
  generation: number;
}): StepMetrics {
  const { current, next, width, height, edgeMode } = params;
  let aliveCount = 0;
  let births = 0;
  let deaths = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let aliveNeighbors = 0;
      // Moore neighborhood; only count state==1 as alive.
      aliveNeighbors += getCell(current, x - 1, y - 1, width, height, edgeMode) === 1 ? 1 : 0;
      aliveNeighbors += getCell(current, x + 0, y - 1, width, height, edgeMode) === 1 ? 1 : 0;
      aliveNeighbors += getCell(current, x + 1, y - 1, width, height, edgeMode) === 1 ? 1 : 0;
      aliveNeighbors += getCell(current, x - 1, y + 0, width, height, edgeMode) === 1 ? 1 : 0;
      aliveNeighbors += getCell(current, x + 1, y + 0, width, height, edgeMode) === 1 ? 1 : 0;
      aliveNeighbors += getCell(current, x - 1, y + 1, width, height, edgeMode) === 1 ? 1 : 0;
      aliveNeighbors += getCell(current, x + 0, y + 1, width, height, edgeMode) === 1 ? 1 : 0;
      aliveNeighbors += getCell(current, x + 1, y + 1, width, height, edgeMode) === 1 ? 1 : 0;

      const i = idx(x, y, width);
      const cur = current[i];
      let nxt: number;
      if (cur === 0) {
        nxt = aliveNeighbors === 2 ? 1 : 0;
      } else if (cur === 1) {
        nxt = 2;
      } else {
        nxt = 0;
      }
      next[i] = nxt;

      if (nxt === 1) aliveCount++;
      if (cur !== 1 && nxt === 1) births++;
      if (cur === 1 && nxt !== 1) deaths++;
    }
  }

  const generation = params.generation + 1;
  const density = aliveCount / (width * height);
  return { generation, aliveCount, density, births, deaths };
}

