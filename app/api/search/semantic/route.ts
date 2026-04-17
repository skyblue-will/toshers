import { NextResponse } from "next/server";
import { semanticSearch } from "@/lib/semantic";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? "10");
  const kindParam = url.searchParams.get("kind") ?? undefined;

  if (!q.trim()) {
    return NextResponse.json(
      { error: "Missing required query param: q" },
      { status: 400 },
    );
  }

  const kind =
    kindParam === "source" || kindParam === "chapter" || kindParam === "character"
      ? kindParam
      : undefined;

  try {
    const result = await semanticSearch(
      q,
      isFinite(limit) && limit > 0 && limit <= 50 ? limit : 10,
      kind,
    );
    return NextResponse.json(result, {
      headers: { "cache-control": "public, max-age=60, s-maxage=600" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: "Semantic search failed. Try the substring /api/search endpoint as a fallback.",
        detail: msg,
      },
      { status: 503 },
    );
  }
}
