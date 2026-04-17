import { NextResponse } from "next/server";
import { listRelationships } from "@/lib/data";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(listRelationships(), {
    headers: { "cache-control": "public, max-age=300, s-maxage=3600" },
  });
}
