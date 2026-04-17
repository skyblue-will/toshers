/**
 * Indexer: chunk source.txt + chapter & character markdown bodies,
 * embed via Vercel AI Gateway (openai/text-embedding-3-small, 1536-d),
 * upsert into Neon `chunks` table.
 *
 * Idempotent: each chunk carries a SHA-256 content hash and a stable
 * (kind, doc_id, chunk_index) identity. Unchanged chunks skip the
 * embedding API call entirely.
 *
 * Usage:
 *   npm run index            — incremental (skip unchanged chunks)
 *   npm run index:rebuild    — TRUNCATE first, then reindex everything
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";
import matter from "gray-matter";
import { embedMany } from "ai";

// ---------- Config ----------

const MODEL = "openai/text-embedding-3-small"; // routed via Vercel AI Gateway
const MODEL_TAG = `${MODEL}@1536`;
const EMBED_BATCH = 96;
const TARGET_TOKENS = 400;
const OVERLAP_TOKENS = 60;
const MIN_TOKENS = 80;
const MAX_TOKENS = 600;
const COST_PER_M_TOKENS_USD = 0.02; // openai text-embedding-3-small

// Token estimate: 1 token ≈ 4 chars for English prose.
const tokens = (s: string) => Math.ceil(s.length / 4);

// ---------- Types ----------

type Kind = "source" | "chapter" | "character";

type Chunk = {
  kind: Kind;
  doc_id: string | null;
  chunk_index: number;
  source_start: number;
  source_end: number;
  text: string;
  token_estimate: number;
  content_hash: string;
};

type Paragraph = {
  text: string;
  source_start: number; // line number in source.txt (or chapter file)
  source_end: number;
};

// ---------- Chunking ----------

/**
 * Group consecutive non-empty lines into paragraphs.
 * Returns paragraphs with line ranges from the input file.
 */
function paragraphsFromLines(lines: string[], lineOffset = 0): Paragraph[] {
  const out: Paragraph[] = [];
  let current: string[] = [];
  let currentStart = -1;

  const flush = (endLine: number) => {
    if (current.length === 0) return;
    out.push({
      text: current.join("\n").trim(),
      source_start: currentStart + lineOffset,
      source_end: endLine + lineOffset,
    });
    current = [];
    currentStart = -1;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") {
      flush(i); // i is 1-indexed when we add lineOffset properly
    } else {
      if (currentStart === -1) currentStart = i + 1; // 1-indexed
      current.push(line);
    }
  }
  flush(lines.length);
  return out.filter((p) => p.text.length > 0);
}

/**
 * Pack paragraphs into chunks of ~TARGET_TOKENS with OVERLAP_TOKENS overlap.
 * Tiny paragraphs (< MIN_TOKENS) merge forward; huge ones split at sentence boundary.
 */
function packChunks(
  paragraphs: Paragraph[],
  meta: { kind: Kind; doc_id: string | null; sourceLineFallback?: [number, number] },
): Chunk[] {
  // First, pre-split any oversized paragraphs at sentence boundaries.
  const split: Paragraph[] = [];
  for (const p of paragraphs) {
    if (tokens(p.text) <= MAX_TOKENS) {
      split.push(p);
      continue;
    }
    const sentences = p.text.split(/(?<=[.!?])\s+/);
    let buf: string[] = [];
    for (const s of sentences) {
      buf.push(s);
      if (tokens(buf.join(" ")) >= TARGET_TOKENS) {
        split.push({ text: buf.join(" "), source_start: p.source_start, source_end: p.source_end });
        buf = [];
      }
    }
    if (buf.length > 0) {
      split.push({ text: buf.join(" "), source_start: p.source_start, source_end: p.source_end });
    }
  }

  // Now pack into chunks with overlap.
  const out: Chunk[] = [];
  let buf: Paragraph[] = [];
  let lastChunkTail: Paragraph | undefined;
  let chunkIndex = 0;

  const emit = () => {
    if (buf.length === 0) return;
    const text = buf.map((p) => p.text).join("\n\n").trim();
    if (text.length === 0) return;
    const start = meta.sourceLineFallback?.[0] ?? buf[0].source_start;
    const end = meta.sourceLineFallback?.[1] ?? buf[buf.length - 1].source_end;
    out.push({
      kind: meta.kind,
      doc_id: meta.doc_id,
      chunk_index: chunkIndex++,
      source_start: start,
      source_end: end,
      text,
      token_estimate: tokens(text),
      content_hash: crypto.createHash("sha256").update(text).digest("hex"),
    });
    lastChunkTail = buf[buf.length - 1];
    buf = [];
  };

  for (const p of split) {
    if (buf.length === 0) {
      const tail: Paragraph | undefined = lastChunkTail;
      if (tail && tokens(tail.text) <= OVERLAP_TOKENS * 2) {
        buf.push(tail); // overlap echo
      }
    }
    buf.push(p);
    const total = tokens(buf.map((x) => x.text).join("\n\n"));
    if (total >= TARGET_TOKENS) emit();
  }
  // Final flush — but only if it's substantive.
  if (buf.length > 0) {
    const total = tokens(buf.map((x) => x.text).join("\n\n"));
    if (total >= MIN_TOKENS || out.length === 0) emit();
    else if (out.length > 0) {
      // Tail merge: append the leftovers to the previous chunk.
      const tail = buf.map((x) => x.text).join("\n\n");
      const prev = out[out.length - 1];
      const merged = `${prev.text}\n\n${tail}`;
      prev.text = merged;
      prev.token_estimate = tokens(merged);
      prev.content_hash = crypto.createHash("sha256").update(merged).digest("hex");
      const last = buf[buf.length - 1];
      prev.source_end = meta.sourceLineFallback?.[1] ?? last.source_end;
    }
  }
  return out;
}

// ---------- Source loaders ----------

const ROOT = process.cwd();

function loadSourceChunks(): Chunk[] {
  const text = fs.readFileSync(path.join(ROOT, "source.txt"), "utf8");
  const lines = text.split(/\r?\n/);
  const paras = paragraphsFromLines(lines, 0);
  return packChunks(paras, { kind: "source", doc_id: null });
}

function loadDocChunks(dir: string, kind: "chapter" | "character"): Chunk[] {
  const files = fs
    .readdirSync(path.join(ROOT, dir))
    .filter((f) => f.endsWith(".md") && f !== "INDEX.md")
    .sort();

  const chunks: Chunk[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(ROOT, dir, file), "utf8");
    const parsed = matter(raw);
    const id = file.replace(/\.md$/, "");
    const sourceLines = String(parsed.data.source_lines ?? "");
    const m = sourceLines.match(/(\d+)\D+(\d+)/);
    const fallback: [number, number] | undefined = m
      ? [Number(m[1]), Number(m[2])]
      : undefined;

    const body = parsed.content.replace(/\r/g, "");
    const lines = body.split("\n");
    const paras = paragraphsFromLines(lines, 0);
    const packed = packChunks(paras, {
      kind,
      doc_id: id,
      sourceLineFallback: fallback,
    });
    chunks.push(...packed);
  }
  return chunks;
}

// ---------- Embedding ----------

async function embedBatch(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: MODEL,
    values: texts,
  });
  return embeddings;
}

// ---------- Main ----------

async function main() {
  const rebuild = process.argv.includes("--rebuild");
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Run `vercel env pull .env.local`.");
    process.exit(1);
  }
  if (!process.env.AI_GATEWAY_API_KEY) {
    console.error(
      "AI_GATEWAY_API_KEY is not set. Generate one at https://vercel.com/dashboard/ai-gateway then re-run `vercel env pull .env.local`.",
    );
    process.exit(1);
  }

  const sql = neon(url);

  // 1. Build all chunks in memory.
  console.log("Chunking corpus…");
  const sourceChunks = loadSourceChunks();
  const chapterChunks = loadDocChunks("source", "chapter");
  const characterChunks = loadDocChunks("characters", "character");
  const all = [...sourceChunks, ...chapterChunks, ...characterChunks];
  console.log(
    `  source: ${sourceChunks.length} chunks · chapters: ${chapterChunks.length} · characters: ${characterChunks.length} · total: ${all.length}`,
  );
  const totalTokens = all.reduce((acc, c) => acc + c.token_estimate, 0);
  console.log(`  ~${totalTokens.toLocaleString()} tokens total`);

  // 2. Optionally nuke the table.
  if (rebuild) {
    console.log("Rebuild requested — TRUNCATE chunks");
    await sql`truncate chunks restart identity`;
  }

  // 3. Diff against existing rows.
  const existingRows = (await sql`
    select kind, coalesce(doc_id,'') as doc_id, chunk_index, content_hash
    from chunks
  `) as { kind: string; doc_id: string; chunk_index: number; content_hash: string }[];

  const existing = new Map<string, string>();
  for (const r of existingRows) {
    existing.set(`${r.kind}::${r.doc_id}::${r.chunk_index}`, r.content_hash);
  }

  const toEmbed: Chunk[] = [];
  let skipped = 0;
  for (const c of all) {
    const key = `${c.kind}::${c.doc_id ?? ""}::${c.chunk_index}`;
    if (existing.get(key) === c.content_hash) skipped++;
    else toEmbed.push(c);
  }
  console.log(
    `Diff: ${toEmbed.length} chunks need (re)embedding · ${skipped} unchanged`,
  );

  if (toEmbed.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  // 4. Embed in batches.
  const embedTokens = toEmbed.reduce((acc, c) => acc + c.token_estimate, 0);
  const cost = (embedTokens / 1_000_000) * COST_PER_M_TOKENS_USD;
  console.log(
    `Embedding ${toEmbed.length} chunks (~${embedTokens.toLocaleString()} tokens, ~$${cost.toFixed(4)})`,
  );

  const t0 = Date.now();
  for (let i = 0; i < toEmbed.length; i += EMBED_BATCH) {
    const batch = toEmbed.slice(i, i + EMBED_BATCH);
    const vectors = await embedBatch(batch.map((c) => c.text));
    for (let j = 0; j < batch.length; j++) {
      const c = batch[j];
      const v = vectors[j];
      const literal = `[${v.join(",")}]`;
      await sql`
        insert into chunks (kind, doc_id, chunk_index, source_start, source_end,
                            text, token_estimate, content_hash, embedding, model)
        values (${c.kind}, ${c.doc_id}, ${c.chunk_index}, ${c.source_start}, ${c.source_end},
                ${c.text}, ${c.token_estimate}, ${c.content_hash}, ${literal}::vector, ${MODEL_TAG})
        on conflict (kind, coalesce(doc_id,''), chunk_index) do update
          set source_start = excluded.source_start,
              source_end   = excluded.source_end,
              text         = excluded.text,
              token_estimate = excluded.token_estimate,
              content_hash = excluded.content_hash,
              embedding    = excluded.embedding,
              model        = excluded.model,
              indexed_at   = now()
      `;
    }
    process.stdout.write(`  batch ${i / EMBED_BATCH + 1} (${batch.length} chunks) done\n`);
  }
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Done in ${elapsed}s.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
