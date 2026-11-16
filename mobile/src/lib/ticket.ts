/** 1,000,000 → "1M", 500,000 → "0.5M", 300,000 → "300K". */
function short(amount: number, millions: boolean): string {
  if (millions) return `${Number((amount / 1_000_000).toFixed(1))}M`;
  return amount >= 1000 ? `${Math.round(amount / 1000)}K` : String(amount);
}

/** A ticket range in a few characters, as on a card: "KES 1–5M", "KES 0.5–2M". */
export function shortTicket(min: number | null | undefined, max: number | null | undefined): string | undefined {
  if (min == null && max == null) return undefined;
  if (min == null) return `Up to KES ${short(max!, max! >= 1_000_000)}`;
  if (max == null) return `KES ${short(min, min >= 1_000_000)}+`;
  const m = max >= 1_000_000;
  const lo = short(min, m).replace(/M$/, '');
  return `KES ${lo}–${short(max, m)}`;
}
