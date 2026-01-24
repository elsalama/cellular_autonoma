import type { EdgeMode, StepMetrics } from "./types";
import { getCell, idx } from "./utils";

export function stepLife(params: {
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
      let n = 0;
      // Moore neighborhood (8).
      n += getCell(current, x - 1, y - 1, width, height, edgeMode) & 1;
      n += getCell(current, x + 0, y - 1, width, height, edgeMode) & 1;
      n += getCell(current, x + 1, y - 1, width, height, edgeMode) & 1;
      n += getCell(current, x - 1, y + 0, width, height, edgeMode) & 1;
      n += getCell(current, x + 1, y + 0, width, height, edgeMode) & 1;
      n += getCell(current, x - 1, y + 1, width, height, edgeMode) & 1;
      n += getCell(current, x + 0, y + 1, width, height, edgeMode) & 1;
      n += getCell(current, x + 1, y + 1, width, height, edgeMode) & 1;

      const i = idx(x, y, width);
      const cur = current[i] & 1;
      const nxt = cur ? (n === 2 || n === 3 ? 1 : 0) : n === 3 ? 1 : 0;
      next[i] = nxt;

      aliveCount += nxt;
      if (cur === 0 && nxt === 1) births++;
      else if (cur === 1 && nxt === 0) deaths++;
    }
  }

  const generation = params.generation + 1;
  const density = aliveCount / (width * height);
  return { generation, aliveCount, density, births, deaths };
}

