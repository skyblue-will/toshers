import { NextResponse } from "next/server";
import { listQuiz } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const chapter_ref = url.searchParams.get("chapter_ref") ?? undefined;
  const difficulty = url.searchParams.get("difficulty") ?? undefined;

  return NextResponse.json(
    listQuiz({ chapter_ref, difficulty }),
    { headers: { "cache-control": "public, max-age=300, s-maxage=3600" } },
  );
}
