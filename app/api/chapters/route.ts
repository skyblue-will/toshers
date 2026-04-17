import { NextResponse } from "next/server";
import { listChapters } from "@/lib/content";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(
    { chapters: listChapters() },
    { headers: { "cache-control": "public, max-age=300, s-maxage=3600" } },
  );
}
