import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import TrackerPage from './TrackerPage';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  listWorkDays: vi.fn(),
  createWorkDay: vi.fn(),
  updateWorkDay: vi.fn(),
  deleteWorkDay: vi.fn(),
}));

const listWorkDays = vi.mocked(api.listWorkDays);
const createWorkDay = vi.mocked(api.createWorkDay);
const updateWorkDay = vi.mocked(api.updateWorkDay);
const deleteWorkDay = vi.mocked(api.deleteWorkDay);

const jane: api.User = {
  id: 'u1', username: 'jane', email: 'jane@example.com', name: 'Jane', surname: 'Doe',
  isActive: true, createdAt: '', updatedAt: '', lastLoginAt: null,
};

const day = (id: string, date: string, workedHours: number): api.WorkDay => ({ id, userId: 'u1', date, workedHours });

beforeEach(() => {
  listWorkDays.mockReset();
  createWorkDay.mockReset();
  updateWorkDay.mockReset();
  deleteWorkDay.mockReset();
  // "Today" is Fri 16 Oct 2026. Only Date is faked so promises and timers keep working.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 16, 12));
});

afterEach(() => vi.useRealTimers());

const renderPage = (onLogout = vi.fn()) => render(<TrackerPage user={jane} onLogout={onLogout} />);

/** A day cell, found by its label, e.g. dayCell('Fri, Oct 16'). */
const dayCell = (label: string) => screen.findByRole('button', { name: new RegExp(`^${label},`) });
const menuFor = (label: string) => screen.getByRole('group', { name: `Hours for ${label}` });
const anyMenu = () => screen.queryByRole('group', { name: /^Hours for/ });

describe('calendar', () => {
  it('shows every day of the month, in a grid that starts on Monday', async () => {
    listWorkDays.mockResolvedValue([]);

    renderPage();
    await dayCell('Thu, Oct 1');

    expect(listWorkDays).toHaveBeenCalledWith('2026-10-01', '2026-10-31');
    expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /, (nothing logged|[\d.]+ h logged)$/ })).toHaveLength(31);
    expect(screen.getAllByText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/).map((e) => e.textContent)).toEqual([
      'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
    ]);
  });

  it('turns days that have hours green and shows the hours on them', async () => {
    listWorkDays.mockResolvedValue([day('a', '2026-10-15', 8), day('b', '2026-10-16', 6.5)]);

    renderPage();

    const thursday = await dayCell('Thu, Oct 15');
    expect(thursday).toHaveClass('logged');
    expect(thursday).toHaveTextContent('8 h');
    expect(await dayCell('Fri, Oct 16')).toHaveClass('logged');
    expect(await dayCell('Fri, Oct 16')).toHaveTextContent('6.5 h');

    const saturday = await dayCell('Sat, Oct 17');
    expect(saturday).not.toHaveClass('logged');
    expect(saturday).not.toHaveTextContent('h');
  });

  it('summarises the month', async () => {
    listWorkDays.mockResolvedValue([day('a', '2026-10-15', 8), day('b', '2026-10-16', 6.5)]);

    renderPage();

    expect(await screen.findByText('2 days logged · 14.5 h')).toBeInTheDocument();
  });

  it('highlights today', async () => {
    listWorkDays.mockResolvedValue([]);

    renderPage();

    expect(await dayCell('Fri, Oct 16')).toHaveAttribute('aria-current', 'date');
    expect(await dayCell('Thu, Oct 15')).not.toHaveAttribute('aria-current');
  });

  it("can't be clicked while the month is loading", async () => {
    listWorkDays.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(await dayCell('Fri, Oct 16')).toBeDisabled();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows the error when the month cannot be loaded', async () => {
    listWorkDays.mockRejectedValue(new api.ApiError(0, ['Cannot reach the server. Is the API running?']));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
  });
});

describe('logging hours', () => {
  it('opens a menu of hours when a day is clicked, and logs the chosen hours (the day turns green)', async () => {
    listWorkDays.mockResolvedValue([]);
    createWorkDay.mockResolvedValue(day('n', '2026-10-17', 8));
    const user = userEvent.setup();
    renderPage();

    const saturday = await dayCell('Sat, Oct 17');
    expect(saturday).not.toHaveClass('logged');
    await user.click(saturday);
    await user.click(within(menuFor('Sat, Oct 17')).getByRole('button', { name: '8 h' }));

    expect(createWorkDay).toHaveBeenCalledWith('2026-10-17', 8);
    const logged = await screen.findByRole('button', { name: /^Sat, Oct 17, 8 h logged/ });
    expect(logged).toHaveClass('logged');
    expect(logged).toHaveTextContent('8 h');
    expect(anyMenu()).not.toBeInTheDocument();
    expect(logged).toHaveFocus();
    expect(screen.getByText('1 day logged · 8 h')).toBeInTheDocument();
  });

  it('offers half hour steps from 0.5 to 12 hours', async () => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Mon, Oct 5'));

    const options = within(menuFor('Mon, Oct 5')).getAllByRole('button').map((b) => b.textContent);
    expect(options).toHaveLength(24);
    expect(options[0]).toBe('0.5 h');
    expect(options[1]).toBe('1 h');
    expect(options[15]).toBe('8 h');
    expect(options[23]).toBe('12 h');
  });

  it('changes the hours of a logged day, which stays green', async () => {
    listWorkDays.mockResolvedValue([day('a', '2026-10-15', 8)]);
    updateWorkDay.mockResolvedValue(day('a', '2026-10-15', 6));
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Thu, Oct 15'));
    const menu = menuFor('Thu, Oct 15');
    expect(within(menu).getByRole('button', { name: '8 h' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(menu).getByRole('button', { name: '6 h' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(within(menu).getByRole('button', { name: '6 h' }));

    expect(updateWorkDay).toHaveBeenCalledWith('a', 6);
    expect(createWorkDay).not.toHaveBeenCalled();
    const cell = await screen.findByRole('button', { name: /^Thu, Oct 15, 6 h logged/ });
    expect(cell).toHaveClass('logged');
    expect(screen.getByText('1 day logged · 6 h')).toBeInTheDocument();
  });

  it('does not call the API when the same hours are chosen again', async () => {
    listWorkDays.mockResolvedValue([day('a', '2026-10-15', 8)]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Thu, Oct 15'));
    await user.click(within(menuFor('Thu, Oct 15')).getByRole('button', { name: '8 h' }));

    expect(updateWorkDay).not.toHaveBeenCalled();
    expect(createWorkDay).not.toHaveBeenCalled();
    expect(anyMenu()).not.toBeInTheDocument();
  });

  it('clears a logged day, which stops being green', async () => {
    listWorkDays.mockResolvedValue([day('a', '2026-10-15', 8)]);
    deleteWorkDay.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Thu, Oct 15'));
    await user.click(within(menuFor('Thu, Oct 15')).getByRole('button', { name: 'Clear day' }));

    expect(deleteWorkDay).toHaveBeenCalledWith('a');
    const cell = await screen.findByRole('button', { name: /^Thu, Oct 15, nothing logged/ });
    expect(cell).not.toHaveClass('logged');
    expect(screen.getByText('0 days logged · 0 h')).toBeInTheDocument();
  });

  it('has no "Clear day" for a day without hours', async () => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Thu, Oct 15'));

    expect(within(menuFor('Thu, Oct 15')).queryByRole('button', { name: 'Clear day' })).not.toBeInTheDocument();
  });

  it('keeps the menu open, shows the error and does not turn the day green when saving fails', async () => {
    listWorkDays.mockResolvedValue([]);
    createWorkDay.mockRejectedValue(new api.ApiError(409, ['A work day already exists for this date.']));
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Sat, Oct 17'));
    await user.click(within(menuFor('Sat, Oct 17')).getByRole('button', { name: '8 h' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A work day already exists for this date.');
    expect(menuFor('Sat, Oct 17')).toBeInTheDocument();
    expect(await dayCell('Sat, Oct 17')).not.toHaveClass('logged');
  });

  it('shows an unusual stored value (7.25 h) as the selected option', async () => {
    listWorkDays.mockResolvedValue([day('a', '2026-10-15', 7.25)]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Thu, Oct 15'));

    expect(within(menuFor('Thu, Oct 15')).getByRole('button', { name: '7.25 h' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('the hours menu', () => {
  it('puts keyboard focus on the current value, or the first option for an empty day', async () => {
    listWorkDays.mockResolvedValue([day('a', '2026-10-15', 8)]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Thu, Oct 15'));
    expect(within(menuFor('Thu, Oct 15')).getByRole('button', { name: '8 h' })).toHaveFocus();

    await user.click(await dayCell('Fri, Oct 16'));
    expect(within(menuFor('Fri, Oct 16')).getByRole('button', { name: '0.5 h' })).toHaveFocus();
  });

  it('closes with Escape and gives focus back to the day', async () => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();
    const cell = await dayCell('Sat, Oct 17');

    await user.click(cell);
    expect(menuFor('Sat, Oct 17')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(anyMenu()).not.toBeInTheDocument();
    expect(cell).toHaveFocus();
    expect(createWorkDay).not.toHaveBeenCalled();
  });

  it('closes when the day is clicked again', async () => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();
    const cell = await dayCell('Sat, Oct 17');

    await user.click(cell);
    await user.click(cell);

    expect(anyMenu()).not.toBeInTheDocument();
  });

  it('closes when the user clicks elsewhere', async () => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Sat, Oct 17'));
    await user.click(screen.getByRole('heading', { name: 'October 2026' }));

    expect(anyMenu()).not.toBeInTheDocument();
  });

  it('is open for one day at a time', async () => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Thu, Oct 15'));
    await user.click(await dayCell('Fri, Oct 16'));

    const menus = screen.getAllByRole('group', { name: /^Hours for/ });
    expect(menus).toHaveLength(1);
    expect(menus[0]).toHaveAccessibleName('Hours for Fri, Oct 16');
  });
});

describe('navigation', () => {
  it('moves between months, closing an open menu', async () => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();
    await user.click(await dayCell('Sat, Oct 17'));
    expect(menuFor('Sat, Oct 17')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next month' }));

    expect(await screen.findByRole('heading', { name: 'November 2026' })).toBeInTheDocument();
    expect(listWorkDays).toHaveBeenLastCalledWith('2026-11-01', '2026-11-30');
    expect(await dayCell('Sun, Nov 1')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /, (nothing logged|[\d.]+ h logged)$/ })).toHaveLength(30);
    expect(anyMenu()).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
  });

  // A mouse click on the arrows closes the menu via the click-outside handler; the keyboard does not
  // go through it, so changing month has to close the menu itself.
  it('closes an open menu when the month is changed with the keyboard, and it stays closed', async () => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();
    await user.click(await dayCell('Sat, Oct 17'));
    expect(menuFor('Sat, Oct 17')).toBeInTheDocument();

    screen.getByRole('button', { name: 'Next month' }).focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('heading', { name: 'November 2026' })).toBeInTheDocument();

    screen.getByRole('button', { name: 'Previous month' }).focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
    expect(await dayCell('Sat, Oct 17')).toBeInTheDocument();
    expect(anyMenu()).not.toBeInTheDocument();
  });

  it('shows the user and signs out', async () => {
    listWorkDays.mockResolvedValue([]);
    const onLogout = vi.fn();
    const user = userEvent.setup();
    renderPage(onLogout);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(onLogout).toHaveBeenCalledOnce();
  });
});
