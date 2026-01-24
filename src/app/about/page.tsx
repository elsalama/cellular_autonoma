import Link from "next/link";

export const metadata = {
  title: "About • Cellular Automata Lab",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="text-sm font-semibold">About</div>
          <Link href="/" className="text-sm text-zinc-700 hover:underline dark:text-zinc-300">
            Back to Playground
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Cellular Automata Lab</h1>
        <p className="mt-3 max-w-3xl text-zinc-700 dark:text-zinc-300">
          Cellular automata (CA) are discrete dynamical systems defined on a grid. Time advances in steps, each cell
          updates from a local neighborhood, and global structure emerges from simple deterministic rules.
        </p>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Rule sets in this demo</h2>
          <div className="mt-3 grid gap-4">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="font-semibold">Conway’s Game of Life</div>
              <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                Binary state (dead/alive) with Moore neighborhood (8 neighbors). Updates are simultaneous: live cells
                survive with 2–3 neighbors; dead cells are born with exactly 3 neighbors.
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="font-semibold">Brian’s Brain</div>
              <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                Three states (dead, alive, refractory) with Moore neighborhood. Dead → alive if exactly 2 alive
                neighbors; alive → refractory; refractory → dead. Produces wave-like propagation and flashing patterns.
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="font-semibold">Langton’s Ant</div>
              <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                A single ant moves on a black/white grid using Von Neumann neighborhood movement. On white: turn right,
                flip to black, move forward. On black: turn left, flip to white, move forward. From a simple start it
                often evolves into a long-term “highway”.
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">How to use</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
            <li>Pick a rule set and preset from the sidebar.</li>
            <li>Click Play to run continuously, or Step for a single generation.</li>
            <li>Pause to edit the grid by click-drag drawing (drawing is disabled while running).</li>
            <li>Use the Seed + Copy link controls to share a reproducible setup via URL parameters.</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Implementation notes</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
            <li>Grid state is stored in typed arrays (Uint8Array) with double-buffered updates (no in-place mutation).</li>
            <li>Simulation stepping is decoupled from rendering; rendering occurs smoothly on the animation frame.</li>
            <li>Randomization is deterministic given a numeric seed (stored in the URL for reproducibility).</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

