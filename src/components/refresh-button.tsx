"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RefreshButton({
  days,
  label = "Refresh",
  variant = "default",
}: {
  days?: number;
  label?: string;
  variant?: "default" | "outline" | "ghost";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(days ? { days } : {}),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        daysWritten?: number;
        whoop?: { error?: string | null };
        garmin?: { error?: string | null };
      };
      if (!response.ok) {
        setMessage(body.error || "Refresh failed");
        return;
      }
      const problems = [body.whoop?.error, body.garmin?.error].filter(Boolean);
      setMessage(problems.length ? problems.join(" ") : `Saved ${body.daysWritten ?? 0} days`);
      router.refresh();
    } catch {
      setMessage("Refresh failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant={variant} onClick={run} disabled={pending}>
        {pending ? "Pulling…" : label}
      </Button>
      {message ? <p className="max-w-56 text-right text-[11px] leading-4 text-muted">{message}</p> : null}
    </div>
  );
}
