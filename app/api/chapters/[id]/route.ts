import { NextResponse } from "next/server";
import { applyProfile, getChapter, type Profile } from "@/lib/content";

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
  const chapter = getChapter(id);
  if (!chapter) {
    return NextResponse.json(
      { error: `Chapter not found: ${id}` },
      { status: 404 },
    );
  }

  const url = new URL(req.url);
  const format = url.searchParams.get("format");
  const profile = parseProfile(url.searchParams.get("profile"));

  if (format === "raw") {
    return new Response(chapter.raw, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=3600",
      },
    });
  }

  const meta = applyProfile(
    chapter.meta as Record<string, unknown>,
    profile,
  );
  const sourceLines = (chapter.meta as Record<string, unknown>).source_lines;
  return NextResponse.json(
    {
      id,
      url: `/api/chapters/${id}`,
      profile,
      source_lines: sourceLines ? String(sourceLines) : null,
      meta,
      body: profile === "minimal" ? null : chapter.body,
    },
    { headers: { "cache-control": "public, max-age=300, s-maxage=3600" } },
  );
}
