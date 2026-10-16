import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import ProfilePage from './ProfilePage';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  listWorkDays: vi.fn(),
}));

const listWorkDays = vi.mocked(api.listWorkDays);

const jane: api.User = {
  id: 'u1', username: 'jane', email: 'jane@example.com', name: 'Jane', surname: 'Doe', isActive: true,
  createdAt: '2026-10-15T12:00:00Z', updatedAt: '', lastLoginAt: '2026-10-16T08:30:00Z',
};

const day = (date: string, workedHours: number): api.WorkDay => ({ id: date, userId: 'u1', date, workedHours });

beforeEach(() => {
  listWorkDays.mockReset();
  vi.useFakeTimers({ toFake: ['Date'] }); // today: Fri 16 Oct 2026
  vi.setSystemTime(new Date(2026, 9, 16, 12));
});

afterEach(() => vi.useRealTimers());

const renderPage = (user = jane) =>
  render(
    <MemoryRouter>
      <ProfilePage user={user} />
    </MemoryRouter>,
  );

const stat = (label: string) => screen.getByText(label).closest('.stat') as HTMLElement;

describe('ProfilePage', () => {
  it('shows who the user is', async () => {
    listWorkDays.mockResolvedValue([]);

    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.getByText('@jane · jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Member since Oct 15, 2026 · Last sign-in Oct 16, 2026')).toBeInTheDocument();
    await screen.findByText(/haven't logged any hours yet/);
  });

  it('leaves out the last sign-in when there is none', async () => {
    listWorkDays.mockResolvedValue([]);

    renderPage({ ...jane, lastLoginAt: null });

    expect(screen.getByText('Member since Oct 15, 2026')).toBeInTheDocument();
    await screen.findByText(/haven't logged any hours yet/);
  });

  it('still renders when a date from the API is missing or malformed', async () => {
    listWorkDays.mockResolvedValue([]);

    renderPage({ ...jane, createdAt: '', lastLoginAt: 'garbage' });

    expect(screen.getByRole('heading', { level: 1, name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.queryByText(/Member since|Last sign-in/)).not.toBeInTheDocument();
    await screen.findByText(/haven't logged any hours yet/);
  });

  it('loads every logged day, not just one month', async () => {
    listWorkDays.mockResolvedValue([]);

    renderPage();
    await screen.findByText(/haven't logged any hours yet/);

    expect(listWorkDays).toHaveBeenCalledWith();
  });

  it("shows the user's statistics", async () => {
    listWorkDays.mockResolvedValue([
      day('2025-12-31', 7),
      day('2026-01-05', 8),
      day('2026-09-30', 8),
      day('2026-10-14', 4),
      day('2026-10-15', 12),
      day('2026-10-16', 6.5),
    ]);

    renderPage();
    await screen.findByText('Hours worked, all time');

    expect(stat('Hours worked, all time')).toHaveTextContent('45.5 h');
    expect(stat('Days logged')).toHaveTextContent('6');
    expect(stat('Hours this month')).toHaveTextContent('22.5 h');
    expect(stat('Days logged this month')).toHaveTextContent('3');
    expect(stat('Hours this year')).toHaveTextContent('38.5 h');
    expect(stat('Average per day')).toHaveTextContent('7.58 h');
    expect(stat('Longest day')).toHaveTextContent('12 h');
    expect(stat('Longest day')).toHaveTextContent('Thu, Oct 15');
    expect(stat('Current streak')).toHaveTextContent('3 days');
    expect(stat('Longest streak')).toHaveTextContent('3 days');
  });

  it('uses the singular for a streak of one day', async () => {
    listWorkDays.mockResolvedValue([day('2026-10-16', 8)]);

    renderPage();
    await screen.findByText('Hours worked, all time');

    expect(stat('Current streak')).toHaveTextContent('1 day');
    expect(stat('Current streak')).not.toHaveTextContent('1 days');
  });

  it('charts the last six months', async () => {
    listWorkDays.mockResolvedValue([day('2026-09-30', 8), day('2026-10-14', 4), day('2026-10-15', 12)]);

    renderPage();
    await screen.findByRole('heading', { name: 'Last 6 months' });

    const months = screen.getAllByRole('listitem');
    expect(months.map((m) => within(m).getByText(/^(May|Jun|Jul|Aug|Sep|Oct)$/).textContent)).toEqual([
      'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct',
    ]);
    expect(months.map((m) => m.querySelector('.value')!.textContent)).toEqual([
      '0 h', '0 h', '0 h', '0 h', '8 h', '16 h',
    ]);
  });

  it('invites a new user to log their first day', async () => {
    listWorkDays.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByRole('link', { name: 'calendar' })).toHaveAttribute('href', '/');
    expect(screen.queryByText('Hours worked, all time')).not.toBeInTheDocument();
  });

  it('shows an error when the days cannot be loaded', async () => {
    listWorkDays.mockRejectedValue(new api.ApiError(0, ['Cannot reach the server. Is the API running?']));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });
});
