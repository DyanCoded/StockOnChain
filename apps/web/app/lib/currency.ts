const randFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMzarAsRand(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new RangeError("mZAR amounts must be finite numbers.");
  }
  return randFormatter.format(amount);
}
