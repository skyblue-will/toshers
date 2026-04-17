import { NextResponse } from "next/server";
import { listQuotes } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const speaker_id = url.searchParams.get("speaker_id") ?? undefined;
  const chapter_ref = url.searchParams.get("chapter_ref") ?? undefined;
  const theme = url.searchParams.get("theme") ?? undefined;
  const dialect_level = url.searchParams.get("dialect_level") ?? undefined;

  return NextResponse.json(
    listQuotes({ speaker_id, chapter_ref, theme, dialect_level }),
    { headers: { "cache-control": "public, max-age=300, s-maxage=3600" } },
  );
}
