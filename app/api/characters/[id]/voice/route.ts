import { NextResponse } from "next/server";
import { voiceProfile } from "@/lib/voice";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const profile = voiceProfile(id);
  if (!profile) {
    return NextResponse.json(
      { error: `Character not found: ${id}. Call /api/characters to see available ids.` },
      { status: 404 },
    );
  }
  return NextResponse.json(profile, {
    headers: { "cache-control": "public, max-age=300, s-maxage=3600" },
  });
}
