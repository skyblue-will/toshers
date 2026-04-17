import { NextResponse } from "next/server";
import { listLocations } from "@/lib/data";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(listLocations(), {
    headers: { "cache-control": "public, max-age=300, s-maxage=3600" },
  });
}
