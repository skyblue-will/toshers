import { type GlossaryEntry } from "./data";
import { normalizePrice, type NormalizedPrice } from "./prices";

// Character offsets into a testimony/chapter body (post-frontmatter) for
// glossary terms and pre-decimal price references. The goal is to let a
// reader/UI consumer overlay gloss-popovers and currency-conversion popovers
// without re-scanning the text or duplicating the glossary on the client.
//
// Offsets are UTF-16 code units (JavaScript's `string.indexOf` / `slice`
// semantics), matching what a browser's `Range`/`Selection` API expects.
// Spans do not overlap — when matches collide (e.g. a price inside a
// glossary match) the longer match wins.

export type GlossAnnotation = {
  type: "gloss";
  term: string;
  // Which surface form matched — the canonical `term` or one of its
  // aliases (e.g. dialect variants like "shore-worker" → "shore-men").
  // null means the literal `term` matched.
  matched_alias: string | null;
  matched_text: string;
  start: number;
  end: number;
  entry: GlossaryEntry;
};

// Modern-GBP equivalents on each of the four economic bases. Pre-decimal
// sums have no single "modern equivalent" — a Victorian price can differ
// by an order of magnitude between bases. Inlining all four lets a reader
// UI render the right one for context (real_price for goods, labour_value
// for wages, economic_share for trade aggregates) without a per-price
// callback to normalize_price. Full per-basis metadata (multiplier,
// endpoint year, source) is still available via the normalize_price tool.
export type PriceBases = {
  real_price: number;
  labour_value: number;
  income_value: number;
  economic_share: number;
};

export type PriceAnnotation = {
  type: "price";
  matched_text: string;
  start: number;
  end: number;
  pounds: number;
  shillings: number;
  pence: number;
  decimal_pounds_1851: number;
  // CPI value, retained as a back-compat alias mirroring bases.real_price.
  modern_gbp_approx_cpi: number;
  bases: PriceBases;
};

export type Annotation = GlossAnnotation | PriceAnnotation;

// Pre-decimal British currency regexes. Mayhew uses several notations,
// including Project Gutenberg's markdown-italic form where `_l._` is italic
// "l." (libra). Our patterns tolerate the underscores throughout.
//
// Forms handled:
//   £3 5s 6d          modern form
//   £3. 5s. 6d.       with dots
//   3l. 5s. 6d.       'l' for libra
//   3_l._ 5_s._ 6_d._ Project Gutenberg italic rendering
//   £3 5s             pounds + shillings
//   5s 6d             shillings + pence
//   30s               shillings alone
//   6d                pence alone
//   £148,000          pounds alone, comma-separated
//
// Named coins (sovereign, crown, half-a-crown, shilling, penny) are not
// annotated — too ambiguous without heavy false-positive rates.
//
// Pattern ordering matters: longer/more-specific first.

// Shorthand for an optional underscore (italic marker) either side of a
// unit letter. Matches `l`, `_l_`, `_l._`, `l.`, `_l._`, etc.
const U = "_?"; // optional underscore before unit
const POUND = `${U}l${U}\\.?${U}`;
const SHILLING = `${U}s${U}\\.?${U}`;
const PENCE = `${U}d${U}\\.?${U}`;
const NUM = `(\\d{1,3}(?:,\\d{3})*)`;
const NUM_PLAIN = `(\\d+)`;

type RawPriceMatch = {
  start: number;
  end: number;
  literal: string;
  pounds: number;
  shillings: number;
  pence: number;
};

const PRICE_PATTERNS: Array<{ re: RegExp; parse: (m: RegExpExecArray) => Omit<RawPriceMatch, "start" | "end" | "literal"> }> = [
  // £N Ns Nd
  {
    re: new RegExp(
      `(?<![A-Za-z0-9])£${NUM}\\.?\\s*${NUM_PLAIN}${SHILLING}\\s*${NUM_PLAIN}${PENCE}(?![A-Za-z0-9])`,
      "g",
    ),
    parse: (m) => ({
      pounds: Number(m[1].replace(/,/g, "")),
      shillings: Number(m[2]),
      pence: Number(m[3]),
    }),
  },
  // Nl. Ns Nd (l-notation, optionally italic)
  {
    re: new RegExp(
      `(?<![A-Za-z0-9])${NUM}${POUND}\\s*${NUM_PLAIN}${SHILLING}\\s*${NUM_PLAIN}${PENCE}(?![A-Za-z0-9])`,
      "g",
    ),
    parse: (m) => ({
      pounds: Number(m[1].replace(/,/g, "")),
      shillings: Number(m[2]),
      pence: Number(m[3]),
    }),
  },
  // £N Ns
  {
    re: new RegExp(
      `(?<![A-Za-z0-9])£${NUM}\\.?\\s*${NUM_PLAIN}${SHILLING}(?![A-Za-z0-9])`,
      "g",
    ),
    parse: (m) => ({
      pounds: Number(m[1].replace(/,/g, "")),
      shillings: Number(m[2]),
      pence: 0,
    }),
  },
  // Nl. Ns (l-notation, optionally italic)
  {
    re: new RegExp(
      `(?<![A-Za-z0-9])${NUM}${POUND}\\s*${NUM_PLAIN}${SHILLING}(?![A-Za-z0-9])`,
      "g",
    ),
    parse: (m) => ({
      pounds: Number(m[1].replace(/,/g, "")),
      shillings: Number(m[2]),
      pence: 0,
    }),
  },
  // Ns Nd
  {
    re: new RegExp(
      `(?<![A-Za-z0-9£])${NUM_PLAIN}${SHILLING}\\s*${NUM_PLAIN}${PENCE}(?![A-Za-z0-9])`,
      "g",
    ),
    parse: (m) => ({
      pounds: 0,
      shillings: Number(m[1]),
      pence: Number(m[2]),
    }),
  },
  // £N alone (not followed by s or d)
  {
    re: new RegExp(
      `(?<![A-Za-z0-9])£${NUM}(?!\\s*\\d*[sd])(?![A-Za-z0-9])`,
      "g",
    ),
    parse: (m) => ({
      pounds: Number(m[1].replace(/,/g, "")),
      shillings: 0,
      pence: 0,
    }),
  },
  // Nl. alone (l-notation, not followed by s)
  {
    re: new RegExp(
      `(?<![A-Za-z0-9])${NUM}${POUND}(?!\\s*\\d+${SHILLING})(?![A-Za-z0-9])`,
      "g",
    ),
    parse: (m) => ({
      pounds: Number(m[1].replace(/,/g, "")),
      shillings: 0,
      pence: 0,
    }),
  },
  // Ns alone (not followed by d)
  {
    re: new RegExp(
      `(?<![A-Za-z0-9£])${NUM_PLAIN}${SHILLING}(?!\\s*\\d+${PENCE})(?![A-Za-z0-9])`,
      "g",
    ),
    parse: (m) => ({
      pounds: 0,
      shillings: Number(m[1]),
      pence: 0,
    }),
  },
  // Nd alone
  {
    re: new RegExp(
      `(?<![A-Za-z0-9])${NUM_PLAIN}${PENCE}(?![A-Za-z0-9])`,
      "g",
    ),
    parse: (m) => ({
      pounds: 0,
      shillings: 0,
      pence: Number(m[1]),
    }),
  },
];

function findPriceMatches(body: string): RawPriceMatch[] {
  const raw: RawPriceMatch[] = [];
  for (const { re, parse } of PRICE_PATTERNS) {
    re.lastIndex = 0;
    for (let m = re.exec(body); m !== null; m = re.exec(body)) {
      const parsed = parse(m);
      if (parsed.pounds === 0 && parsed.shillings === 0 && parsed.pence === 0) continue;
      raw.push({
        start: m.index,
        end: m.index + m[0].length,
        literal: m[0],
        ...parsed,
      });
    }
  }
  return raw;
}

function findGlossMatches(body: string, glossary: GlossaryEntry[]): Array<{
  start: number;
  end: number;
  matched_text: string;
  matched_alias: string | null;
  entry: GlossaryEntry;
}> {
  const hits: Array<{
    start: number;
    end: number;
    matched_text: string;
    matched_alias: string | null;
    entry: GlossaryEntry;
  }> = [];
  for (const entry of glossary) {
    // Match the canonical term plus any aliases (singular/plural pairs,
    // dialect variants). Word-boundary, case-insensitive. Escape regex
    // metachars defensively — Victorian terms don't use them, but aliases
    // are author-authored and could.
    const surfaces: Array<{ form: string; isAlias: boolean }> = [
      { form: entry.term, isAlias: false },
      ...(entry.aliases ?? []).map((a) => ({ form: a, isAlias: true })),
    ];
    for (const { form, isAlias } of surfaces) {
      const safe = form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${safe}\\b`, "gi");
      for (let m = re.exec(body); m !== null; m = re.exec(body)) {
        hits.push({
          start: m.index,
          end: m.index + m[0].length,
          matched_text: m[0],
          matched_alias: isAlias ? form : null,
          entry,
        });
      }
    }
  }
  return hits;
}

// Drop overlapping matches — keep the longest at each collision. If two
// matches are identical length the earlier one wins.
function pruneOverlaps<T extends { start: number; end: number }>(matches: T[]): T[] {
  const sorted = [...matches].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return b.end - b.start - (a.end - a.start);
  });
  const kept: T[] = [];
  for (const m of sorted) {
    const last = kept[kept.length - 1];
    if (last && m.start < last.end) {
      // Collision — keep the longer one.
      if (m.end - m.start > last.end - last.start) {
        kept[kept.length - 1] = m;
      }
      continue;
    }
    kept.push(m);
  }
  return kept;
}

export function annotateBody(
  body: string,
  glossary: GlossaryEntry[],
): Annotation[] {
  const glossHits = findGlossMatches(body, glossary);
  const priceHits = findPriceMatches(body);

  const all: Array<
    | {
        kind: "gloss";
        start: number;
        end: number;
        matched_text: string;
        matched_alias: string | null;
        entry: GlossaryEntry;
      }
    | { kind: "price"; start: number; end: number; matched_text: string; raw: RawPriceMatch }
  > = [
    ...glossHits.map((g) => ({
      kind: "gloss" as const,
      start: g.start,
      end: g.end,
      matched_text: g.matched_text,
      matched_alias: g.matched_alias,
      entry: g.entry,
    })),
    ...priceHits.map((p) => ({ kind: "price" as const, start: p.start, end: p.end, matched_text: p.literal, raw: p })),
  ];

  const pruned = pruneOverlaps(all);

  return pruned.map<Annotation>((m) => {
    if (m.kind === "gloss") {
      return {
        type: "gloss",
        term: m.entry.term,
        matched_alias: m.matched_alias,
        matched_text: m.matched_text,
        start: m.start,
        end: m.end,
        entry: m.entry,
      };
    }
    const { pounds, shillings, pence } = m.raw;
    let normalized: NormalizedPrice | null = null;
    try {
      normalized = normalizePrice({ pounds, shillings, pence });
    } catch {
      normalized = null;
    }
    const findBasis = (key: string): number =>
      normalized?.bases.find((b) => b.key === key)?.modern_gbp_approx ?? 0;
    const bases: PriceBases = {
      real_price: findBasis("real_price"),
      labour_value: findBasis("labour_value"),
      income_value: findBasis("income_value"),
      economic_share: findBasis("economic_share"),
    };
    return {
      type: "price",
      matched_text: m.matched_text,
      start: m.start,
      end: m.end,
      pounds,
      shillings,
      pence,
      decimal_pounds_1851: normalized?.decimal_pounds_1851 ?? 0,
      modern_gbp_approx_cpi: bases.real_price,
      bases,
    };
  });
}
