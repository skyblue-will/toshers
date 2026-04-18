import { NextResponse } from "next/server";
import { applyProfile, getCharacter, type Profile } from "@/lib/content";

export const runtime = "nodejs";

function parseProfile(raw: string | null): Profile {
  if (raw === "minimal") return "minimal";
  if (raw === "facts") return "facts";
  return "full";
}

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
  const profile = parseProfile(url.searchParams.get("profile"));

  if (format === "raw") {
    return new Response(character.raw, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=3600",
      },
    });
  }

  const meta = applyProfile(
    character.meta as Record<string, unknown>,
    profile,
  );
  const sourceLines = (character.meta as Record<string, unknown>).source_lines;
  return NextResponse.json(
    {
      id,
      url: `/api/characters/${id}`,
      profile,
      source_lines: sourceLines ? String(sourceLines) : null,
      meta,
      body: profile === "minimal" ? null : character.body,
    },
    { headers: { "cache-control": "public, max-age=300, s-maxage=3600" } },
  );
}
