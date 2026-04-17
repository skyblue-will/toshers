import { NextResponse } from "next/server";
import { getGlossaryTerm } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ term: string }> },
) {
  const { term } = await params;
  const entry = getGlossaryTerm(term);
  if (!entry) {
    return NextResponse.json(
      { error: `Glossary term not found: ${term}. Call /api/glossary to see all terms.` },
      { status: 404 },
    );
  }
  return NextResponse.json(entry, {
    headers: { "cache-control": "public, max-age=300, s-maxage=3600" },
  });
}
