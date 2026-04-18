import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();

// Load source.txt once at module init and split into lines so we can address
// any line range without re-parsing.
const SOURCE_PATH = path.join(ROOT, "source.txt");
const SOURCE_RAW = fs.readFileSync(SOURCE_PATH, "utf8");
const SOURCE_LINES = SOURCE_RAW.split("\n");

const PACKAGE_JSON = JSON.parse(
  fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
) as { version?: string };

const CHAPTER_DIR = path.join(ROOT, "source");
const CHARACTER_DIR = path.join(ROOT, "characters");

export type ChapterMeta = {
  id: string;
  url: string;
  chapter: string;
  title: string;
  source_lines: string;
  hook: string;
  file: string;
};

export type CharacterMeta = {
  id: string;
  url: string;
  label: string;
  occupation?: string;
  chapter?: string;
  source_lines: string;
  anonymity?: string;
  voice_type?: string;
  age_stated?: string;
  origin?: string;
  dialect_level?: string;
  speech_notes?: string;
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
    url: `/api/chapters/${c.id}`,
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
      url: `/api/characters/${c.id}`,
      label: String(m.label ?? ""),
      occupation: m.occupation ? String(m.occupation) : undefined,
      chapter: m.chapter ? String(m.chapter) : undefined,
      source_lines: String(m.source_lines ?? ""),
      anonymity: m.anonymity ? String(m.anonymity) : undefined,
      voice_type: m.voice_type ? String(m.voice_type) : undefined,
      age_stated: m.age_stated ? String(m.age_stated) : undefined,
      origin: m.origin ? String(m.origin) : undefined,
      dialect_level: m.dialect_level ? String(m.dialect_level) : undefined,
      speech_notes: m.speech_notes ? String(m.speech_notes) : undefined,
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

export type IndexDepth = "shallow" | "full";

// Shallow index ≈ 2kb, full index ≈ 16kb. Shallow drops INDEX.md contents,
// game_hooks / key_facts metadata on each character, and per-chapter
// frontmatter detail — it returns only the tuples needed to resolve further
// calls. Use it when the consumer wants titles and ids, not dossiers.
function shallowChapterMeta(c: ChapterMeta) {
  return { id: c.id, title: c.title, hook: c.hook, source_lines: c.source_lines };
}
function shallowCharacterMeta(c: CharacterMeta) {
  return {
    id: c.id,
    label: c.label,
    occupation: c.occupation,
    age_stated: c.age_stated,
    dialect_level: c.dialect_level,
  };
}

export function getMasterIndex(depth: IndexDepth = "full") {
  const base = {
    version: PACKAGE_JSON.version ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    depth,
    source: {
      file: "source.txt",
      total_lines: SOURCE_LINES.length,
      total_words: SOURCE_RAW.split(/\s+/).filter(Boolean).length,
      description:
        "Henry Mayhew, London Labour and the London Poor, Vol. II (1851) — extract on London street-finders and street-collectors.",
    },
    id_scheme: {
      chapters:
        "Two-digit prefix tracks chapter order in the 1861 Vol. II extract (01–11). Matches source/INDEX.md.",
      characters:
        "Two-digit prefix tracks character-catalogue order (01–11), NOT the chapter the voice appears in — e.g. 06-cuckolds-point-tosher is in chapter 07. `mayhew` is unnumbered because he is the narrator of the whole extract, not a testimony subject.",
    },
  };

  if (depth === "shallow") {
    return {
      ...base,
      chapters: listChapters().map(shallowChapterMeta),
      characters: listCharacters().map(shallowCharacterMeta),
      api: {
        docs: "/",
        mcp_endpoint: "/api/mcp",
        hint: "Call get_index with depth='full' for chapter/character frontmatter, INDEX.md contents, and the full REST surface map.",
      },
    };
  }

  return {
    ...base,
    chapters: listChapters(),
    characters: listCharacters(),
    indexes: {
      source: CHAPTER_INDEX_RAW,
      characters: CHARACTER_INDEX_RAW,
    },
    api: {
      docs: "/",
      mcp_endpoint: "/api/mcp",
      cors: "Access-Control-Allow-Origin: * on all /api/** routes; safe to fetch from any browser origin.",
      rest: {
        master_index: "/api/index (?depth=shallow for a lean ~2kb variant)",
        openapi: "/api/openapi.json",
        chapters_list: "/api/chapters",
        chapter: "/api/chapters/{id} (?profile=minimal|facts|full)",
        chapter_annotated: "/api/chapters/{id}/annotated",
        characters_list: "/api/characters",
        character: "/api/characters/{id} (?profile=minimal|facts|full)",
        character_annotated: "/api/characters/{id}/annotated",
        character_voice: "/api/characters/{id}/voice",
        glossary_list: "/api/glossary",
        glossary_term: "/api/glossary/{term}",
        locations_list: "/api/locations",
        relationships_list: "/api/relationships",
        relationships_mentions: "/api/relationships/mentions?q={name}",
        quotes_list: "/api/quotes?speaker_id={id}&chapter_ref={id}&theme={t}&dialect_level={heavy|moderate|standard}",
        illustrations_list: "/api/illustrations",
        quiz_list: "/api/quiz?chapter_ref={id}&difficulty={easy|medium|hard}",
        price_normalize: "/api/prices/normalize?pounds={n}&shillings={n}&pence={n} (or ?literal=£3+5s+6d)",
        search: "/api/search?q={query}&limit={n}",
        semantic_search: "/api/search/semantic?q={query}&limit={n}&kind={source|chapter|character}",
        source_lines: "/api/source?start={n}&end={m}",
      },
    },
  };
}

// Apply a `profile` filter to a character/chapter meta record. Strips the
// heaviest interpretive fields when callers only want facts.
export type Profile = "minimal" | "facts" | "full";

export function applyProfile(
  meta: Record<string, unknown>,
  profile: Profile,
): Record<string, unknown> {
  if (profile === "full") return meta;
  const out: Record<string, unknown> = {};
  const keep =
    profile === "minimal"
      ? new Set(["id", "label", "title", "occupation", "chapter", "source_lines", "hook", "age_stated", "origin", "dialect_level"])
      : // "facts" = everything except game_hooks
        null;
  for (const [k, v] of Object.entries(meta)) {
    if (profile === "facts" && k === "game_hooks") continue;
    if (profile === "minimal" && keep && !keep.has(k)) continue;
    out[k] = v;
  }
  return out;
}
