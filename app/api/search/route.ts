import { NextResponse } from "next/server";
import { search } from "@/lib/content";

export const runtime = "nodejs";

export function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? "10");
  const ctx = Number(url.searchParams.get("context") ?? "2");

  if (!q.trim()) {
    return NextResponse.json(
      { error: "Missing required query param: q" },
      { status: 400 },
    );
  }

  const result = search(q, isFinite(limit) ? limit : 10, isFinite(ctx) ? ctx : 2);
  return NextResponse.json(result, {
    headers: { "cache-control": "public, max-age=60, s-maxage=600" },
  });
}
