export interface Period {
  year: number;
  /** 1-12 */
  month: number;
}

/** The current calendar year/month, month 1-indexed (not JS 0-indexed). */
export function currentPeriod(): Period {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
