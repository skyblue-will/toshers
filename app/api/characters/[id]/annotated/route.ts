import { NextResponse } from "next/server";
import { getCharacter } from "@/lib/content";
import { annotateBody } from "@/lib/annotate";
import { listGlossary } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
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

  const glossary = listGlossary().entries;
  const annotations = annotateBody(character.body, glossary);

  const meta = character.meta as Record<string, unknown>;
  return NextResponse.json(
    {
      id,
      url: `/api/characters/${id}/annotated`,
      source_lines: meta.source_lines ? String(meta.source_lines) : null,
      body: character.body,
      annotations,
      annotation_summary: {
        gloss_count: annotations.filter((a) => a.type === "gloss").length,
        price_count: annotations.filter((a) => a.type === "price").length,
        body_length: character.body.length,
      },
    },
    { headers: { "cache-control": "public, max-age=300, s-maxage=3600" } },
  );
}
