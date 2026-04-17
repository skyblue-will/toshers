import { NextResponse } from "next/server";
import { listGlossary } from "@/lib/data";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(listGlossary(), {
    headers: { "cache-control": "public, max-age=300, s-maxage=3600" },
  });
}
