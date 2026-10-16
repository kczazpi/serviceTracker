import { useEffect, useRef } from 'react';
import type { WorkDay } from './api';
import {
  WEEKDAY_LABELS,
  dayOfMonth,
  daysInMonth,
  formatDayLabel,
  formatHours,
  weekdayOffset,
  type YearMonth,
} from './dates';
import HoursMenu from './HoursMenu';

interface CalendarProps {
  month: YearMonth;
  daysByDate: Map<string, WorkDay>;
  /** Today as yyyy-MM-dd, to highlight it. */
  today: string;
  /** The day whose hours menu is open, if any. Only one can be open at a time. */
  openDate: string | null;
  /** Days can't be clicked while the month is loading. */
  loading: boolean;
  /** A save is in flight: the menu buttons are disabled. */
  busy: boolean;
  onOpen: (date: string | null) => void;
  onSelectHours: (date: string, hours: number) => void;
  onClear: (date: string) => void;
}

export default function Calendar({
  month,
  daysByDate,
  today,
  openDate,
  loading,
  busy,
  onOpen,
  onSelectHours,
  onClear,
}: CalendarProps) {
  const offset = weekdayOffset(month);

  return (
    <div className="calendar">
      {WEEKDAY_LABELS.map((label) => (
        <div key={label} className="weekday" aria-hidden="true">
          {label}
        </div>
      ))}

      {Array.from({ length: offset }, (_, i) => (
        <div key={`blank-${i}`} aria-hidden="true" />
      ))}

      {daysInMonth(month).map((date, index) => (
        <DayCell
          key={date}
          date={date}
          workDay={daysByDate.get(date)}
          column={(offset + index) % 7}
          isToday={date === today}
          today={today}
          open={openDate === date}
          loading={loading}
          busy={busy}
          onToggle={() => onOpen(openDate === date ? null : date)}
          onClose={() => onOpen(null)}
          onSelectHours={(hours) => onSelectHours(date, hours)}
          onClear={() => onClear(date)}
        />
      ))}
    </div>
  );
}

interface DayCellProps {
  date: string;
  workDay: WorkDay | undefined;
  /** 0 = Monday … 6 = Sunday; the menu of the last columns opens towards the left so it stays on screen. */
  column: number;
  isToday: boolean;
  /** Today as yyyy-MM-dd: later days can't be logged. */
  today: string;
  open: boolean;
  loading: boolean;
  busy: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelectHours: (hours: number) => void;
  onClear: () => void;
}

function DayCell({
  date,
  workDay,
  column,
  isToday,
  today,
  open,
  loading,
  busy,
  onToggle,
  onClose,
  onSelectHours,
  onClear,
}: DayCellProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  const label = formatDayLabel(date);
  const menuId = `hours-menu-${date}`;
  const hours = workDay ? formatHours(workDay.workedHours) : null;
  // Hours can't be set for a day that hasn't happened yet. A future day that somehow already has hours
  // (entered some other way) stays clickable, but its menu can only clear them.
  const isFuture = date > today;

  // Close when the user presses anywhere outside this day (including on another day, which then opens).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, onClose]);

  // After the menu closes (an option was picked, or Escape), hand focus back to the day.
  useEffect(() => {
    if (wasOpen.current && !open) {
      const active = document.activeElement;
      if (active === document.body || wrapperRef.current?.contains(active)) buttonRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  const className = ['day', workDay && 'logged', isToday && 'today', isFuture && !workDay && 'future', column >= 5 && 'weekend']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className="day-wrapper"
      ref={wrapperRef}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          onClose();
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className={className}
        aria-label={`${label}, ${hours ? `${hours} h logged` : 'nothing logged'}`}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-current={isToday ? 'date' : undefined}
        disabled={loading || (isFuture && !workDay)}
        onClick={onToggle}
      >
        <span className="num">{dayOfMonth(date)}</span>
        {hours && <span className="hours">{hours} h</span>}
      </button>

      {open && (
        <HoursMenu
          id={menuId}
          label={label}
          current={workDay ? workDay.workedHours : null}
          allowSet={!isFuture}
          busy={busy}
          align={column >= 4 ? 'right' : 'left'}
          onSelect={onSelectHours}
          onClear={onClear}
        />
      )}
    </div>
  );
}
