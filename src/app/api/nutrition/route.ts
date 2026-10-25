import { revalidatePath } from "next/cache";
import { upsertMfp } from "@/lib/db/queries";
import { parseMfpCsv } from "@/lib/mfp/parse";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let csv = "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Choose a CSV file." }, { status: 400 });
    }
    if (file.size > 2_000_000) {
      return Response.json({ error: "CSV is larger than 2 MB." }, { status: 413 });
    }
    csv = await file.text();
  } else {
    csv = await request.text();
    if (csv.length > 2_000_000) {
      return Response.json({ error: "CSV is larger than 2 MB." }, { status: 413 });
    }
  }

  const parsed = parseMfpCsv(csv);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 });
  await upsertMfp(parsed.days);
  revalidatePath("/", "layout");
  return Response.json({ days: parsed.days });
}
