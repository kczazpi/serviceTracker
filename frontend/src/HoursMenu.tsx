import { useEffect, useRef, useState, type FormEvent } from 'react';
import { HOUR_PRESETS, MAX_HOURS, MIN_HOURS, parseCustomHours } from './hours';

interface Props {
  id: string;
  /** e.g. "Fri, Oct 16" */
  label: string;
  /** Hours currently logged for the day, or null when nothing is logged. */
  current: number | null;
  busy: boolean;
  /** False for days in the future: the hours can then only be cleared, never set. */
  allowSet: boolean;
  align: 'left' | 'right';
  onSelect: (hours: number) => void;
  onClear: () => void;
}

export default function HoursMenu({ id, label, current, busy, allowSet, align, onSelect, onClear }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const firstRun = useRef(true);

  // A logged value that isn't one of the presets (6.5 h, 24 h …) shows up under "Custom", already filled in.
  const hasCustomValue = current !== null && !(HOUR_PRESETS as readonly number[]).includes(current);
  const [customOpen, setCustomOpen] = useState(allowSet && hasCustomValue);
  const [text, setText] = useState(hasCustomValue ? String(current) : '');
  const customHours = parseCustomHours(text);

  // Keyboard users land on the current value (or the first option); opening "Custom" focuses its field.
  useEffect(() => {
    if (customOpen) {
      inputRef.current?.focus();
    } else if (firstRun.current) {
      const target =
        ref.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]') ??
        ref.current?.querySelector<HTMLButtonElement>('button');
      target?.focus();
    }
    firstRun.current = false;
  }, [customOpen]);

  function submitCustom(event: FormEvent) {
    event.preventDefault();
    if (customHours !== null) onSelect(customHours);
  }

  return (
    <div id={id} ref={ref} role="group" aria-label={`Hours for ${label}`} className={`hours-menu ${align}`}>
      {!allowSet && <p className="hint">This day hasn't happened yet, so hours can't be set for it.</p>}

      {allowSet && (
        <div className="hours-list">
          {HOUR_PRESETS.map((hours) => (
            <button
              key={hours}
              type="button"
              className={hours === current ? 'selected' : undefined}
              aria-pressed={hours === current}
              disabled={busy}
              onClick={() => onSelect(hours)}
            >
              {hours} h
            </button>
          ))}
          <button
            type="button"
            className={hasCustomValue ? 'selected' : undefined}
            aria-pressed={hasCustomValue}
            aria-expanded={customOpen}
            disabled={busy}
            onClick={() => setCustomOpen((open) => !open)}
          >
            Custom…
          </button>
        </div>
      )}

      {customOpen && (
        <form className="custom-form" onSubmit={submitCustom}>
          <label>
            Hours (up to {MAX_HOURS})
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              min={MIN_HOURS}
              max={MAX_HOURS}
              step="any"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <button type="submit" className="primary" disabled={busy || customHours === null}>
            Set
          </button>
        </form>
      )}

      {current !== null && (
        <button type="button" className={allowSet ? 'danger clear' : 'danger'} disabled={busy} onClick={onClear}>
          Clear day
        </button>
      )}
    </div>
  );
}
