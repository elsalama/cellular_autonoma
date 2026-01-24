## Cellular Automata Lab

A production-quality, interactive cellular automata (CA) playground built with **Next.js + TypeScript + Tailwind CSS**.

Includes deterministic, double-buffered simulation engines for:
- **Conway’s Game of Life** (Moore neighborhood)
- **Brian’s Brain** (3-state, Moore neighborhood)
- **Langton’s Ant** (single ant, Von Neumann movement)

### Features
- **Canvas rendering** with optional gridlines and clear ant overlay
- **Play/Pause**, **single-step**, **reset**, **clear**, **randomize**
- **Speed**, **grid size**, **cell size**, **edge mode (wrap/bounded)**
- **Click/drag drawing** (disabled while playing) + optional symmetry drawing
- **Live metrics** (generation, alive/black count, density, births/deaths, measured steps/sec, FPS)
- **Reproducibility via URL params** (rule, seed, grid size, speed, etc.)

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### Usage
- Use the left sidebar to choose a **rule set** and **preset**.
- Click **Play** to run or **Step** for a single generation.
- **Pause** to draw on the grid.
- Use **Seed** + **Copy link** to share reproducible setups.

### URL Parameters (Sharing)
The playground stores state in the URL query string, including:
- `rule`: `life | brians_brain | langtons_ant`
- `seed`: numeric seed (uint32)
- `w`, `h`: grid dimensions
- `sps`: steps per second
- `edge`: `wrap | bounded`
- `cell`: cell size in pixels
- `grid`: `1` to show gridlines
- `sym`: `1` to enable symmetry drawing
- `preset`: preset id for the rule

### Screenshots
Add screenshots here once you’ve run the app locally:
- `docs/screenshots/life.png`
- `docs/screenshots/brians-brain.png`
- `docs/screenshots/langtons-ant.png`

### Notes
- Simulation state uses **typed arrays** (`Uint8Array`) and **double buffering** (`currentGrid` / `nextGrid`) for correct synchronous updates.
- Randomization is **deterministic** given the seed.
