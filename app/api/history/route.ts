import { getStreamHistory } from "@/lib/session-tracker";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const streams = await getStreamHistory();
    return Response.json(
      { streams },
      { headers: { "Cache-Control": "public, max-age=30" } }
    );
  } catch {
    return Response.json({ streams: [] });
  }
}
