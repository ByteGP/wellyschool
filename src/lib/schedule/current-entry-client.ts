// Client-side "current lesson" selection. Reuses the exact same selection
// rules as the build (src/lib/schedule/date-selection) so server and client
// can never drift. Runs as a tiny module script on segment index pages.
//
// The server renders one hidden card per schedule entry; this script unhides
// the one matching the rule for today's date in Pacific/Auckland, and narrows
// the schedule list to the Sundays after it.
import type { ScheduleEntry } from '../../types';
import type { ContentMode } from '../content/mode';
import type { Segment } from '../content/segments';
import { dateInTimeZone, entriesAfter, familyEntry, teacherEntry } from './date-selection';

interface CurrentEntryConfig {
  role: 'teacher' | 'family';
  segment: Segment;
  mode: ContentMode;
  entries: ScheduleEntry[];
}

/** Test/date override is honoured only in preview builds (ADR-011). */
export function resolveToday(mode: ContentMode, search: string): string {
  if (mode === 'preview') {
    const override = new URLSearchParams(search).get('today');
    if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) return override;
  }
  return dateInTimeZone(new Date());
}

export function selectCurrentEntry(config: CurrentEntryConfig, today: string): ScheduleEntry | undefined {
  return config.role === 'teacher'
    ? teacherEntry(config.entries, config.segment, today, config.mode)
    : familyEntry(config.entries, config.segment, today, config.mode);
}

export function activateCurrentEntry(root: HTMLElement): void {
  const configElement = root.querySelector('script[data-current-entry-config]');
  if (!configElement?.textContent) return;
  const config = JSON.parse(configElement.textContent) as CurrentEntryConfig;
  const today = resolveToday(config.mode, window.location.search);
  const selected = selectCurrentEntry(config, today);
  if (!selected) return;

  const card = root.querySelector<HTMLElement>(
    `[data-entry-card="${selected.schedule_id}"]`,
  );
  if (!card) return;
  card.hidden = false;
  const fallback = root.querySelector<HTMLElement>('[data-current-fallback]');
  if (fallback) fallback.hidden = true;

  // "Upcoming Sundays" starts after the card: the card's own Sunday is not
  // listed again, and Sundays that have gone are dropped.
  const upcoming = new Set(
    entriesAfter(config.entries, config.segment, selected.date, config.mode).map(
      (entry) => entry.schedule_id,
    ),
  );
  for (const row of root.querySelectorAll<HTMLElement>('[data-entry-row]')) {
    row.hidden = !upcoming.has(row.dataset.entryRow ?? '');
  }
  const list = root.querySelector<HTMLElement>('[data-upcoming]');
  if (list) list.hidden = upcoming.size === 0;
}
