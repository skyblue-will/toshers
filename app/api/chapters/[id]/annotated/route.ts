import { NextResponse } from "next/server";
import { getChapter } from "@/lib/content";
import { annotateBody } from "@/lib/annotate";
import { listGlossary } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const chapter = getChapter(id);
  if (!chapter) {
    return NextResponse.json(
      { error: `Chapter not found: ${id}` },
      { status: 404 },
    );
  }

  const glossary = listGlossary().entries;
  const annotations = annotateBody(chapter.body, glossary);

  const meta = chapter.meta as Record<string, unknown>;
  return NextResponse.json(
    {
      id,
      url: `/api/chapters/${id}/annotated`,
      source_lines: meta.source_lines ? String(meta.source_lines) : null,
      body: chapter.body,
      annotations,
      annotation_summary: {
        gloss_count: annotations.filter((a) => a.type === "gloss").length,
        price_count: annotations.filter((a) => a.type === "price").length,
        body_length: chapter.body.length,
      },
    },
    { headers: { "cache-control": "public, max-age=300, s-maxage=3600" } },
  );
}
