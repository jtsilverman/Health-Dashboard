import { revalidatePath } from "next/cache";
import { bearerMatches } from "@/lib/auth";
import { runSync } from "@/lib/sync/run";

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !bearerMatches(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runSync({ trigger: "cron" });
    revalidatePath("/", "layout");
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refresh failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

export function GET(request: Request) {
  return handle(request);
}

export function POST(request: Request) {
  return handle(request);
}
