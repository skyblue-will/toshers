// Pre-decimal British currency: £ (pound) = 20 s (shillings); 1 s = 12 d (pence).
// Mayhew's corpus uses this throughout — "3l. 5s.", "8d", "£2 10s 6d".

// Bank of England CPI inflator, 1851 → 2024 ≈ ×151.14.
// Source: https://www.bankofengland.co.uk/monetary-policy/inflation/inflation-calculator
// Verified 2026-04: £1 in 1851 ≈ £151.14 in 2024 purchasing power.
const CPI_1851_TO_2024 = 151.14;

export type PriceInput = {
  pounds?: number;
  shillings?: number;
  pence?: number;
};

export type NormalizedPrice = {
  input: { pounds: number; shillings: number; pence: number };
  decimal_pounds_1851: number;
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

  const modern_gbp_approx =
    Math.round(decimal_pounds_1851 * CPI_1851_TO_2024 * 100) / 100;

  return {
    input: { pounds, shillings, pence },
    decimal_pounds_1851,
    modern_gbp_approx,
    basis: `Bank of England CPI 1851→2024 inflator (×${CPI_1851_TO_2024})`,
    basis_source:
      "https://www.bankofengland.co.uk/monetary-policy/inflation/inflation-calculator",
    note:
      "Indicative purchasing-power equivalent for modern readers, not a precise economic measure. Wage-relative and status-relative conversions can differ by an order of magnitude — see measuringworth.com for fuller context.",
  };
}
