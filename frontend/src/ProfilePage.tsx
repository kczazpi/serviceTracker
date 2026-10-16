import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, listWorkDays, type User, type WorkDay } from './api';
import { formatDate, formatDayLabel, formatHours, todayIso } from './dates';
import ErrorList from './ErrorList';
import { computeStats } from './stats';

const pluralDays = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

export default function ProfilePage({ user }: { user: User }) {
  const [days, setDays] = useState<WorkDay[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    listWorkDays() // no range: every day the user has ever logged
      .then((items) => {
        if (!cancelled) setDays(items);
      })
      .catch((err) => {
        if (!cancelled) setErrors(err instanceof ApiError ? err.messages : ['Something went wrong.']);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const memberSince = formatDate(user.createdAt);
  const lastSignIn = user.lastLoginAt ? formatDate(user.lastLoginAt) : '';
  const accountDates = [memberSince && `Member since ${memberSince}`, lastSignIn && `Last sign-in ${lastSignIn}`]
    .filter(Boolean)
    .join(' · ');

  const stats = useMemo(() => (days ? computeStats(days, todayIso()) : null), [days]);
  const tallest = stats ? Math.max(...stats.recentMonths.map((m) => m.hours)) : 0;

  return (
    <main className="card profile">
      <h1>
        {user.name} {user.surname}
      </h1>
      <p className="muted">
        @{user.username} · {user.email}
      </p>
      {accountDates && <p className="muted">{accountDates}</p>}

      <h2>Your hours</h2>
      <ErrorList messages={errors} />

      {!stats && errors.length === 0 && <p className="muted">Loading…</p>}

      {stats && stats.totalDays === 0 && (
        <p className="muted">
          You haven't logged any hours yet. Head to the <Link to="/">calendar</Link> and click a day to start.
        </p>
      )}

      {stats && stats.totalDays > 0 && (
        <>
          <dl className="stats">
            <Stat label="Hours worked, all time" value={`${formatHours(stats.totalHours)} h`} />
            <Stat label="Days logged" value={String(stats.totalDays)} />
            <Stat label="Hours this month" value={`${formatHours(stats.monthHours)} h`} />
            <Stat label="Days logged this month" value={String(stats.monthDays)} />
            <Stat label="Hours this year" value={`${formatHours(stats.yearHours)} h`} />
            <Stat label="Average per day" value={`${formatHours(stats.averageHours)} h`} />
            <Stat
              label="Longest day"
              value={`${formatHours(stats.longestDay!.hours)} h`}
              note={formatDayLabel(stats.longestDay!.date)}
            />
            <Stat label="Current streak" value={pluralDays(stats.currentStreak)} />
            <Stat label="Longest streak" value={pluralDays(stats.longestStreak)} />
          </dl>

          <h2>Last 6 months</h2>
          <ol className="months">
            {stats.recentMonths.map((m) => (
              <li key={`${m.year}-${m.month}`} title={`${m.label} ${m.year}`}>
                <span className="value">{formatHours(m.hours)} h</span>
                <span className="bar-track">
                  <span className="bar" style={{ height: `${tallest > 0 ? (m.hours / tallest) * 100 : 0}%` }} />
                </span>
                <span className="label">{m.label}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </main>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd>
        {value}
        {note && <span className="note">{note}</span>}
      </dd>
    </div>
  );
}
