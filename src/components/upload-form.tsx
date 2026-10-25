"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/format";

type LoggedDay = { date: string; kcal: number; proteinG: number; carbsG: number; fatG: number; meals: number };

export function UploadForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<LoggedDay[] | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose the Nutrition Summary CSV.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/nutrition", { method: "POST", body: data });
      const body = (await response.json().catch(() => ({}))) as { error?: string; days?: LoggedDay[] };
      if (!response.ok) {
        setError(body.error || "Upload failed");
        return;
      }
      setDays(body.days ?? []);
      form.reset();
      router.refresh();
    } catch {
      setError("Upload failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-2 block text-muted">Nutrition Summary CSV</span>
        <input
          name="file"
          type="file"
          accept=".csv,text/csv"
          className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-3 file:py-2 file:text-xs file:font-semibold file:text-accent-foreground"
        />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save nutrition"}
      </Button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {days ? (
        <ul className="space-y-1 text-sm text-muted">
          {days.map((day) => (
            <li key={day.date}>
              {day.date}: {fmt(day.kcal)} kcal · {fmt(day.proteinG, 0)} g protein · {day.meals} meals
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
