/**
 * One-shot DB migration runner.
 * Applies db/schema.sql statement-by-statement via the Neon HTTP driver.
 * Idempotent — safe to re-run.
 *
 * Usage:  npm run db:migrate
 * Requires DATABASE_URL in env (run `vercel env pull .env.local` first).
 */
import { neon } from "@neondatabase/serverless";

const STATEMENTS = [
  `create extension if not exists vector`,

  `create table if not exists chunks (
     id              bigserial primary key,
     kind            text not null check (kind in ('source','chapter','character')),
     doc_id          text,
     chunk_index     int  not null,
     source_start    int  not null,
     source_end      int  not null,
     text            text not null,
     token_estimate  int  not null,
     content_hash    text not null,
     embedding       vector(1536) not null,
     model           text not null,
     indexed_at      timestamptz not null default now()
   )`,

  `create index if not exists chunks_embedding_hnsw
     on chunks using hnsw (embedding vector_cosine_ops)`,

  `create index if not exists chunks_kind_doc on chunks (kind, doc_id)`,

  `create unique index if not exists chunks_dedupe
     on chunks (kind, coalesce(doc_id, ''), chunk_index)`,
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Run `vercel env pull .env.local`.");
    process.exit(1);
  }

  const sql = neon(url);
  console.log(`Applying ${STATEMENTS.length} statement(s)`);
  for (const stmt of STATEMENTS) {
    const head = stmt.split("\n")[0].slice(0, 80);
    process.stdout.write(`  ${head} ... `);
    try {
      await sql.query(stmt);
      console.log("ok");
    } catch (e) {
      console.log("FAILED");
      console.error(e);
      process.exit(1);
    }
  }
  console.log("Migration complete.");
}

main();
