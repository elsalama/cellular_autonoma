"use client";

import type { ReactNode } from "react";

export function Field(props: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  const { label, htmlFor, hint, children } = props;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {label}
      </label>
      {children}
      {hint ? <div className="text-xs text-zinc-600 dark:text-zinc-400">{hint}</div> : null}
    </div>
  );
}

