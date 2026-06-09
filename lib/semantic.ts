import { embed } from "ai";
import { db } from "./db";

const MODEL = "openai/text-embedding-3-small";

export type SemanticHit = {
  kind: "source" | "chapter" | "character";
  doc_id: string | null;
  line: number;
  source_lines: string;
  source_start: number;
  source_end: number;
  snippet: string;
  context: string;
  score: number;
  token_estimate: number;
};

export type SemanticSearchResult = {
  query: string;
  hits: SemanticHit[];
  model: string;
};

type Row = {
  id: string | number;
  kind: "source" | "chapter" | "character";
  doc_id: string | null;
  source_start: number;
  source_end: number;
  text: string;
  token_estimate: number;
  score: number;
};

export async function semanticSearch(
  query: string,
  limit = 10,
  kind?: "source" | "chapter" | "character",
): Promise<SemanticSearchResult> {
  const q = query.trim();
  if (!q) return { query, hits: [], model: MODEL };

  const { embedding } = await embed({ model: MODEL, value: q });
  const literal = `[${embedding.join(",")}]`;

  // The same passage can be indexed under more than one kind (a chapter chunk
  // can carry the very text the raw source chunk does), and identical text
  // means identical embeddings, so both would rank side by side. Over-fetch,
  // then dedupe by chunk text below, keeping the narrower line range (the more
  // precise citation) and preferring the raw source on a tie. A kind-filtered
  // query cannot collide, so it fetches exactly `limit`.
  const fetchLimit = kind ? limit : Math.min(limit * 2 + 5, 50);

  const sql = db();
  // Note: neon(...)`...${x}...` uses parameterised queries; we inline ::vector casting.
  const rows = (await sql`
    select id, kind, doc_id, source_start, source_end, text, token_estimate,
           1 - (embedding <=> ${literal}::vector) as score
    from chunks
    where (${kind ?? null}::text is null or kind = ${kind ?? null}::text)
    order by embedding <=> ${literal}::vector
    limit ${fetchLimit}
  `) as Row[];

  const byText = new Map<string, Row>();
  for (const r of rows) {
    const prev = byText.get(r.text);
    if (!prev) {
      byText.set(r.text, r);
      continue;
    }
    const prevSpan = prev.source_end - prev.source_start;
    const span = r.source_end - r.source_start;
    if (
      span < prevSpan ||
      (span === prevSpan && r.kind === "source" && prev.kind !== "source")
    ) {
      byText.set(r.text, r);
    }
  }
  const deduped = [...byText.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const hits: SemanticHit[] = deduped.map((r) => ({
    kind: r.kind,
    doc_id: r.doc_id,
    line: r.source_start,
    source_lines: `${r.source_start}-${r.source_end}`,
    source_start: r.source_start,
    source_end: r.source_end,
    snippet: r.text.length > 240 ? r.text.slice(0, 237) + "..." : r.text,
    context: r.text,
    score: Number(r.score),
    token_estimate: r.token_estimate,
  }));

  return { query: q, hits, model: MODEL };
}
