import { NextResponse } from "next/server";
import { findMentionsOf } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json(
      { error: "Missing required query parameter 'q'." },
      { status: 400 },
    );
  }
  return NextResponse.json(findMentionsOf(q), {
    headers: { "cache-control": "public, max-age=300, s-maxage=3600" },
  });
}
