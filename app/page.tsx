import { listChapters, listCharacters } from "@/lib/content";

export const dynamic = "force-static";

export default function Home() {
  const chapters = listChapters();
  const characters = listCharacters();

  return (
    <main>
      <header>
        <p className="eyebrow">A source library for AI agents · est. MMXXVI</p>
        <h1>
          toshers <em>&amp; co.</em>
        </h1>
        <p className="tagline">
          Henry Mayhew&rsquo;s 1851 reportage on London&rsquo;s bone-grubbers,
          pure-finders, sewer-hunters, mud-larks and dustmen — curated as a
          REST API and remote MCP server, ready for any coding agent to mount.
        </p>
      </header>

      <section>
        <h2><span className="num">§ I.</span>What this is</h2>
        <p>
          ~47,000 words of first-hand Victorian street reportage from{" "}
          <em>London Labour and the London Poor, Vol. II</em>, organised so an
          LLM can load only what it needs. Every quote is byte-faithful to the
          1851 original; every fact carries a line citation back to{" "}
          <code>source.txt</code>.
        </p>
        <p>
          The repo lives at{" "}
          <a href="https://github.com/skyblue-will/toshers">
            github.com/skyblue-will/toshers
          </a>
          .
        </p>
      </section>

      <section>
        <h2><span className="num">§ II.</span>For Claude Code &amp; other MCP-aware agents</h2>
        <p>Add this to your <code>~/.claude/settings.json</code>:</p>
        <pre><code>{`{
  "mcpServers": {
    "toshers": {
      "type": "http",
      "url": "https://toshers.vercel.app/api/mcp"
    }
  }
}`}</code></pre>
        <p>Or via the Claude Code CLI:</p>
        <pre><code>claude mcp add --transport http toshers https://toshers.vercel.app/api/mcp</code></pre>
        <p>Once mounted, the agent gains eight tools:</p>
        <div className="endpoint-grid">
          <div className="endpoint"><span className="method">tool</span><span className="path">get_index</span><span className="desc">Master catalogue — call first to orient</span></div>
          <div className="endpoint"><span className="method">tool</span><span className="path">list_chapters</span><span className="desc">Lightweight chapter metadata only</span></div>
          <div className="endpoint"><span className="method">tool</span><span className="path">get_chapter(id)</span><span className="desc">Full chapter file by id</span></div>
          <div className="endpoint"><span className="method">tool</span><span className="path">list_characters</span><span className="desc">Lightweight testimony metadata only</span></div>
          <div className="endpoint"><span className="method">tool</span><span className="path">get_character(id)</span><span className="desc">Full first-person testimony by id</span></div>
          <div className="endpoint"><span className="method">tool</span><span className="path">search(query, limit?, context?)</span><span className="desc">Exact-match substring search with line citations</span></div>
          <div className="endpoint"><span className="method">tool</span><span className="path">semantic_search(query, limit?, kind?)</span><span className="desc">Meaning-based search via embeddings — finds concepts Mayhew describes without naming</span></div>
          <div className="endpoint"><span className="method">tool</span><span className="path">get_source_lines(start, end)</span><span className="desc">Verbatim slice from source.txt for citation-backed quoting</span></div>
        </div>
      </section>

      <section>
        <h2><span className="num">§ III.</span>For everyone else (REST)</h2>
        <p>Plain HTTP, no auth, public-domain source:</p>
        <div className="endpoint-grid">
          <div className="endpoint"><span className="method">GET</span><span className="path"><a href="/api/index">/api/index</a></span><span className="desc">Master catalogue (chapters + characters + line counts + index files)</span></div>
          <div className="endpoint"><span className="method">GET</span><span className="path"><a href="/api/chapters">/api/chapters</a></span><span className="desc">List all chapters with metadata</span></div>
          <div className="endpoint"><span className="method">GET</span><span className="path">/api/chapters/{`{id}`}</span><span className="desc">One chapter (append <code>?format=raw</code> for raw markdown)</span></div>
          <div className="endpoint"><span className="method">GET</span><span className="path"><a href="/api/characters">/api/characters</a></span><span className="desc">List all character testimonies with metadata</span></div>
          <div className="endpoint"><span className="method">GET</span><span className="path">/api/characters/{`{id}`}</span><span className="desc">One testimony (append <code>?format=raw</code> for raw markdown)</span></div>
          <div className="endpoint"><span className="method">GET</span><span className="path"><a href="/api/search?q=rats">/api/search?q={`{query}`}&amp;limit={`{n}`}</a></span><span className="desc">Exact-match substring search; returns line numbers, snippets, and surrounding context</span></div>
          <div className="endpoint"><span className="method">GET</span><span className="path"><a href="/api/search/semantic?q=physical+disability&limit=3">/api/search/semantic?q={`{query}`}&amp;limit={`{n}`}&amp;kind={`{source|chapter|character}`}</a></span><span className="desc">Meaning-based search via embeddings; returns ranked hits with citations (try it — finds passages by concept even when Mayhew never uses the modern word)</span></div>
          <div className="endpoint"><span className="method">GET</span><span className="path"><a href="/api/source?start=1722&end=1740">/api/source?start={`{n}`}&amp;end={`{m}`}</a></span><span className="desc">Verbatim line range (capped 500 lines; <code>?format=raw</code> for plain text)</span></div>
        </div>
      </section>

      <section>
        <h2><span className="num">§ IV.</span>The 11 chapters</h2>
        <div className="catalogue">
          {chapters.map((c) => (
            <div className="catalogue-row" key={c.id}>
              <span className="num">{c.chapter}</span>
              <div>
                <div className="title">
                  <a href={`/api/chapters/${c.id}?format=raw`}>{c.title}</a>
                </div>
                <div className="hook">{c.hook}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2><span className="num">§ V.</span>The 11 voices</h2>
        <div className="catalogue">
          {characters.map((c) => (
            <div className="catalogue-row" key={c.id}>
              <span className="num">{c.id.slice(0, 2)}</span>
              <div>
                <div className="title">
                  <a href={`/api/characters/${c.id}?format=raw`}>{c.label}</a>
                </div>
                <div className="hook">
                  {c.occupation ? `${c.occupation}` : ""}
                  {c.age_stated ? ` · ${c.age_stated}` : ""}
                  {c.origin ? ` · ${c.origin}` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2><span className="num">§ VI.</span>How agents should use this</h2>
        <ol>
          <li>Call <code>get_index</code> (or <code>GET /api/index</code>) <strong>once</strong> when you land in a fresh session — it returns the full catalogue plus the contents of both INDEX.md files.</li>
          <li>Use <code>list_chapters</code> / <code>list_characters</code> for lightweight browsing without loading bodies.</li>
          <li>Use <code>search</code> first when answering a question — it returns line citations you can quote with confidence.</li>
          <li>Use <code>get_source_lines</code> for verbatim quoting (capped at 500 lines per call).</li>
          <li>Only call <code>get_chapter</code> / <code>get_character</code> when you need the full body — these can be 10-30 kb each.</li>
        </ol>

        <div className="callout">
          <strong>Citation convention.</strong> When quoting Mayhew, cite as{" "}
          <code>source.txt:1722-1856</code>. The line numbers are stable; they
          are the canonical addressing scheme across the whole library.
        </div>
      </section>

      <p className="flourish">· · ·</p>

      <footer>
        <p>
          Source &mdash; Henry Mayhew, <em>London Labour and the London Poor</em>, Vol. II (1851 / 1861 expanded). Public domain.
        </p>
        <p>
          Code &mdash; <a href="https://github.com/skyblue-will/toshers">github.com/skyblue-will/toshers</a> &middot; deployed on Vercel.
        </p>
      </footer>
    </main>
  );
}
