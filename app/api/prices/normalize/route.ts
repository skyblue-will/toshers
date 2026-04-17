import { NextResponse } from "next/server";
import { normalizePrice } from "@/lib/prices";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const pounds = Number(url.searchParams.get("pounds") ?? 0);
  const shillings = Number(url.searchParams.get("shillings") ?? 0);
  const pence = Number(url.searchParams.get("pence") ?? 0);

  try {
    const result = normalizePrice({ pounds, shillings, pence });
    return NextResponse.json(result, {
      headers: { "cache-control": "public, max-age=3600, s-maxage=86400" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
