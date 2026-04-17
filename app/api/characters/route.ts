import { NextResponse } from "next/server";
import { listCharacters } from "@/lib/content";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(
    { characters: listCharacters() },
    { headers: { "cache-control": "public, max-age=300, s-maxage=3600" } },
  );
}
