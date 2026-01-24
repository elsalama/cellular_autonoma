import type { EdgeMode } from "./types";

export function idx(x: number, y: number, width: number) {
  return y * width + x;
}

export function wrap(n: number, max: number) {
  // Handles negative values.
  return ((n % max) + max) % max;
}

export function inBounds(x: number, y: number, width: number, height: number) {
  return x >= 0 && x < width && y >= 0 && y < height;
}

export function getCell(
  grid: Uint8Array,
  x: number,
  y: number,
  width: number,
  height: number,
  edgeMode: EdgeMode,
) {
  if (edgeMode === "wrap") {
    return grid[idx(wrap(x, width), wrap(y, height), width)];
  }
  if (!inBounds(x, y, width, height)) return 0;
  return grid[idx(x, y, width)];
}

export function setCell(
  grid: Uint8Array,
  x: number,
  y: number,
  width: number,
  height: number,
  edgeMode: EdgeMode,
  value: number,
) {
  if (edgeMode === "wrap") {
    grid[idx(wrap(x, width), wrap(y, height), width)] = value;
    return;
  }
  if (!inBounds(x, y, width, height)) return;
  grid[idx(x, y, width)] = value;
}

