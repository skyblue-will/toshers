import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const SPEC = fs.readFileSync(
  path.join(process.cwd(), "data", "openapi.json"),
  "utf8",
);

export async function GET() {
  return new Response(SPEC, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=3600",
    },
  });
}
