import { NextResponse } from "next/server";
import { getCharacter } from "@/lib/content";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const character = getCharacter(id);
  if (!character) {
    return NextResponse.json(
      { error: `Character not found: ${id}` },
      { status: 404 },
    );
  }

  const url = new URL(req.url);
  const format = url.searchParams.get("format");

  if (format === "raw") {
    return new Response(character.raw, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=3600",
      },
    });
  }

  return NextResponse.json(
    { id, meta: character.meta, body: character.body },
    { headers: { "cache-control": "public, max-age=300, s-maxage=3600" } },
  );
}
