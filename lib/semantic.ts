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

  const sql = db();
  // Note: neon(...)`...${x}...` uses parameterised queries; we inline ::vector casting.
  const rows = (await sql`
    select id, kind, doc_id, source_start, source_end, text, token_estimate,
           1 - (embedding <=> ${literal}::vector) as score
    from chunks
    where (${kind ?? null}::text is null or kind = ${kind ?? null}::text)
    order by embedding <=> ${literal}::vector
    limit ${limit}
  `) as Row[];

  const hits: SemanticHit[] = rows.map((r) => ({
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
