"use client";

import dynamic from "next/dynamic";

const Playground = dynamic(() => import("@/components/ca/Playground").then((m) => m.Playground), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10">
        <div className="h-10 w-56 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-6 w-80 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-6 h-[520px] w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  ),
});

export default function Home() {
  return <Playground />;
}
