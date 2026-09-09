export function toMinorUnits(value: string): number {
  const normalized = value
    .replace(/[^\d.,-]/g, '')
    .replace(/[.,](?=\d*[.,])/g, '')
    .replace(',', '.');
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

export function fromMinorUnits(minor: number): string {
  return (minor / 100).toFixed(2);
}
