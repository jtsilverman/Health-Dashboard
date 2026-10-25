"use client";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-3xl border border-border bg-card px-5 py-8">
      <h1 className="font-display text-4xl tracking-wide">Couldn’t load Cadence</h1>
      <p className="mt-3 max-w-xl text-sm text-muted">{error.message || "Something went wrong reading the training log."}</p>
      <Button type="button" className="mt-5" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
