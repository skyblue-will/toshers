import { NextResponse } from "next/server";
import { getChapter } from "@/lib/content";

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

  const url = new URL(_req.url);
  const format = url.searchParams.get("format");

  if (format === "raw") {
    return new Response(chapter.raw, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=3600",
      },
    });
  }

  const meta = chapter.meta as Record<string, unknown>;
  return NextResponse.json(
    {
      id,
      url: `/api/chapters/${id}`,
      source_lines: meta.source_lines ? String(meta.source_lines) : null,
      meta,
      body: chapter.body,
    },
    { headers: { "cache-control": "public, max-age=300, s-maxage=3600" } },
  );
}
