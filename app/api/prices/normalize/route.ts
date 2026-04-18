import { NextResponse } from "next/server";
import { normalizePrice, parsePriceLiteral } from "@/lib/prices";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const literal = url.searchParams.get("literal");

  try {
    const input = literal
      ? parsePriceLiteral(literal)
      : {
          pounds: Number(url.searchParams.get("pounds") ?? 0),
          shillings: Number(url.searchParams.get("shillings") ?? 0),
          pence: Number(url.searchParams.get("pence") ?? 0),
        };
    const result = normalizePrice(input);
    return NextResponse.json(
      { ...result, input_mode: literal ? "literal" : "numeric" },
      { headers: { "cache-control": "public, max-age=3600, s-maxage=86400" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
