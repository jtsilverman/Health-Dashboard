import { Suspense } from "react";
import { loginAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Sign in" };

async function LoginForm({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/";
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-5 py-16">
      <p className="text-[11px] uppercase tracking-[0.2em] text-accent">Cadence</p>
      <h1 className="mt-2 font-display text-6xl tracking-wide">Sign in</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        This is Jake’s training log. Recovery, heart rate, sleep, and food stay behind one password.
      </p>
      <form action={loginAction} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="block text-sm">
          <span className="mb-2 block text-muted">Password</span>
          <Input name="password" type="password" autoComplete="current-password" required />
        </label>
        <Button type="submit" className="w-full">
          Open the log
        </Button>
      </form>
      {params.error === "1" ? <p className="mt-4 text-sm text-danger">That password doesn’t match.</p> : null}
      {params.error === "config" ? (
        <p className="mt-4 text-sm text-danger">Set DASHBOARD_PASSWORD before signing in.</p>
      ) : null}
    </main>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  return (
    <Suspense fallback={<main className="mx-auto max-w-md px-5 py-16 text-muted">Loading…</main>}>
      <LoginForm searchParams={searchParams} />
    </Suspense>
  );
}
