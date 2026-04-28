import { createMcpHandler } from "mcp-handler";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  applyProfile,
  getCharacter,
  getChapter,
  getMasterIndex,
  getPackageVersion,
  getSourceLines,
  getSourceRaw,
  listChapters,
  listCharacters,
  search,
  type Profile,
} from "@/lib/content";
import { semanticSearch } from "@/lib/semantic";
import {
  findMentionsOf,
  getGlossaryTerm,
  listGlossary,
  listIllustrations,
  listLocations,
  listQuiz,
  listQuotes,
  listRelationships,
} from "@/lib/data";
import { annotateBody } from "@/lib/annotate";
import { voiceProfile } from "@/lib/voice";
import { normalizePrice, parsePriceLiteral } from "@/lib/prices";

export const runtime = "nodejs";
export const maxDuration = 300;

const handler = createMcpHandler(
  (server) => {
    // Server identification.
    // (mcp-handler exposes name/version via the constructor in newer releases;
    // falls back gracefully in older ones.)
    server.tool(
      "get_index",
      "Master catalogue. Default depth='full' returns source metadata, all chapter summaries, all character summaries, the INDEX.md contents, and the full REST surface map (~16kb). Depth='shallow' returns just ids + titles/labels + the REST map (~2kb) — use it when you only need to resolve ids, not dossiers. Call this first when you land in a fresh session. (cost: cheap)",
      {
        depth: z
          .enum(["shallow", "full"])
          .optional()
          .describe("'shallow' (~2kb, ids+titles only) or 'full' (~16kb, full catalogue). Default: full."),
      },
      async ({ depth }) => ({
        content: [
          {
            type: "text",
            text: JSON.stringify(getMasterIndex(depth ?? "full"), null, 2),
          },
        ],
      }),
    );

    server.tool(
      "list_chapters",
      "List all 11 chapters with title, hook, and source line range. Lightweight — does not load chapter bodies. Two-digit prefix tracks chapter order (matches source/INDEX.md). (cost: cheap)",
      {},
      async () => ({
        content: [
          { type: "text", text: JSON.stringify(listChapters(), null, 2) },
        ],
      }),
    );

    server.tool(
      "get_chapter",
      "Fetch one chapter file by id (e.g. '07-sewer-hunters-toshers'). Returns the YAML frontmatter (parsed) plus the verbatim Mayhew text body. Use list_chapters or get_index first to find the right id. `profile` controls payload: 'minimal' (metadata only, no body), 'facts' (frontmatter minus game_hooks + body), 'full' (everything — default). (cost: cheap)",
      {
        id: z.string().describe("Chapter id, e.g. '07-sewer-hunters-toshers'"),
        profile: z
          .enum(["minimal", "facts", "full"])
          .optional()
          .describe("'minimal' = metadata only (no body); 'facts' = all frontmatter except game_hooks, plus body; 'full' = everything. Default: full."),
      },
      async ({ id, profile }) => {
        const c = getChapter(id);
        if (!c) {
          return {
            content: [
              { type: "text", text: `Chapter not found: ${id}. Call list_chapters to see available ids.` },
            ],
            isError: true,
          };
        }
        const resolved: Profile = profile ?? "full";
        const meta = applyProfile(c.meta as Record<string, unknown>, resolved);
        const sourceLines = (c.meta as Record<string, unknown>).source_lines;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  id,
                  url: `/api/chapters/${id}`,
                  profile: resolved,
                  source_lines: sourceLines ? String(sourceLines) : null,
                  meta,
                  body: resolved === "minimal" ? null : c.body,
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
      "List all character testimonies and character scenes with label, occupation, age, origin, key_facts and game_hooks. Lightweight — does not load full testimony bodies. Includes `mayhew` (unnumbered) as the narrator-dossier alongside the 11 numbered testimonies; the numeric prefix on testimony ids tracks catalogue order, NOT the chapter the voice appears in. (cost: cheap)",
      {},
      async () => ({
        content: [
          { type: "text", text: JSON.stringify(listCharacters(), null, 2) },
        ],
      }),
    );

    server.tool(
      "get_character",
      "Fetch one character testimony file by id (e.g. '06-cuckolds-point-tosher', or 'mayhew' for the narrator dossier). Returns parsed frontmatter plus the verbatim Mayhew framing and direct testimony. `profile` controls payload: 'minimal' (metadata only, no body), 'facts' (frontmatter minus game_hooks + body — drops the RPG-oriented interpretive layer), 'full' (everything — default). Use 'facts' when you want reusable factual data without the interpretive game-hooks block. (cost: cheap)",
      {
        id: z
          .string()
          .describe("Character id, e.g. '06-cuckolds-point-tosher', '09-jc-coalwhipper-son-mud-lark', or 'mayhew'"),
        profile: z
          .enum(["minimal", "facts", "full"])
          .optional()
          .describe("'minimal' = metadata only (no body); 'facts' = all frontmatter except game_hooks, plus body; 'full' = everything. Default: full."),
      },
      async ({ id, profile }) => {
        const c = getCharacter(id);
        if (!c) {
          return {
            content: [
              { type: "text", text: `Character not found: ${id}. Call list_characters to see available ids.` },
            ],
            isError: true,
          };
        }
        const resolved: Profile = profile ?? "full";
        const meta = applyProfile(c.meta as Record<string, unknown>, resolved);
        const sourceLines = (c.meta as Record<string, unknown>).source_lines;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  id,
                  url: `/api/characters/${id}`,
                  profile: resolved,
                  source_lines: sourceLines ? String(sourceLines) : null,
                  meta,
                  body: resolved === "minimal" ? null : c.body,
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
      "get_character_annotated",
      "Fetch one character testimony WITH inline annotations — glossary-term spans and pre-decimal price spans by character offset into the body. Returns `{body, annotations[]}` where each annotation has `{type: \"gloss\"|\"price\", start, end, matched_text, ...}`. Use for building a reader UI with glossary popovers and currency-conversion hovers — consumers don't need to re-scan the text. Glossary annotations resolve dialect variants via the entry's `aliases` (e.g. 'shore-worker' → 'shore-men'); the matched form is reported back as `matched_alias`. Price annotations inline all FOUR modern-GBP equivalents in `bases` (real_price, labour_value, income_value, economic_share) — these can differ by an order of magnitude, so pick the right basis for context (real_price for goods, labour_value for wages, economic_share for trade aggregates). `modern_gbp_approx_cpi` is kept as a back-compat alias mirroring bases.real_price. For full per-basis metadata (multiplier, endpoint year, source), call normalize_price. Offsets are UTF-16 code units. (cost: cheap — pure text scan)",
      {
        id: z
          .string()
          .describe("Character id, e.g. '06-cuckolds-point-tosher' or 'mayhew'"),
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
        const glossary = listGlossary().entries;
        const annotations = annotateBody(c.body, glossary);
        const meta = c.meta as Record<string, unknown>;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  id,
                  url: `/api/characters/${id}/annotated`,
                  source_lines: meta.source_lines ? String(meta.source_lines) : null,
                  body: c.body,
                  annotations,
                  annotation_summary: {
                    gloss_count: annotations.filter((a) => a.type === "gloss").length,
                    price_count: annotations.filter((a) => a.type === "price").length,
                    body_length: c.body.length,
                  },
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
      "get_chapter_annotated",
      "Fetch one chapter WITH inline annotations — identical shape to get_character_annotated but against chapter bodies. Returns `{body, annotations[]}` with glossary-term and pre-decimal price spans keyed by character offset. Glossary annotations resolve dialect variants via the entry's `aliases` (the matched form is reported back as `matched_alias`). Price annotations inline all four modern-GBP bases (real_price, labour_value, income_value, economic_share) — call normalize_price for full per-basis metadata. Use for reader UIs that want chapter-level annotation. (cost: cheap — pure text scan)",
      {
        id: z.string().describe("Chapter id, e.g. '07-sewer-hunters-toshers'"),
      },
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
        const glossary = listGlossary().entries;
        const annotations = annotateBody(c.body, glossary);
        const meta = c.meta as Record<string, unknown>;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  id,
                  url: `/api/chapters/${id}/annotated`,
                  source_lines: meta.source_lines ? String(meta.source_lines) : null,
                  body: c.body,
                  annotations,
                  annotation_summary: {
                    gloss_count: annotations.filter((a) => a.type === "gloss").length,
                    price_count: annotations.filter((a) => a.type === "price").length,
                    body_length: c.body.length,
                  },
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
      "Case-insensitive SUBSTRING search across the verbatim source.txt. Use this for EXACT-MATCH queries: place names ('Bermondsey'), slang ('tosh', 'brieze'), institutions ('workhouse'), numbers, quoted phrases. Returns line numbers, the matching line, and surrounding context. For concept-based queries (e.g. 'physical disability', 'fear of authority', 'children working at night'), use `semantic_search` instead. (cost: cheap)",
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
      "Meaning-based (embedding) search across Mayhew's corpus. Use when you want passages by CONCEPT rather than exact wording — Mayhew often describes things without using the modern word for them (e.g. 'physical disability' returns his descriptions of the paralysed waterman, the lame grubber, the one-armed sifter, even though he never uses the word 'disability'). Returns ranked hits with source.txt line citations in the same shape as `search`, plus a `score` field (0–1, higher is more similar). The `kind` filter lets you restrict hits to the raw source, chapter summaries, or character testimonies. Use `search` for exact-match queries. (cost: expensive — live embedding API call via Vercel AI Gateway + Neon pgvector query per request)",
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
      "Canonical glossary of Victorian street-trade slang from the Mayhew extract — 'tosh', 'pure', 'bunters', 'brieze', 'chiffoniers', etc. Each entry has term, part of speech, definition, the chapter it lives in, and source.txt line citations. Use this instead of guessing what period slang means. (cost: cheap)",
      {},
      async () => ({
        content: [{ type: "text", text: JSON.stringify(listGlossary(), null, 2) }],
      }),
    );

    server.tool(
      "get_glossary_term",
      "Fetch one glossary entry by term (case-insensitive, e.g. 'tosh', 'brieze'). Returns definition + chapter + source.txt line citations. (cost: cheap)",
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
      "Structured London geography of the Mayhew extract — Cuckold's Point, Bermondsey tanyards, Petticoat Lane, Hyde Park fire-rubbish ground, etc. Each location has modern lat/lng coords (WGS84), a 1851 description, chapter + character cross-refs, and source.txt line citations. Use for map pins, route visualisations, or geographic queries. (cost: cheap)",
      {},
      async () => ({
        content: [{ type: "text", text: JSON.stringify(listLocations(), null, 2) }],
      }),
    );

    server.tool(
      "list_relationships",
      "Cross-reference graph — edges between canonical character voices and the people/institutions they mention (Long J—— the tosher's rival; Sall the dustman's partner; Bradbury & Evans the printers; Mr Brown the missing-heir pure-finder). Edges run character → mentioned. For the reverse direction (\"who mentions Long J——?\", \"what edges touch Bermondsey?\"), use `get_mentions_of`. Use for dramatis personae, NPC scaffolding, or relationship visualisations. (cost: cheap)",
      {},
      async () => ({
        content: [{ type: "text", text: JSON.stringify(listRelationships(), null, 2) }],
      }),
    );

    server.tool(
      "get_mentions_of",
      "Reverse lookup on the relationship graph: find every edge that POINTS AT or REFERENCES a given person, place, or institution. Case-insensitive substring match in priority order — to.id, then to.label, then the edge description. Each hit reports which field matched via `matched_on`. Description matching catches references that live only in the editorial commentary on an edge (e.g. 'Bermondsey' is mentioned in many descriptions but is never itself a canonical to.label — without description matching it would return zero hits despite obviously being touched by those edges). Answers questions `list_relationships` can't: 'who mentions Long J——?', 'which characters reference Bermondsey?', 'what edges touch Bradbury & Evans?'. Returns matching edges with the source character, relationship type, description, and source_lines citation. Use with a specific name fragment — 'Long J' or 'Bermondsey' — not a whole sentence. (cost: cheap)",
      {
        query: z
          .string()
          .describe(
            "Name or label fragment to search for in edge targets, e.g. 'Long J', 'Bermondsey', 'Bradbury', 'rats'.",
          ),
      },
      async ({ query }) => ({
        content: [
          { type: "text", text: JSON.stringify(findMentionsOf(query), null, 2) },
        ],
      }),
    );

    server.tool(
      "voice_profile",
      "Returns a TTS/voice-casting profile for a character: gender, age_band, dialect_level, accent_hint, speech_notes, AND concrete TTS-oriented fields — `pronunciation_overrides` (spelling→IPA pairs for Mayhew's phonetic renderings like 'vos'→/vɒz/, 'P'int'→/pɔɪnt/, 'niver'→/ˈnɪvə/; without these a TTS engine mangles heavy-dialect characters), `suggested_voice_model` (generic voice-model descriptor a casting pipeline can match against), and `ssml_hints` (per-character SSML guidance where relevant). Use for picking a narration voice or priming a stylised dialogue/TTS generator. Works for 'mayhew' too. (cost: cheap)",
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
      "Converts a pre-decimal British amount (£/s/d — pounds, shillings, pence) into decimal 1851 pounds and returns FOUR modern-GBP equivalents on different economic bases: real_price (CPI, for consumer goods), labour_value (average earnings, for wages), income_value (GDP per capita, for personal income/status), and economic_share (GDP share, for industry totals and public budgets). These can differ by an ORDER OF MAGNITUDE — the dust trade's £148,000/year is ~£22M on CPI but ~£1.15B on GDP-share. Use real_price for individual goods, labour_value for wages/worker income, economic_share for large aggregate sums. Accept either `{pounds, shillings, pence}` or a `literal` string (e.g. '£3 5s 6d', '6d', '£148,000', '3l. 5s.' Mayhew's l. notation). Response includes per-basis multiplier, endpoint year, and source. Top-level `modern_gbp_approx` and `basis` aliases preserved for back-compat (they mirror real_price). (cost: cheap — pure math)",
      {
        literal: z
          .string()
          .optional()
          .describe("Pre-decimal string, e.g. '£3 5s 6d', '6d', '£148,000', '3l. 5s.'. Takes precedence over pounds/shillings/pence if both are passed."),
        pounds: z.number().min(0).optional().describe("Pounds (£). Default 0."),
        shillings: z.number().min(0).optional().describe("Shillings (s). 20 per pound. Default 0."),
        pence: z.number().min(0).optional().describe("Pence (d). 12 per shilling. Default 0."),
      },
      async ({ literal, pounds, shillings, pence }) => {
        try {
          const input = literal
            ? parsePriceLiteral(literal)
            : { pounds, shillings, pence };
          const result = normalizePrice(input);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { ...result, input_mode: literal ? "literal" : "numeric" },
                  null,
                  2,
                ),
              },
            ],
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
      "CURATED (NOT exhaustive) pulled-quotes from the Mayhew extract — verbatim text plus speaker_id, dialect_level (standard|moderate|heavy), theme, and a tts_normalized rendition for narration engines that struggle with 19th-century phonetic spellings. Filter by speaker_id, chapter_ref, theme, or dialect_level. Response includes a `coverage` field documenting the selection policy and flagging `exhaustive: false` — there are many more quotable lines in source.txt than the ~21 in this list. If you need quotes beyond the curated selection, call search/semantic_search/get_source_lines directly. Use for headline cards, quote-of-the-day panels, TTS audio, or fact-checking a rendered snippet. (cost: cheap)",
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
      "Original 1861 woodcut plates from Mayhew's Vol. II, engraved from Richard Beard daguerreotypes — bone-grubber, mud-lark, sewer-hunter, dust-yard, rat-catcher, nightmen, etc. Each entry has display and high-res image URLs (Project Gutenberg, public domain), caption, chapter + character refs. Use for map-marker artwork, card illustrations, or citation-backed visual research. (cost: cheap)",
      {},
      async () => ({
        content: [{ type: "text", text: JSON.stringify(listIllustrations(), null, 2) }],
      }),
    );

    server.tool(
      "list_quiz",
      "Canonical fact-check triples from the Mayhew extract — question, answer, and source.txt line citation. Filter by chapter_ref or difficulty (easy|medium|hard). Use for quiz features or answer-validation when a consumer agent has generated an assertion about the text. (cost: cheap)",
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
      "Fetch a verbatim slice from source.txt by line range. Useful for quoting Mayhew with exact citations — fetch only the lines you need rather than pulling a whole character or chapter dossier. Capped at 500 lines per call. Returns clamped start/end and the raw text. (cost: cheap)",
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

    // ---------- Resources — addressable URIs for chapters, characters, glossary, raw source ----------

    server.resource(
      "chapter",
      new ResourceTemplate("toshers://chapter/{id}", {
        list: async () => ({
          resources: listChapters().map((c) => ({
            uri: `toshers://chapter/${c.id}`,
            name: c.title || c.id,
            description: c.hook,
            mimeType: "text/markdown",
          })),
        }),
      }),
      async (uri, { id }) => {
        const c = getChapter(String(id));
        if (!c) {
          throw new Error(`Chapter not found: ${id}`);
        }
        return {
          contents: [
            { uri: uri.href, mimeType: "text/markdown", text: c.raw },
          ],
        };
      },
    );

    server.resource(
      "character",
      new ResourceTemplate("toshers://character/{id}", {
        list: async () => ({
          resources: listCharacters().map((c) => ({
            uri: `toshers://character/${c.id}`,
            name: c.label || c.id,
            description: c.occupation
              ? `${c.occupation}${c.age_stated ? `, age ${c.age_stated}` : ""}`
              : undefined,
            mimeType: "text/markdown",
          })),
        }),
      }),
      async (uri, { id }) => {
        const c = getCharacter(String(id));
        if (!c) {
          throw new Error(`Character not found: ${id}`);
        }
        return {
          contents: [
            { uri: uri.href, mimeType: "text/markdown", text: c.raw },
          ],
        };
      },
    );

    server.resource(
      "glossary_term",
      new ResourceTemplate("toshers://glossary/{term}", {
        list: async () => ({
          resources: listGlossary().entries.map((e) => ({
            uri: `toshers://glossary/${encodeURIComponent(e.term.toLowerCase())}`,
            name: e.term,
            description: e.definition,
            mimeType: "application/json",
          })),
        }),
      }),
      async (uri, { term }) => {
        const entry = getGlossaryTerm(decodeURIComponent(String(term)));
        if (!entry) {
          throw new Error(`Glossary term not found: ${term}`);
        }
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(entry, null, 2),
            },
          ],
        };
      },
    );

    server.resource(
      "source",
      "toshers://source.txt",
      {
        description:
          "The full canonical 1851 Mayhew extract, byte-for-byte. ~4,500 lines. Cite as source.txt:start-end.",
        mimeType: "text/plain",
      },
      async (uri: URL) => ({
        contents: [
          { uri: uri.href, mimeType: "text/plain", text: getSourceRaw() },
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
      version: getPackageVersion(),
    },
    capabilities: {
      tools: { listChanged: false },
      prompts: { listChanged: false },
      resources: { listChanged: false, subscribe: false },
      logging: {},
    },
  },
  { basePath: "/api" },
);

export { handler as GET, handler as POST, handler as DELETE };
