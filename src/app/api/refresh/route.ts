import { revalidatePath } from "next/cache";
import { runSync } from "@/lib/sync/run";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { days?: unknown };
  const days = typeof body.days === "number" ? body.days : undefined;
  try {
    const result = await runSync({ trigger: "manual", days });
    revalidatePath("/", "layout");
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refresh failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
