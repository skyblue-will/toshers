import { NextResponse } from "next/server";
import { getMasterIndex, type IndexDepth } from "@/lib/content";

export const runtime = "nodejs";

export function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("depth");
  const depth: IndexDepth = raw === "shallow" ? "shallow" : "full";
  return NextResponse.json(getMasterIndex(depth), {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=3600",
    },
  });
}
