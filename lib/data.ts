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
