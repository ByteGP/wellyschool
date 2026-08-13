// School-term utilities. Term dates are owner-editable settings; the site
// derives its teaching schedule from them (see generate.ts). All dates are ISO
// `YYYY-MM-DD` strings interpreted as civil dates in Pacific/Auckland.
export interface Term {
  term_id: string;
  year: number;
  term: number;
  start: string;
  end: string;
  notes?: string;
}

export interface TermSettings {
  timezone: string;
  break_message?: string;
  terms: Term[];
}

/** Add `days` to an ISO date, returning an ISO date (UTC-noon anchored). */
function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Day of week for an ISO date, 0 = Sunday (UTC-noon anchored, DST-safe). */
function dayOfWeek(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

/** All Sundays (inclusive) within [start, end], ascending. */
export function sundaysInRange(start: string, end: string): string[] {
  let cursor = start;
  // Advance to the first Sunday on or after start.
  const offset = (7 - dayOfWeek(cursor)) % 7;
  cursor = addDays(cursor, offset);
  const out: string[] = [];
  while (cursor <= end) {
    out.push(cursor);
    cursor = addDays(cursor, 7);
  }
  return out;
}

/** Every term-time Sunday across all terms, sorted ascending and de-duplicated. */
export function classSundays(settings: TermSettings): string[] {
  const set = new Set<string>();
  for (const term of settings.terms) {
    for (const sunday of sundaysInRange(term.start, term.end)) set.add(sunday);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** The term that contains `date`, if any. */
export function termForDate(settings: TermSettings, date: string): Term | undefined {
  return settings.terms.find((term) => date >= term.start && date <= term.end);
}

/** The start date of the next term strictly after `date`, if any. */
export function nextTermStartAfter(settings: TermSettings, date: string): string | undefined {
  return settings.terms
    .map((term) => term.start)
    .filter((start) => start > date)
    .sort((a, b) => a.localeCompare(b))[0];
}
