# toshers

A curated source library for any coding agent building something — a game, an interactive walkthrough, a learning tool, a generative narrative, a research visualisation — from the world of Victorian London's street-finders.

**"Toshers"** was the name for the sewer-hunters of 1850s London: men in long greasy velveteen coats with eight-foot iron-hooked poles who worked the Thames sewer outlets at low tide, hunting for lost coins, copper, bones, and rope. This repo takes its name from them, but it covers the whole social stratum Mayhew documented.

**Hosted at:** https://toshers.vercel.app · **REST API + remote MCP server, no auth required.**

## For AI agents — the fastest way to use this

### Claude Code (and other MCP-aware clients)

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "toshers": {
      "type": "http",
      "url": "https://toshers.vercel.app/api/mcp"
    }
  }
}
```

Or via the CLI:

```bash
claude mcp add --transport http toshers https://toshers.vercel.app/api/mcp
```

You'll get sixteen tools plus five prompts:

- **Catalogue** — `get_index`, `list_chapters`, `get_chapter`, `list_characters`, `get_character`
- **Search** — `search` (exact-match substring), `semantic_search` (meaning-based via embeddings)
- **Synthesis** — `list_glossary`, `get_glossary_term`, `list_locations`, `list_relationships`, `voice_profile`, `list_quotes`, `list_illustrations`, `list_quiz`, `normalize_price`
- **Citation** — `get_source_lines`
- **Prompts** — `summarise_character_for_kids`, `narrate_character_in_voice`, `find_passages_on`, `map_tour`, `quiz_on`

Call `get_index` first when you start a session — it returns the entire catalogue (plus `version` and git `commit` for cache invalidation) in one shot.

**When to use which search.** `search` for exact-match queries — place names (`Bermondsey`), slang (`tosh`, `brieze`), institutions (`workhouse`), quoted phrases. `semantic_search` for concept queries — Mayhew describes many things without using the modern word (e.g. `"physical disability"` returns his passages on the paralysed waterman and the one-armed sifter even though he never writes "disability"; `"children working at night"` finds the mud-lark and dust-yard passages without depending on exact phrasing).

### Plain HTTP (any client)

| Endpoint | Returns |
|----------|---------|
| `GET /api/index` | Master catalogue (chapters + characters + line counts + INDEX.md files) |
| `GET /api/chapters` | List of chapters with metadata |
| `GET /api/chapters/{id}` | One chapter (`?format=raw` for markdown) |
| `GET /api/characters` | List of testimonies with metadata |
| `GET /api/characters/{id}` | One testimony (`?format=raw` for markdown) |
| `GET /api/characters/{id}/voice` | TTS/voice-casting profile — gender, age band, dialect level, accent hint, speech notes |
| `GET /api/glossary` | Canonical Victorian slang glossary (`tosh`, `pure`, `brieze` …) with chapter + line citations |
| `GET /api/glossary/{term}` | One glossary entry |
| `GET /api/locations` | Structured geography — lat/lng + chapter + character refs for every named London place |
| `GET /api/relationships` | Cross-reference graph — character edges to the people and institutions they mention |
| `GET /api/prices/normalize?pounds={n}&shillings={n}&pence={n}` | Pre-decimal → decimal pounds → modern GBP (BoE CPI 1851→2024) |
| `GET /api/quotes?speaker_id=&chapter_ref=&theme=&dialect_level=` | Canonical pulled-quotes — verbatim text, speaker, dialect level, TTS-normalised rendition |
| `GET /api/illustrations` | Original 1861 Beard-daguerreotype plates with public-domain image URLs (Project Gutenberg) |
| `GET /api/quiz?chapter_ref=&difficulty=` | Fact-check triples — question, answer, and `source.txt` citation |
| `GET /api/openapi.json` | Full OpenAPI 3.1 spec for the REST surface — feed to an OpenAPI code generator for a typed client |
| `GET /api/search?q={query}&limit={n}&context={n}` | **Substring** search across `source.txt` with line citations |
| `GET /api/search/semantic?q={query}&limit={n}&kind={source|chapter|character}` | **Semantic** search via embeddings (openai/text-embedding-3-small routed through Vercel AI Gateway + pgvector on Neon). Returns ranked hits with line citations and a `score` in 0–1. |
| `GET /api/source?start={n}&end={m}` | Verbatim line range from `source.txt` (capped 500 lines; `?format=raw` for plain text) |

**CORS:** every `/api/**` route sets `Access-Control-Allow-Origin: *`. Browser apps can fetch the library directly with no proxy.

**Cache invalidation:** `/api/index` returns the current `version` (from `package.json`) and `commit` (Vercel git SHA). Downstream caches can key off these.

**Citation convention:** when quoting Mayhew, cite as `source.txt:1722-1856`. The line numbers are stable across the whole library.

## What's in here

The primary source is an extract from Henry Mayhew's *London Labour and the London Poor*, Volume II (1851) — specifically the chapters on street-finders and street-collectors: bone-grubbers, pure-finders (dogs'-dung collectors), cigar-end finders, old-wood gatherers, dredgers, **sewer-hunters (toshers)**, mud-larks, dustmen, nightmen, sweeps, and scavengers.

~47,000 words of first-hand reportage, statistics, and direct testimony from the Victorian underclass, organised so an LLM can load only what it needs.

## Repo layout

```
/
├── README.md                           ← you are here
├── source.txt                          ← canonical original; 4,523 lines; DO NOT EDIT
├── source/                             ← chapter-level splits of the source text
│   ├── INDEX.md                        ← READ THIS FIRST — navigational map
│   ├── 01-overview-taxonomy.md
│   ├── 02-bone-grubbers-and-rag-gatherers.md
│   ├── 03-pure-finders.md
│   ├── 04-cigar-end-finders.md
│   ├── 05-old-wood-gatherers.md
│   ├── 06-dredgers-river-finders.md
│   ├── 07-sewer-hunters-toshers.md     ← repo namesake
│   ├── 08-mud-larks.md
│   ├── 09-dustmen-sweeps-scavengers-overview.md
│   ├── 10-dustmen-of-london.md
│   └── 11-london-sewerage-and-scavengery.md
└── characters/                         ← first-person voices & character scenes
    ├── INDEX.md                        ← READ THIS SECOND — character catalogue
    ├── 01-liverpool-bone-grubber.md
    ├── 02-cheque-finder-grubber.md
    ├── 03-pure-finder-widow.md
    ├── 04-manchester-clerk-pure-collector.md
    ├── 05-rotherhithe-dredger.md
    ├── 06-cuckolds-point-tosher.md     ← ⭐ the archetypal tosher
    ├── 07-nine-year-old-mud-lark.md
    ├── 08-seven-year-old-mud-lark.md
    ├── 09-jc-coalwhipper-son-mud-lark.md   ← ⭐ the redemption arc
    ├── 10-dustman-and-sall.md
    └── 11-minor-voices-and-scenes.md
```

## How a coding agent should use this

**1. Load `source/INDEX.md` first.** It's a one-page table mapping each of the 11 chapters to a one-line hook, plus cross-cutting indexes (vocabulary, economic data, locations, atmosphere). It tells you which file to open for what you need.

**2. Load `characters/INDEX.md` second** if you need human voices. It catalogues the 11 testimony files with labels, occupations, ages, key facts, and suggested game hooks. This is where the narrative material lives.

**3. Only then open individual chapter or character files.** Each file is self-contained: YAML frontmatter at the top (the interpretive layer) followed by verbatim Mayhew text (the primary source). You can drop any single file into a fresh LLM context without reading anything else.

**4. Do not edit `source.txt`.** It is the canonical original, preserved byte-for-byte. All line-number references in frontmatter point back to it.

**5. When you add new material** (timelines, gazetteers, glossaries, character sheets, game mechanics, UI mockups, code), put it in new sibling directories at the repo root — keep `source/` and `characters/` as primary-source and primary-derivative material only.

## What this repo is good for

- **A game**: The concrete worldbuilding is all here — occupations, tools, slang, prices, geography, daily routines, first-person voices, named NPCs, loot tables, real historical anchors (the Parliament Houses fire of 1834, the Irish famine migration, the 1848 Continental revolutions, the Neptune East Indiaman, Bradbury & Evans the printers).
- **An interactive walkthrough or educational tour**: the source has built-in tours (e.g. the pure-finder widow's Aldgate → Whitechapel → Stepney → Bow → Bromley → Bermondsey beat; the tosher's Cuckold's Point → Blackfriars-bridge → Hyde Park route).
- **A narrative generator**: every testimony file has a `game_hooks` block naming what that voice is useful for as narrative seed material.
- **A research reference**: every fact is sourced to a specific line range in `source.txt`.

## Conventions

- **Frontmatter** (YAML between `---` markers at the top of a file) is **interpretive** — summaries, key facts, suggested hooks. Feel free to disagree and overwrite.
- **Everything below the closing `---`** is **verbatim 1851 prose**. Do not paraphrase. Do not "modernise." Quote it or cite its line range.
- **Stated line ranges reference `source.txt`** unless otherwise noted.
- **Currencies** are pre-decimal: £ (pound), s (shilling, 1/20 of a pound), d (penny, 1/12 of a shilling). "5s 6d" = five shillings sixpence. "£3 5s" = three pounds five shillings.
- **The extract truncates mid-sentence in chapter 11** (`source/11-london-sewerage-and-scavengery.md`). If you need the rest of Mayhew's sewer-and-scavenger treatment, source it from Project Gutenberg or an archive.

## About the source

Henry Mayhew (1812–1887) was a journalist who spent years interviewing London's poor and publishing the results, first as *Morning Chronicle* articles (1849–50) and then as the three-volume *London Labour and the London Poor* (1851; expanded edition 1861). The extract in this repo is from the 1861 expanded volume II, covering the street-finders. It is one of the foundational works of urban sociology and investigative journalism in English — Dickens, Conan Doyle, and every subsequent London underworld writer draws from it.

The original is in the public domain.

---

## Running it locally

```bash
npm install
vercel env pull .env.local        # pulls DATABASE_URL + AI_GATEWAY_API_KEY
npm run build
PORT=3741 npm start
# REST:  http://localhost:3741/api/index
# MCP:   http://localhost:3741/api/mcp
```

For the dev server: `npm run dev` (defaults to port 3000).

### Reindexing the semantic search corpus

The `chunks` table on Neon holds paragraph-level embeddings of `source.txt` and the chapter/character bodies. If you ever edit the source material, rebuild:

```bash
# First time only — apply the pgvector schema to Neon
npm run db:migrate

# Incremental: only re-embeds chunks whose content_hash changed
npm run index

# Nuke and pave: TRUNCATE chunks, then reindex everything
npm run index:rebuild
```

Full reindex is ~305 chunks, ~157k tokens, ~$0.003, ~15 seconds. Uses `openai/text-embedding-3-small` (1536-d) routed through Vercel AI Gateway. Per-query cost at runtime is ~$2e-7.

## Infrastructure

- **Stack:** Next.js 15 App Router, React 19, TypeScript, [`mcp-handler`](https://www.npmjs.com/package/mcp-handler) for the MCP transport, [`@neondatabase/serverless`](https://www.npmjs.com/package/@neondatabase/serverless) HTTP driver, [`ai`](https://www.npmjs.com/package/ai) SDK for embedding calls via Vercel AI Gateway.
- **Hosting:** [Vercel](https://vercel.com) (Fluid Compute, Node.js runtime). Deploys via `vercel deploy --prod` (GitHub auto-deploy not yet connected).
- **Database:** [Neon](https://neon.tech) (Vercel Marketplace). Holds the `chunks` table for semantic search — pgvector + HNSW index. Everything else reads from markdown files on disk at module init.
- **Data layer:** Markdown files are read into memory at module init (cold start cost ≈ negligible for ~100kb of text), so most request paths are pure compute. The semantic-search path additionally makes one embedding API call + one Neon query per request.

```bash
# Dev workflow
vercel link
vercel env pull .env.local
```

`DATABASE_URL` and related Neon env vars are injected automatically by the Vercel Marketplace integration.
