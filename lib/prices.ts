// Pre-decimal British currency: £ (pound) = 20 s (shillings); 1 s = 12 d (pence).
// Mayhew's corpus uses this throughout — "3l. 5s.", "8d", "£2 10s 6d".

// Multipliers for converting a 1851 £ into modern £ under different economic
// bases. Economic historians (notably Samuel H. Williamson at MeasuringWorth)
// publish several parallel series because a single "modern equivalent" hides
// wildly different stories depending on what you're comparing:
//
//   - real_price (CPI / retail-prices): what the same *basket of goods* costs
//     today. Good for individual consumer items (a loaf of bread, a coat).
//   - labour_value (average earnings): how many hours of average labour the
//     amount represents. Good for wages and worker income — a pure-finder's
//     6d/day looks very different on this basis than on CPI.
//   - income_value (GDP per capita): the amount's relative standing in the
//     income distribution. Good for personal incomes and status.
//   - economic_share (nominal GDP): the amount as a share of the economy.
//     Good for large sums, public budgets, and trade totals — the London
//     dust trade's £148,000/year is ~£22M on CPI but far larger on this basis.
//
// A single Victorian figure can vary by an *order of magnitude* across these
// bases. Quoting only one — as the original single-basis version of this
// endpoint did — materially misleads downstream consumers.
//
// Sources:
//   - Bank of England inflation calculator (Real Price / CPI, 1851→2024).
//     https://www.bankofengland.co.uk/monetary-policy/inflation/inflation-calculator
//   - MeasuringWorth UK compare (Labour Value, Income Value, Economic Share,
//     1851→2020). https://www.measuringworth.com/calculators/ukcompare/
//     Endpoint year 2020; values rounded. Labelled "2020" in each basis so
//     consumers can detect staleness.
//
// The CPI multiplier is tracked to 2024 via the BoE inflator (the precise
// end-year value is published annually). MeasuringWorth updates the other
// series on their own cadence; the 2020 values below are stable and widely
// cited. Refresh when MeasuringWorth publishes a more recent endpoint and
// bump BASES_VERSION.

export const BASES_VERSION = 1;

type Basis = {
  key: string;
  label: string;
  multiplier: number;
  endpoint_year: number;
  description: string;
  source: string;
};

const BASES: readonly Basis[] = [
  {
    key: "real_price",
    label: "Real Price (CPI / retail-price index)",
    multiplier: 151.14,
    endpoint_year: 2024,
    description:
      "What the same basket of consumer goods costs today. The conventional 'inflation' measure. Use for individual consumer items.",
    source: "Bank of England inflation calculator (1851→2024)",
  },
  {
    key: "labour_value",
    label: "Labour Value (average earnings)",
    multiplier: 1030,
    endpoint_year: 2020,
    description:
      "How many hours of average labour the amount represents. Wages have risen much faster than prices since 1851, so this multiplier is ~7× CPI. Use for wages, worker income, and the lived experience of poverty.",
    source: "MeasuringWorth UK compare (1851→2020), www.measuringworth.com/calculators/ukcompare/",
  },
  {
    key: "income_value",
    label: "Income Value (GDP per capita)",
    multiplier: 1980,
    endpoint_year: 2020,
    description:
      "The amount's standing relative to average income per head. Captures how 'rich' a sum makes its holder within the income distribution. Use for personal incomes, estates, and measures of social status.",
    source: "MeasuringWorth UK compare (1851→2020), www.measuringworth.com/calculators/ukcompare/",
  },
  {
    key: "economic_share",
    label: "Economic Share (share of nominal GDP)",
    multiplier: 7800,
    endpoint_year: 2020,
    description:
      "The amount as a share of the national economy. Small at individual scale, huge at aggregate scale — the right basis for public budgets, industry totals, and large trade sums. A £148,000 trade in 1851 is £22M on CPI but ~£1.15B on this basis.",
    source: "MeasuringWorth UK compare (1851→2020), www.measuringworth.com/calculators/ukcompare/",
  },
] as const;

export type PriceInput = {
  pounds?: number;
  shillings?: number;
  pence?: number;
};

export type BasisResult = {
  key: string;
  label: string;
  modern_gbp_approx: number;
  multiplier: number;
  endpoint_year: number;
  description: string;
  source: string;
};

export type NormalizedPrice = {
  input: { pounds: number; shillings: number; pence: number };
  decimal_pounds_1851: number;
  bases: BasisResult[];
  // Back-compat aliases for the pre-multi-basis response shape. Resolve to
  // the CPI / Real Price values so older callers keep working unchanged.
  modern_gbp_approx: number;
  basis: string;
  basis_source: string;
  note: string;
};

export function normalizePrice(input: PriceInput): NormalizedPrice {
  const pounds = Number(input.pounds ?? 0);
  const shillings = Number(input.shillings ?? 0);
  const pence = Number(input.pence ?? 0);

  if (!Number.isFinite(pounds) || !Number.isFinite(shillings) || !Number.isFinite(pence)) {
    throw new Error("pounds, shillings, pence must all be finite numbers");
  }
  if (pounds < 0 || shillings < 0 || pence < 0) {
    throw new Error("pounds, shillings, pence must be non-negative");
  }

  // 1 shilling = 1/20 pound; 1 pence = 1/240 pound.
  const decimal_pounds_1851 =
    Math.round((pounds + shillings / 20 + pence / 240) * 10000) / 10000;

  const bases: BasisResult[] = BASES.map((b) => ({
    key: b.key,
    label: b.label,
    modern_gbp_approx: Math.round(decimal_pounds_1851 * b.multiplier * 100) / 100,
    multiplier: b.multiplier,
    endpoint_year: b.endpoint_year,
    description: b.description,
    source: b.source,
  }));

  const cpi = bases.find((b) => b.key === "real_price")!;

  return {
    input: { pounds, shillings, pence },
    decimal_pounds_1851,
    bases,
    modern_gbp_approx: cpi.modern_gbp_approx,
    basis: cpi.label,
    basis_source: cpi.source,
    note:
      "A Victorian sum has no single 'modern equivalent'. Four bases are returned: real_price (what goods cost), labour_value (hours of work), income_value (standing in income distribution), and economic_share (share of GDP). They can differ by an order of magnitude. Use real_price for consumer items; labour_value for wages; economic_share for industry totals and public budgets.",
  };
}
