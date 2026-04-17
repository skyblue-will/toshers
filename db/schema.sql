-- toshers — semantic search schema
-- Run once against your Neon database (e.g. `npm run db:migrate`).
-- Idempotent: safe to re-run.

create extension if not exists vector;

create table if not exists chunks (
  id              bigserial primary key,
  kind            text not null check (kind in ('source','chapter','character')),
  doc_id          text,                       -- chapter/character id; null for raw source
  chunk_index     int  not null,              -- ordinal within doc
  source_start    int  not null,              -- 1-indexed line in source.txt
  source_end      int  not null,
  text            text not null,
  token_estimate  int  not null,
  content_hash    text not null,              -- sha256(text)
  embedding       vector(1536) not null,
  model           text not null,              -- e.g. 'openai/text-embedding-3-small@1536'
  indexed_at      timestamptz not null default now()
);

create index if not exists chunks_embedding_hnsw
  on chunks using hnsw (embedding vector_cosine_ops);

create index if not exists chunks_kind_doc on chunks (kind, doc_id);

create unique index if not exists chunks_dedupe
  on chunks (kind, coalesce(doc_id, ''), chunk_index);
