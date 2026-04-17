import { NextResponse } from "next/server";
import { getMasterIndex } from "@/lib/content";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(getMasterIndex(), {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=3600",
    },
  });
}
