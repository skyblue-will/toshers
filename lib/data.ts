import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");

function loadJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")) as T;
}

// ---------- Glossary ----------

export type GlossaryEntry = {
  term: string;
  pos: string;
  definition: string;
  chapter_ref: string;
  source_lines: [number, number];
  etymology: string | null;
};

export type Glossary = {
  version: number;
  description: string;
  entries: GlossaryEntry[];
};

const GLOSSARY: Glossary = loadJson<Glossary>("glossary.json");

export function listGlossary(): Glossary {
  return GLOSSARY;
}

export function getGlossaryTerm(term: string): GlossaryEntry | null {
  const needle = term.trim().toLowerCase();
  return (
    GLOSSARY.entries.find((e) => e.term.toLowerCase() === needle) ?? null
  );
}

// ---------- Locations ----------

export type LocationEntry = {
  id: string;
  name: string;
  coords: [number, number] | null;
  era: string;
  description: string;
  chapter_refs: string[];
  character_refs: string[];
  source_lines: [number, number] | null;
};

export type Locations = {
  version: number;
  description: string;
  entries: LocationEntry[];
};

const LOCATIONS: Locations = loadJson<Locations>("locations.json");

export function listLocations(): Locations {
  return LOCATIONS;
}

// ---------- Relationships ----------

export type RelationshipNode = {
  kind: "character" | "mentioned" | "location" | "institution";
  id?: string;
  label: string;
};

export type RelationshipEdge = {
  id: string;
  from: RelationshipNode;
  to: RelationshipNode;
  type: string;
  description: string;
  source_lines: [number, number] | null;
};

export type Relationships = {
  version: number;
  description: string;
  edges: RelationshipEdge[];
};

const RELATIONSHIPS: Relationships = loadJson<Relationships>("relationships.json");

export function listRelationships(): Relationships {
  return RELATIONSHIPS;
}

export type MentionHit = {
  edge: RelationshipEdge;
  matched_on: "to.id" | "to.label";
};

export function findMentionsOf(query: string): {
  query: string;
  hits: MentionHit[];
  total: number;
} {
  const q = query.trim().toLowerCase();
  if (!q) return { query, hits: [], total: 0 };

  const hits: MentionHit[] = [];
  for (const edge of RELATIONSHIPS.edges) {
    const toId = edge.to.id?.toLowerCase() ?? "";
    const toLabel = edge.to.label.toLowerCase();
    if (toId && toId.includes(q)) {
      hits.push({ edge, matched_on: "to.id" });
      continue;
    }
    if (toLabel.includes(q)) {
      hits.push({ edge, matched_on: "to.label" });
    }
  }
  return { query: q, hits, total: hits.length };
}

// ---------- Quotes ----------

export type QuoteEntry = {
  id: string;
  text: string;
  speaker_id: string;
  speaker_label: string;
  chapter_ref: string;
  source_lines: [number, number];
  dialect_level: "standard" | "moderate" | "heavy";
  theme: string;
  tts_normalized: string;
  context: string;
};

export type QuoteCoverage = {
  curated_count: number;
  total_curated: number;
  policy: string;
  exhaustive: boolean;
};

export type Quotes = {
  version: number;
  description: string;
  dialect_levels: Record<string, string>;
  entries: QuoteEntry[];
  coverage: QuoteCoverage;
};

const QUOTES_RAW: Omit<Quotes, "coverage"> = loadJson<Omit<Quotes, "coverage">>("quotes.json");

const QUOTE_POLICY =
  "Curated, NOT exhaustive. The entries are a hand-picked selection of quotable lines — ~21 quotes across ~47,000 words of source. Mayhew's corpus contains many hundreds of additional quotable lines that aren't in this list; when you need quotes beyond this selection, call get_source_lines or search directly against source.txt. `exhaustive: false` always — do not treat this as the complete set.";

function coverageFor(filtered: QuoteEntry[]): QuoteCoverage {
  return {
    curated_count: filtered.length,
    total_curated: QUOTES_RAW.entries.length,
    policy: QUOTE_POLICY,
    exhaustive: false,
  };
}

export function listQuotes(filter?: {
  speaker_id?: string;
  chapter_ref?: string;
  theme?: string;
  dialect_level?: string;
}): Quotes {
  let entries = QUOTES_RAW.entries;
  if (filter?.speaker_id) {
    entries = entries.filter((e) => e.speaker_id === filter.speaker_id);
  }
  if (filter?.chapter_ref) {
    entries = entries.filter((e) => e.chapter_ref === filter.chapter_ref);
  }
  if (filter?.theme) {
    entries = entries.filter((e) => e.theme === filter.theme);
  }
  if (filter?.dialect_level) {
    entries = entries.filter((e) => e.dialect_level === filter.dialect_level);
  }
  return { ...QUOTES_RAW, entries, coverage: coverageFor(entries) };
}

// ---------- Illustrations ----------

export type IllustrationEntry = {
  id: string;
  title: string;
  url: string;
  url_hires: string;
  caption: string;
  chapter_refs: string[];
  character_refs: string[];
  description: string;
};

export type Illustrations = {
  version: number;
  description: string;
  source_edition: string;
  attribution: string;
  digitised_by: string;
  entries: IllustrationEntry[];
};

const ILLUSTRATIONS: Illustrations = loadJson<Illustrations>("illustrations.json");

export function listIllustrations(): Illustrations {
  return ILLUSTRATIONS;
}

// ---------- Quiz ----------

export type QuizEntry = {
  id: string;
  question: string;
  answer: string;
  citation: { file: string; source_lines: [number, number] };
  difficulty: "easy" | "medium" | "hard";
  chapter_ref: string;
};

export type Quiz = {
  version: number;
  description: string;
  entries: QuizEntry[];
};

const QUIZ: Quiz = loadJson<Quiz>("quiz.json");

export function listQuiz(filter?: {
  chapter_ref?: string;
  difficulty?: string;
}): Quiz {
  let entries = QUIZ.entries;
  if (filter?.chapter_ref) {
    entries = entries.filter((e) => e.chapter_ref === filter.chapter_ref);
  }
  if (filter?.difficulty) {
    entries = entries.filter((e) => e.difficulty === filter.difficulty);
  }
  return { ...QUIZ, entries };
}
