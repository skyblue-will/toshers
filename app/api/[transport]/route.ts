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
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ id, meta: c.meta, body: c.body }, null, 2),
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
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ id, meta: c.meta, body: c.body }, null, 2),
            },
          ],
        };
      },
    );

    server.tool(
      "search",
      "Case-insensitive substring search across the verbatim source.txt. Returns up to `limit` hits with line number, the matching line, and a few lines of surrounding context. Use this to find every mention of a place ('Bermondsey'), occupation ('rats'), institution ('workhouse'), or keyword. Hits include source line numbers so you can quote with citations.",
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
