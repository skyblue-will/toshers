import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  getCharacter,
  getChapter,
  getMasterIndex,
  getSourceLines,
  listChapters,
  listCharacters,
  search,
} from "@/lib/content";
import { semanticSearch } from "@/lib/semantic";
import {
  getGlossaryTerm,
  listGlossary,
  listIllustrations,
  listLocations,
  listQuiz,
  listQuotes,
  listRelationships,
} from "@/lib/data";
import { voiceProfile } from "@/lib/voice";
import { normalizePrice } from "@/lib/prices";

export const runtime = "nodejs";
export const maxDuration = 300;

const handler = createMcpHandler(
  (server) => {
    // Server identification.
    // (mcp-handler exposes name/version via the constructor in newer releases;
    // falls back gracefully in older ones.)
    server.tool(
      "get_index",
      "Returns the full master catalogue: source metadata, all chapter summaries, all character summaries, and the API surface. Call this first when you land in a fresh session — it gives you everything you need to navigate without further exploration.",
      {},
      async () => ({
        content: [
          { type: "text", text: JSON.stringify(getMasterIndex(), null, 2) },
        ],
      }),
    );

    server.tool(
      "list_chapters",
      "List all 11 chapters with title, hook, and source line range. Lightweight — does not load chapter bodies.",
      {},
      async () => ({
        content: [
          { type: "text", text: JSON.stringify(listChapters(), null, 2) },
        ],
      }),
    );

    server.tool(
      "get_chapter",
      "Fetch one chapter file by id (e.g. '07-sewer-hunters-toshers'). Returns the YAML frontmatter (parsed) plus the verbatim Mayhew text body. Use list_chapters or get_index first to find the right id.",
      { id: z.string().describe("Chapter id, e.g. '07-sewer-hunters-toshers'") },
      async ({ id }) => {
        const c = getChapter(id);
        if (!c) {
          return {
            content: [
              { type: "text", text: `Chapter not found: ${id}. Call list_chapters to see available ids.` },
            ],
            isError: true,
          };
        }
        const meta = c.meta as Record<string, unknown>;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  id,
                  url: `/api/chapters/${id}`,
                  source_lines: meta.source_lines ? String(meta.source_lines) : null,
                  meta,
                  body: c.body,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "list_characters",
      "List all 11 first-person testimonies and character scenes with label, occupation, age, origin, key facts, and game hooks. Lightweight — does not load full testimony bodies.",
      {},
      async () => ({
        content: [
          { type: "text", text: JSON.stringify(listCharacters(), null, 2) },
        ],
      }),
    );

    server.tool(
      "get_character",
      "Fetch one character testimony file by id (e.g. '06-cuckolds-point-tosher'). Returns parsed frontmatter plus the verbatim Mayhew framing and direct testimony.",
      {
        id: z
          .string()
          .describe("Character id, e.g. '06-cuckolds-point-tosher' or '09-jc-coalwhipper-son-mud-lark'"),
      },
      async ({ id }) => {
        const c = getCharacter(id);
        if (!c) {
          return {
            content: [
              { type: "text", text: `Character not found: ${id}. Call list_characters to see available ids.` },
            ],
            isError: true,
          };
        }
        const meta = c.meta as Record<string, unknown>;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  id,
                  url: `/api/characters/${id}`,
                  source_lines: meta.source_lines ? String(meta.source_lines) : null,
                  meta,
                  body: c.body,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "search",
      "Case-insensitive SUBSTRING search across the verbatim source.txt. Use this for EXACT-MATCH queries: place names ('Bermondsey'), slang ('tosh', 'brieze'), institutions ('workhouse'), numbers, quoted phrases. Returns line numbers, the matching line, and surrounding context. For concept-based queries (e.g. 'physical disability', 'fear of authority', 'children working at night'), use `semantic_search` instead.",
      {
        query: z.string().describe("Search term"),
        limit: z.number().int().positive().max(50).optional().describe("Max hits to return (default 10, max 50)"),
        context: z.number().int().min(0).max(10).optional().describe("Lines of context before and after each hit (default 2, max 10)"),
      },
      async ({ query, limit = 10, context = 2 }) => ({
        content: [
          { type: "text", text: JSON.stringify(search(query, limit, context), null, 2) },
        ],
      }),
    );

    server.tool(
      "semantic_search",
      "Meaning-based (embedding) search across Mayhew's corpus. Use when you want passages by CONCEPT rather than exact wording — Mayhew often describes things without using the modern word for them (e.g. 'physical disability' returns his descriptions of the paralysed waterman, the lame grubber, the one-armed sifter, even though he never uses the word 'disability'). Returns ranked hits with source.txt line citations in the same shape as `search`, plus a `score` field (0–1, higher is more similar). The `kind` filter lets you restrict hits to the raw source, chapter summaries, or character testimonies. Use `search` for exact-match queries.",
      {
        query: z.string().describe("Natural-language query. Full phrases work better than single keywords."),
        limit: z.number().int().positive().max(50).optional().describe("Max hits (default 10, max 50)"),
        kind: z
          .enum(["source", "chapter", "character"])
          .optional()
          .describe("Restrict to a single kind of document. Default: search all."),
      },
      async ({ query, limit = 10, kind }) => {
        try {
          const result = await semanticSearch(query, limit, kind);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return {
            content: [
              {
                type: "text",
                text: `Semantic search failed: ${msg}\n\nFallback: use the \`search\` tool for substring matching.`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    server.tool(
      "list_glossary",
      "Canonical glossary of Victorian street-trade slang from the Mayhew extract — 'tosh', 'pure', 'bunters', 'brieze', 'chiffoniers', etc. Each entry has term, part of speech, definition, the chapter it lives in, and source.txt line citations. Use this instead of guessing what period slang means.",
      {},
      async () => ({
        content: [{ type: "text", text: JSON.stringify(listGlossary(), null, 2) }],
      }),
    );

    server.tool(
      "get_glossary_term",
      "Fetch one glossary entry by term (case-insensitive, e.g. 'tosh', 'brieze'). Returns definition + chapter + source.txt line citations.",
      { term: z.string().describe("Glossary term, e.g. 'tosh'") },
      async ({ term }) => {
        const entry = getGlossaryTerm(term);
        if (!entry) {
          return {
            content: [
              {
                type: "text",
                text: `Glossary term not found: ${term}. Call list_glossary to see all available terms.`,
              },
            ],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(entry, null, 2) }],
        };
      },
    );

    server.tool(
      "list_locations",
      "Structured London geography of the Mayhew extract — Cuckold's Point, Bermondsey tanyards, Petticoat Lane, Hyde Park fire-rubbish ground, etc. Each location has modern lat/lng coords (WGS84), a 1851 description, chapter + character cross-refs, and source.txt line citations. Use for map pins, route visualisations, or geographic queries.",
      {},
      async () => ({
        content: [{ type: "text", text: JSON.stringify(listLocations(), null, 2) }],
      }),
    );

    server.tool(
      "list_relationships",
      "Cross-reference graph — edges between canonical character voices and the people/institutions they mention (Long J—— the tosher's rival; Sall the dustman's partner; Bradbury & Evans the printers; Mr Brown the missing-heir pure-finder). Use for dramatis personae, NPC scaffolding, or relationship visualisations.",
      {},
      async () => ({
        content: [{ type: "text", text: JSON.stringify(listRelationships(), null, 2) }],
      }),
    );

    server.tool(
      "voice_profile",
      "Returns a voice-casting/TTS profile for a character: gender, age_band, dialect_level (standard|moderate|heavy), accent_hint, and speech_notes (characteristic spellings and cant words Mayhew preserves). Derived from the character's frontmatter plus per-character curation. Use for picking a narration voice or priming a stylised dialogue generator.",
      {
        id: z
          .string()
          .describe("Character id, e.g. '06-cuckolds-point-tosher'"),
      },
      async ({ id }) => {
        const profile = voiceProfile(id);
        if (!profile) {
          return {
            content: [
              {
                type: "text",
                text: `Character not found: ${id}. Call list_characters to see available ids.`,
              },
            ],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
        };
      },
    );

    server.tool(
      "normalize_price",
      "Converts a pre-decimal British amount (£/s/d — pounds, shillings, pence) into decimal 1851 pounds and an approximate modern-GBP purchasing-power equivalent via the Bank of England CPI 1851→2024 inflator. Use this whenever Mayhew quotes a price or wage — e.g. `normalize_price({pounds: 3, shillings: 5})` for the tosher's Bishop Bonner's-fields haul. Returned `basis` field names the conversion source.",
      {
        pounds: z.number().min(0).optional().describe("Pounds (£). Default 0."),
        shillings: z.number().min(0).optional().describe("Shillings (s). 20 per pound. Default 0."),
        pence: z.number().min(0).optional().describe("Pence (d). 12 per shilling. Default 0."),
      },
      async ({ pounds, shillings, pence }) => {
        try {
          const result = normalizePrice({ pounds, shillings, pence });
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return {
            content: [{ type: "text", text: `normalize_price failed: ${msg}` }],
            isError: true,
          };
        }
      },
    );

    server.tool(
      "list_quotes",
      "Canonical pulled-quotes from the Mayhew extract — verbatim text plus speaker_id, dialect_level (standard|moderate|heavy), theme, and a tts_normalized rendition for narration engines that struggle with 19th-century phonetic spellings. Filter by speaker_id, chapter_ref, theme, or dialect_level. Use for headline cards, quote-of-the-day panels, TTS audio, or fact-checking a rendered snippet.",
      {
        speaker_id: z.string().optional().describe("Character id, e.g. '06-cuckolds-point-tosher' or 'mayhew' for the narrator"),
        chapter_ref: z.string().optional().describe("Chapter id to filter by"),
        theme: z.string().optional().describe("Theme tag: philosophy, hazard, technique, relationship, economy, etc."),
        dialect_level: z.enum(["standard", "moderate", "heavy"]).optional().describe("Dialect density filter"),
      },
      async (args) => ({
        content: [{ type: "text", text: JSON.stringify(listQuotes(args), null, 2) }],
      }),
    );

    server.tool(
      "list_illustrations",
      "Original 1861 woodcut plates from Mayhew's Vol. II, engraved from Richard Beard daguerreotypes — bone-grubber, mud-lark, sewer-hunter, dust-yard, rat-catcher, nightmen, etc. Each entry has display and high-res image URLs (Project Gutenberg, public domain), caption, chapter + character refs. Use for map-marker artwork, card illustrations, or citation-backed visual research.",
      {},
      async () => ({
        content: [{ type: "text", text: JSON.stringify(listIllustrations(), null, 2) }],
      }),
    );

    server.tool(
      "list_quiz",
      "Canonical fact-check triples from the Mayhew extract — question, answer, and source.txt line citation. Filter by chapter_ref or difficulty (easy|medium|hard). Use for quiz features or answer-validation when a consumer agent has generated an assertion about the text.",
      {
        chapter_ref: z.string().optional().describe("Chapter id to filter by"),
        difficulty: z.enum(["easy", "medium", "hard"]).optional().describe("Difficulty filter"),
      },
      async (args) => ({
        content: [{ type: "text", text: JSON.stringify(listQuiz(args), null, 2) }],
      }),
    );

    server.tool(
      "get_source_lines",
      "Fetch a verbatim slice from source.txt by line range. Useful for quoting Mayhew with exact citations. Capped at 500 lines per call. Returns clamped start/end and the raw text.",
      {
        start: z.number().int().positive().describe("First line (1-indexed, inclusive)"),
        end: z.number().int().positive().describe("Last line (inclusive). Will be clamped to start+499 if larger."),
      },
      async ({ start, end }) => ({
        content: [
          { type: "text", text: JSON.stringify(getSourceLines(start, end), null, 2) },
        ],
      }),
    );

    // ---------- Prompts — opinionated starting points for common synthesis tasks ----------

    server.prompt(
      "summarise_character_for_kids",
      "Return a kid-safe (age 10+) summary of one character's life and trade, drawing only on their testimony file. No harm details (rat-eating, child death, alcoholism) beyond a gentle mention; keep tone curious and historical.",
      { character_id: z.string().describe("Character id, e.g. '06-cuckolds-point-tosher'") },
      async ({ character_id }) => ({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Call get_character("${character_id}") to read the source testimony. Then write a 150-200-word summary suitable for a ten-year-old reader: (1) what this person did for work; (2) where and when they lived; (3) one memorable detail from their own words; (4) what their life tells us about Victorian London. Use plain modern English. Keep quotes short and normalise heavy dialect via voice_profile if needed. Do not invent facts beyond the source.`,
            },
          },
        ],
      }),
    );

    server.prompt(
      "narrate_character_in_voice",
      "Produce a first-person monologue in the character's own voice and dialect, drawn from their testimony — suitable as copy for an audio narration or dramatic reading.",
      {
        character_id: z.string().describe("Character id, e.g. '06-cuckolds-point-tosher'"),
        length: z.enum(["short", "medium", "long"]).optional().describe("Target length: short ~100 words, medium ~250, long ~500. Default medium."),
      },
      async ({ character_id, length }) => ({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Call get_character("${character_id}") to load the testimony and voice_profile("${character_id}") to pick up dialect hints. Then write a first-person monologue (${length ?? "medium"} length) in this character's own voice — preserving dialect_level and characteristic spellings per their voice_profile. Draw only on claims in their file; do not invent biography. End with one line from their testimony verbatim, cited as source.txt:start-end.`,
            },
          },
        ],
      }),
    );

    server.prompt(
      "find_passages_on",
      "Given a topic, return the best 3-5 passages across the whole corpus — via substring + semantic search, ranked and cited.",
      { topic: z.string().describe("Topic or concept, e.g. 'fear of authority' or 'tide'") },
      async ({ topic }) => ({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `For the topic "${topic}", call BOTH search("${topic}") for exact-match and semantic_search("${topic}", 5) for concept-match. Merge the results, dedupe by source_lines overlap, and return the top 3-5 passages ranked by relevance. For each: quote 1-2 sentences verbatim, cite source.txt:start-end, and add one sentence of why it's relevant. Do not paraphrase the quotes.`,
            },
          },
        ],
      }),
    );

    server.prompt(
      "map_tour",
      "Generate a walking tour of a character's beat as a sequence of map stops with descriptions and citations — suitable input for a mapping UI.",
      { character_id: z.string().describe("Character id, e.g. '03-pure-finder-widow' or '06-cuckolds-point-tosher'") },
      async ({ character_id }) => ({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Call get_character("${character_id}") and list_locations(). Assemble the character's working beat as an ordered list of stops. For each stop include: location_id, name, coords (from list_locations), one-sentence description of what happens here per this character's testimony, and a source_lines citation. Return as JSON array ready to drop into a map UI. If the character references a location not in list_locations, include it with coords: null and flag it.`,
            },
          },
        ],
      }),
    );

    server.prompt(
      "quiz_on",
      "Return 3 fact-check quiz items on a chapter or topic, drawn from list_quiz() plus fresh items grounded in the source.",
      {
        chapter_ref: z.string().optional().describe("Optional chapter id"),
        difficulty: z.enum(["easy", "medium", "hard"]).optional().describe("Optional difficulty"),
      },
      async ({ chapter_ref, difficulty }) => ({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Call list_quiz(${JSON.stringify({ chapter_ref, difficulty })}) to get the canonical triples. Pick 3; if the filters yield fewer than 3, generate additional items by calling get_chapter or search for a concrete fact and writing a Q/A/citation triple in the same shape. Return 3 items total as JSON [{question, answer, citation: {file, source_lines}}]. Every answer must be directly verifiable in source.txt via the citation.`,
            },
          },
        ],
      }),
    );
  },
  {
    serverInfo: {
      name: "toshers",
      version: "0.1.0",
    },
  },
  { basePath: "/api" },
);

export { handler as GET, handler as POST, handler as DELETE };
