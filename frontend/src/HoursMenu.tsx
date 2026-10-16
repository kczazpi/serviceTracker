import { useEffect, useRef } from 'react';
import { formatHours } from './dates';

/** 0.5, 1, 1.5 … 12 hours */
export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => (i + 1) / 2);

interface Props {
  id: string;
  /** e.g. "Fri, Oct 16" */
  label: string;
  /** Hours currently logged for the day, or null when nothing is logged. */
  current: number | null;
  busy: boolean;
  align: 'left' | 'right';
  onSelect: (hours: number) => void;
  onClear: () => void;
}

export default function HoursMenu({ id, label, current, busy, align, onSelect, onClear }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // A day logged with an unusual value (say 7.25 h, entered via the API) must still show up as selected.
  const options =
    current !== null && !HOUR_OPTIONS.includes(current)
      ? [...HOUR_OPTIONS, current].sort((a, b) => a - b)
      : HOUR_OPTIONS;

  // Keyboard users land on the current value, or on the first option for an empty day.
  useEffect(() => {
    const target =
      ref.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]') ??
      ref.current?.querySelector<HTMLButtonElement>('button');
    target?.focus();
  }, []);

  return (
    <div id={id} ref={ref} role="group" aria-label={`Hours for ${label}`} className={`hours-menu ${align}`}>
      <div className="hours-grid">
        {options.map((hours) => (
          <button
            key={hours}
            type="button"
            className={hours === current ? 'selected' : undefined}
            aria-pressed={hours === current}
            disabled={busy}
            onClick={() => onSelect(hours)}
          >
            {formatHours(hours)} h
          </button>
        ))}
      </div>
      {current !== null && (
        <button type="button" className="danger clear" disabled={busy} onClick={onClear}>
          Clear day
        </button>
      )}
    </div>
  );
}
