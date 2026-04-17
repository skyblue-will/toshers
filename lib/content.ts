import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();

// Load source.txt once at module init and split into lines so we can address
// any line range without re-parsing.
const SOURCE_PATH = path.join(ROOT, "source.txt");
const SOURCE_RAW = fs.readFileSync(SOURCE_PATH, "utf8");
const SOURCE_LINES = SOURCE_RAW.split("\n");

const CHAPTER_DIR = path.join(ROOT, "source");
const CHARACTER_DIR = path.join(ROOT, "characters");

export type ChapterMeta = {
  id: string;
  chapter: string;
  title: string;
  source_lines: string;
  hook: string;
  file: string;
};

export type CharacterMeta = {
  id: string;
  label: string;
  occupation?: string;
  chapter?: string;
  source_lines: string;
  anonymity?: string;
  voice_type?: string;
  age_stated?: string;
  origin?: string;
  key_facts?: string[];
  game_hooks?: string[];
  file: string;
};

export type FullDocument = {
  meta: Record<string, unknown>;
  body: string;
  raw: string;
};

function loadDir(dir: string, kind: "chapter" | "character") {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "INDEX.md")
    .sort();

  return files.map((file) => {
    const full = fs.readFileSync(path.join(dir, file), "utf8");
    const parsed = matter(full);
    const id = file.replace(/\.md$/, "");
    return {
      id,
      file,
      meta: parsed.data,
      body: parsed.content,
      raw: full,
      kind,
    };
  });
}

const CHAPTERS = loadDir(CHAPTER_DIR, "chapter");
const CHARACTERS = loadDir(CHARACTER_DIR, "character");

const CHAPTER_INDEX_RAW = fs.readFileSync(
  path.join(CHAPTER_DIR, "INDEX.md"),
  "utf8",
);
const CHARACTER_INDEX_RAW = fs.readFileSync(
  path.join(CHARACTER_DIR, "INDEX.md"),
  "utf8",
);

export function listChapters(): ChapterMeta[] {
  return CHAPTERS.map((c) => ({
    id: c.id,
    chapter: String(c.meta.chapter ?? ""),
    title: String(c.meta.title ?? ""),
    source_lines: String(c.meta.source_lines ?? ""),
    hook: String(c.meta.hook ?? ""),
    file: c.file,
  }));
}

export function listCharacters(): CharacterMeta[] {
  return CHARACTERS.map((c) => {
    const m = c.meta as Record<string, unknown>;
    return {
      id: c.id,
      label: String(m.label ?? ""),
      occupation: m.occupation ? String(m.occupation) : undefined,
      chapter: m.chapter ? String(m.chapter) : undefined,
      source_lines: String(m.source_lines ?? ""),
      anonymity: m.anonymity ? String(m.anonymity) : undefined,
      voice_type: m.voice_type ? String(m.voice_type) : undefined,
      age_stated: m.age_stated ? String(m.age_stated) : undefined,
      origin: m.origin ? String(m.origin) : undefined,
      key_facts: Array.isArray(m.key_facts) ? (m.key_facts as string[]) : undefined,
      game_hooks: Array.isArray(m.game_hooks) ? (m.game_hooks as string[]) : undefined,
      file: c.file,
    };
  });
}

export function getChapter(id: string): FullDocument | null {
  const c = CHAPTERS.find((x) => x.id === id);
  if (!c) return null;
  return { meta: c.meta as Record<string, unknown>, body: c.body, raw: c.raw };
}

export function getCharacter(id: string): FullDocument | null {
  const c = CHARACTERS.find((x) => x.id === id);
  if (!c) return null;
  return { meta: c.meta as Record<string, unknown>, body: c.body, raw: c.raw };
}

export function getSourceLines(start: number, end: number): {
  start: number;
  end: number;
  text: string;
} {
  const total = SOURCE_LINES.length;
  const s = Math.max(1, Math.min(start, total));
  const e = Math.max(s, Math.min(end, total));
  // Cap at 500 lines to protect callers from accidentally fetching the whole file.
  const capped = Math.min(e, s + 499);
  return {
    start: s,
    end: capped,
    text: SOURCE_LINES.slice(s - 1, capped).join("\n"),
  };
}

export type SearchHit = {
  line: number;
  snippet: string;
  context_start: number;
  context_end: number;
  context: string;
};

export function search(
  query: string,
  limit = 10,
  contextLines = 2,
): { query: string; hits: SearchHit[]; total_matches: number } {
  const q = query.trim();
  if (!q) return { query, hits: [], total_matches: 0 };

  // Case-insensitive substring match. Cheap, effective for 4.5k lines.
  const needle = q.toLowerCase();
  const hits: SearchHit[] = [];
  let total = 0;

  for (let i = 0; i < SOURCE_LINES.length; i++) {
    const line = SOURCE_LINES[i];
    if (!line.toLowerCase().includes(needle)) continue;
    total++;
    if (hits.length >= limit) continue;

    const lineNum = i + 1;
    const cs = Math.max(1, lineNum - contextLines);
    const ce = Math.min(SOURCE_LINES.length, lineNum + contextLines);
    hits.push({
      line: lineNum,
      snippet: line.trim(),
      context_start: cs,
      context_end: ce,
      context: SOURCE_LINES.slice(cs - 1, ce).join("\n"),
    });
  }

  return { query: q, hits, total_matches: total };
}

export function getMasterIndex() {
  return {
    source: {
      file: "source.txt",
      total_lines: SOURCE_LINES.length,
      total_words: SOURCE_RAW.split(/\s+/).filter(Boolean).length,
      description:
        "Henry Mayhew, London Labour and the London Poor, Vol. II (1851) — extract on London street-finders and street-collectors.",
    },
    chapters: listChapters(),
    characters: listCharacters(),
    indexes: {
      source: CHAPTER_INDEX_RAW,
      characters: CHARACTER_INDEX_RAW,
    },
    api: {
      docs: "/",
      mcp_endpoint: "/api/mcp",
      rest: {
        master_index: "/api/index",
        chapters_list: "/api/chapters",
        chapter: "/api/chapters/{id}",
        characters_list: "/api/characters",
        character: "/api/characters/{id}",
        search: "/api/search?q={query}&limit={n}",
        source_lines: "/api/source?start={n}&end={m}",
      },
    },
  };
}
