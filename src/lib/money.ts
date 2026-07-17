// All money is integer paise (INR minor units). See CLAUDE.md.

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Format paise as an INR string, e.g. 80000 -> "₹800". */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees);
}
