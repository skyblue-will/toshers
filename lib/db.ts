import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _client: NeonQueryFunction<false, false> | null = null;

/**
 * Returns a memoised Neon HTTP client.
 *
 * We deliberately use the HTTP driver (not the WebSocket pool) so each
 * Vercel Function invocation gets a stateless query path that won't
 * exhaust connection pools under Fluid Compute concurrency.
 */
export function db(): NeonQueryFunction<false, false> {
  if (!_client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Run `vercel env pull .env.local` first.",
      );
    }
    _client = neon(url);
  }
  return _client;
}
