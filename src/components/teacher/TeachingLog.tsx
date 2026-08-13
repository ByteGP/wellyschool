// Term planner + shared teaching log (ADR-013, Phase B).
//
// Server-rendered with the planned schedule for a segment/term; this island
// loads the shared log from the Netlify Function and lets a teacher record
// what actually happened each Sunday (taught / not taught / swapped), gated by
// a shared passcode. The passcode is remembered in localStorage after the first
// successful save so teachers do not retype it. Reads are open; only writes
// need the passcode.
import { useEffect, useMemo, useState } from 'react';

export interface PlannedSunday {
  date: string;
  displayDate: string;
  entryType: 'lesson' | 'break' | 'special';
  plannedLessonId?: string;
  plannedTitle?: string;
  lessonUrl?: string;
}

export interface LessonOption {
  id: string;
  title: string;
}

type Status = 'taught' | 'not_taught' | 'swapped';

interface LogEntry {
  date: string;
  segment: string;
  status: Status;
  actual_lesson_id?: string;
  note?: string;
  updated_at: string;
}

const PASSCODE_KEY = 'wellyschool.teacher.passcode';
const STATUS_LABEL: Record<Status, string> = {
  taught: 'Taught',
  not_taught: 'Not taught',
  swapped: 'Swapped lesson',
};

export default function TeachingLog({
  segment,
  sundays,
  lessonOptions,
}: {
  segment: string;
  sundays: PlannedSunday[];
  lessonOptions: LessonOption[];
}) {
  const [log, setLog] = useState<Record<string, LogEntry>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [passcode, setPasscode] = useState('');

  useEffect(() => {
    try {
      setPasscode(window.localStorage.getItem(PASSCODE_KEY) ?? '');
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/teaching-log')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('load failed'))))
      .then((data: { entries: LogEntry[] }) => {
        if (cancelled) return;
        const forSegment: Record<string, LogEntry> = {};
        for (const entry of data.entries) {
          if (entry.segment === segment) forSegment[entry.date] = entry;
        }
        setLog(forSegment);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the teaching log. It may not be set up yet.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [segment]);

  const taughtCount = useMemo(
    () => Object.values(log).filter((entry) => entry.status === 'taught').length,
    [log],
  );
  const swappedCount = useMemo(
    () => Object.values(log).filter((entry) => entry.status === 'swapped').length,
    [log],
  );

  const save = async (
    date: string,
    status: Status,
    actualLessonId: string | undefined,
    note: string | undefined,
  ) => {
    setError(null);
    setSavingDate(date);
    try {
      const res = await fetch('/api/teaching-log', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-teaching-passcode': passcode },
        body: JSON.stringify({
          date,
          segment,
          status,
          actual_lesson_id: status === 'swapped' ? actualLessonId : undefined,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Save failed.');
        return;
      }
      setLog((current) => ({ ...current, [date]: data.entry as LogEntry }));
      try {
        window.localStorage.setItem(PASSCODE_KEY, passcode);
      } catch {
        /* storage unavailable */
      }
    } catch {
      setError('Save failed. Check your connection and try again.');
    } finally {
      setSavingDate(null);
    }
  };

  const lessonSundays = sundays.filter((s) => s.entryType === 'lesson');

  return (
    <div>
      <div className="notice" role="status">
        This term: <strong>{taughtCount}</strong> taught, <strong>{swappedCount}</strong> swapped,
        of <strong>{lessonSundays.length}</strong> planned lessons.
      </div>

      <p>
        <label htmlFor="teaching-passcode">
          <strong>Teacher passcode</strong> (needed to save; remembered on this device)
        </label>
        <br />
        <input
          id="teaching-passcode"
          type="password"
          className="self-check"
          style={{ minHeight: 'var(--tap-target)', maxWidth: '18rem' }}
          value={passcode}
          autoComplete="off"
          onChange={(event) => setPasscode(event.target.value)}
        />
      </p>

      {error && (
        <p className="feedback feedback--retry" role="alert">
          <span className="feedback-verdict">Note. </span>
          {error}
        </p>
      )}

      {loading ? (
        <p>Loading the log...</p>
      ) : (
        <ul className="option-list" style={{ gap: 'var(--space-3)' }}>
          {sundays.map((sunday) => (
            <SundayRow
              key={sunday.date}
              sunday={sunday}
              entry={log[sunday.date]}
              lessonOptions={lessonOptions}
              saving={savingDate === sunday.date}
              onSave={save}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SundayRow({
  sunday,
  entry,
  lessonOptions,
  saving,
  onSave,
}: {
  sunday: PlannedSunday;
  entry: LogEntry | undefined;
  lessonOptions: LessonOption[];
  saving: boolean;
  onSave: (
    date: string,
    status: Status,
    actualLessonId: string | undefined,
    note: string | undefined,
  ) => void;
}) {
  const [swapId, setSwapId] = useState(entry?.actual_lesson_id ?? '');
  const [note, setNote] = useState(entry?.note ?? '');

  const isBreak = sunday.entryType !== 'lesson';

  return (
    <li
      className="card"
      style={{ marginBottom: 0, padding: 'var(--space-4)' }}
      aria-label={`${sunday.displayDate}`}
    >
      <p className="eyebrow" style={{ marginBottom: 'var(--space-1)' }}>
        {sunday.displayDate}
        {entry && (
          <span className="badge" style={{ marginLeft: 'var(--space-2)' }}>
            {STATUS_LABEL[entry.status]}
          </span>
        )}
      </p>
      {isBreak ? (
        <p style={{ marginBottom: 0 }}>No class (school holidays).</p>
      ) : (
        <>
          <p style={{ marginBottom: 'var(--space-2)' }}>
            <strong>Planned:</strong>{' '}
            {sunday.lessonUrl ? <a href={sunday.lessonUrl}>{sunday.plannedTitle}</a> : sunday.plannedTitle}
          </p>
          <div className="actions" style={{ margin: '0 0 var(--space-2)' }}>
            <button
              type="button"
              className="button button--secondary"
              disabled={saving}
              onClick={() => onSave(sunday.date, 'taught', undefined, note)}
            >
              Mark taught
            </button>
            <button
              type="button"
              className="button button--secondary"
              disabled={saving}
              onClick={() => onSave(sunday.date, 'not_taught', undefined, note)}
            >
              Not taught
            </button>
          </div>
          <div className="match-row" style={{ borderBottom: 'none', padding: 0 }}>
            <label htmlFor={`swap-${sunday.date}`}>Or record a different lesson taught:</label>
            <select
              id={`swap-${sunday.date}`}
              value={swapId}
              onChange={(event) => setSwapId(event.target.value)}
            >
              <option value="">Choose a lesson</option>
              {lessonOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.id} · {option.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="button button--secondary"
              disabled={saving || !swapId}
              onClick={() => onSave(sunday.date, 'swapped', swapId, note)}
            >
              Record swap
            </button>
          </div>
          <label htmlFor={`note-${sunday.date}`} className="choice-hint">
            Note (optional):
          </label>
          <input
            id={`note-${sunday.date}`}
            type="text"
            className="self-check"
            style={{ minHeight: 'var(--tap-target)' }}
            value={note}
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
          />
          {entry?.actual_lesson_id && (
            <p className="choice-hint" style={{ marginTop: 'var(--space-1)' }}>
              Recorded swap: {entry.actual_lesson_id}
            </p>
          )}
        </>
      )}
    </li>
  );
}
