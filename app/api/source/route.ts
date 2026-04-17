import { NextResponse } from "next/server";
import { getSourceLines } from "@/lib/content";

export const runtime = "nodejs";

export function GET(req: Request) {
  const url = new URL(req.url);
  const start = Number(url.searchParams.get("start"));
  const end = Number(url.searchParams.get("end"));

  if (!isFinite(start) || !isFinite(end) || start < 1) {
    return NextResponse.json(
      { error: "Provide integer start and end query params (start >= 1, end >= start)" },
      { status: 400 },
    );
  }

  const result = getSourceLines(start, end);
  const url2 = new URL(req.url);
  if (url2.searchParams.get("format") === "raw") {
    return new Response(result.text, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=3600, s-maxage=86400",
      },
    });
  }

  return NextResponse.json(result, {
    headers: { "cache-control": "public, max-age=3600, s-maxage=86400" },
  });
}
