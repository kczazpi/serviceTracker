import { fireEvent, render, screen, within } from '@testing-library/react';
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

const renderPage = () => render(<TrackerPage />);

/** A day cell, found by its label, e.g. dayCell('Fri, Oct 16'). */
const dayCell = (label: string) => screen.findByRole('button', { name: new RegExp(`^${label},`) });
const menuFor = (label: string) => screen.getByRole('group', { name: `Hours for ${label}` });
const anyMenu = () => screen.queryByRole('group', { name: /^Hours for/ });
const customField = () => screen.getByLabelText(/^Hours \(up to 24\)/);
const ALL_CELLS = /, (nothing logged|[\d.]+ h logged)$/;

describe('calendar', () => {
  it('shows every day of the month, in a grid that starts on Monday', async () => {
    listWorkDays.mockResolvedValue([]);

    renderPage();
    await dayCell('Thu, Oct 1');

    expect(listWorkDays).toHaveBeenCalledWith('2026-10-01', '2026-10-31');
    expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: ALL_CELLS })).toHaveLength(31);
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

    const wednesday = await dayCell('Wed, Oct 14');
    expect(wednesday).not.toHaveClass('logged');
    expect(wednesday).not.toHaveTextContent('h');
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

    expect(await dayCell('Thu, Oct 15')).toBeDisabled();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows the error when the month cannot be loaded', async () => {
    listWorkDays.mockRejectedValue(new api.ApiError(0, ['Cannot reach the server. Is the API running?']));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
  });
});

describe('days in the future', () => {
  it("can't be picked: only today and earlier days are clickable", async () => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();

    expect(await dayCell('Fri, Oct 16')).toBeEnabled(); // today
    expect(await dayCell('Thu, Oct 15')).toBeEnabled();
    const tomorrow = await dayCell('Sat, Oct 17');
    expect(tomorrow).toBeDisabled();
    expect(tomorrow).toHaveClass('future');
    expect(await dayCell('Sat, Oct 31')).toBeDisabled();

    await user.click(tomorrow);
    expect(anyMenu()).not.toBeInTheDocument();
    expect(createWorkDay).not.toHaveBeenCalled();
  });

  it('can be looked at: the next month opens, with every day locked', async () => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();
    await dayCell('Thu, Oct 1');

    expect(screen.getByRole('button', { name: 'Next month' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Next month' }));

    expect(await screen.findByRole('heading', { name: 'November 2026' })).toBeInTheDocument();
    expect(listWorkDays).toHaveBeenLastCalledWith('2026-11-01', '2026-11-30');
    const cells = await screen.findAllByRole('button', { name: ALL_CELLS });
    expect(cells).toHaveLength(30);
    expect(cells.every((cell) => (cell as HTMLButtonElement).disabled)).toBe(true);
    expect(cells.every((cell) => cell.classList.contains('future'))).toBe(true);

    await user.click(await dayCell('Sun, Nov 1'));
    await user.click(await dayCell('Mon, Nov 30'));
    expect(anyMenu()).not.toBeInTheDocument();
    expect(createWorkDay).not.toHaveBeenCalled();
    expect(screen.getByText('0 days logged · 0 h')).toBeInTheDocument();
  });

  it('can be browsed freely in both directions, and the past stays open', async () => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();
    await dayCell('Thu, Oct 1');

    await user.click(screen.getByRole('button', { name: 'Next month' }));
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(await screen.findByRole('heading', { name: 'December 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(await screen.findByRole('heading', { name: 'September 2026' })).toBeInTheDocument();
    expect(listWorkDays).toHaveBeenLastCalledWith('2026-09-01', '2026-09-30');
    expect((await dayCell('Wed, Sep 30')).hasAttribute('disabled')).toBe(false);
  });

  it('only offers to clear hours that are already there (they can never be set)', async () => {
    listWorkDays.mockResolvedValue([day('f', '2026-10-20', 4)]);
    deleteWorkDay.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    const cell = await dayCell('Tue, Oct 20');
    expect(cell).toBeEnabled();
    expect(cell).toHaveClass('logged');
    await user.click(cell);

    const menu = menuFor('Tue, Oct 20');
    expect(within(menu).getAllByRole('button').map((b) => b.textContent)).toEqual(['Clear day']);
    expect(within(menu).getByRole('button', { name: 'Clear day' })).toHaveFocus();
    expect(within(menu).getByText(/can't be set/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Hours \(up to/)).not.toBeInTheDocument();

    await user.click(within(menu).getByRole('button', { name: 'Clear day' }));
    expect(deleteWorkDay).toHaveBeenCalledWith('f');
    expect(updateWorkDay).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: /^Tue, Oct 20, nothing logged/ })).toBeDisabled();
  });

  it('shows the same clear-only menu for a future day with a non-preset value', async () => {
    listWorkDays.mockResolvedValue([day('f', '2026-10-20', 6.5)]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Tue, Oct 20'));

    const menu = menuFor('Tue, Oct 20');
    expect(within(menu).getAllByRole('button').map((b) => b.textContent)).toEqual(['Clear day']);
    expect(within(menu).getByRole('button', { name: 'Clear day' })).toHaveFocus();
  });

  it('logged future days of the next month work the same way', async () => {
    listWorkDays.mockImplementation(async (from) => (from === '2026-11-01' ? [day('n', '2026-11-05', 8)] : []));
    const user = userEvent.setup();
    renderPage();
    await dayCell('Thu, Oct 1');

    await user.click(screen.getByRole('button', { name: 'Next month' }));
    const cell = await dayCell('Thu, Nov 5');
    expect(cell).toHaveClass('logged');
    expect(cell).toBeEnabled();
    expect(await dayCell('Fri, Nov 6')).toBeDisabled();
    await user.click(cell);

    expect(within(menuFor('Thu, Nov 5')).getAllByRole('button').map((b) => b.textContent)).toEqual(['Clear day']);
  });
});

describe('logging hours', () => {
  it('offers 1, 2, 4, 8 and 12 hours or a custom value', async () => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Mon, Oct 5'));

    const options = within(menuFor('Mon, Oct 5')).getAllByRole('button').map((b) => b.textContent);
    expect(options).toEqual(['1 h', '2 h', '4 h', '8 h', '12 h', 'Custom…']);
    expect(screen.queryByLabelText(/^Hours \(up to/)).not.toBeInTheDocument();
  });

  it('logs the chosen preset and turns the day green', async () => {
    listWorkDays.mockResolvedValue([]);
    createWorkDay.mockResolvedValue(day('n', '2026-10-10', 8));
    const user = userEvent.setup();
    renderPage();

    const saturday = await dayCell('Sat, Oct 10');
    expect(saturday).not.toHaveClass('logged');
    await user.click(saturday);
    await user.click(within(menuFor('Sat, Oct 10')).getByRole('button', { name: '8 h' }));

    expect(createWorkDay).toHaveBeenCalledWith('2026-10-10', 8);
    const logged = await screen.findByRole('button', { name: /^Sat, Oct 10, 8 h logged/ });
    expect(logged).toHaveClass('logged');
    expect(logged).toHaveTextContent('8 h');
    expect(anyMenu()).not.toBeInTheDocument();
    expect(logged).toHaveFocus();
    expect(screen.getByText('1 day logged · 8 h')).toBeInTheDocument();
  });

  it('logs a custom number of hours', async () => {
    listWorkDays.mockResolvedValue([]);
    createWorkDay.mockResolvedValue(day('n', '2026-10-10', 6.5));
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Sat, Oct 10'));
    await user.click(within(menuFor('Sat, Oct 10')).getByRole('button', { name: 'Custom…' }));
    expect(customField()).toHaveFocus();
    const set = within(menuFor('Sat, Oct 10')).getByRole('button', { name: 'Set' });
    expect(set).toBeDisabled();
    await user.type(customField(), '6.5');
    expect(set).toBeEnabled();
    await user.click(set);

    expect(createWorkDay).toHaveBeenCalledWith('2026-10-10', 6.5);
    const logged = await screen.findByRole('button', { name: /^Sat, Oct 10, 6.5 h logged/ });
    expect(logged).toHaveClass('logged');
  });

  it('submits a custom value with Enter', async () => {
    listWorkDays.mockResolvedValue([]);
    createWorkDay.mockResolvedValue(day('n', '2026-10-10', 3));
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Sat, Oct 10'));
    await user.click(within(menuFor('Sat, Oct 10')).getByRole('button', { name: 'Custom…' }));
    await user.type(customField(), '3{Enter}');

    expect(createWorkDay).toHaveBeenCalledWith('2026-10-10', 3);
  });

  it.each(['0', '-2', '24.5', '25'])('does not accept %s hours as a custom value', async (text) => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Sat, Oct 10'));
    await user.click(within(menuFor('Sat, Oct 10')).getByRole('button', { name: 'Custom…' }));
    await user.type(customField(), `${text}{Enter}`);

    expect(within(menuFor('Sat, Oct 10')).getByRole('button', { name: 'Set' })).toBeDisabled();
    expect(createWorkDay).not.toHaveBeenCalled();
  });

  // The disabled "Set" button already stops Enter; this checks the guard behind it.
  it.each(['25', '0', ''])('never saves an invalid custom value (%j), even if the form is submitted directly', async (text) => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Sat, Oct 10'));
    await user.click(within(menuFor('Sat, Oct 10')).getByRole('button', { name: 'Custom…' }));
    if (text) await user.type(customField(), text);
    fireEvent.submit(customField().closest('form')!);

    expect(createWorkDay).not.toHaveBeenCalled();
  });

  it('accepts the limits, 0.01 and 24 hours', async () => {
    listWorkDays.mockResolvedValue([]);
    createWorkDay.mockResolvedValue(day('n', '2026-10-10', 24));
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Sat, Oct 10'));
    await user.click(within(menuFor('Sat, Oct 10')).getByRole('button', { name: 'Custom…' }));
    await user.type(customField(), '24');
    await user.click(within(menuFor('Sat, Oct 10')).getByRole('button', { name: 'Set' }));

    expect(createWorkDay).toHaveBeenCalledWith('2026-10-10', 24);
  });

  it('changes the hours of a logged day, which stays green', async () => {
    listWorkDays.mockResolvedValue([day('a', '2026-10-15', 8)]);
    updateWorkDay.mockResolvedValue(day('a', '2026-10-15', 4));
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Thu, Oct 15'));
    const menu = menuFor('Thu, Oct 15');
    expect(within(menu).getByRole('button', { name: '8 h' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(menu).getByRole('button', { name: '4 h' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(menu).getByRole('button', { name: 'Custom…' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(within(menu).getByRole('button', { name: '4 h' }));

    expect(updateWorkDay).toHaveBeenCalledWith('a', 4);
    expect(createWorkDay).not.toHaveBeenCalled();
    const cell = await screen.findByRole('button', { name: /^Thu, Oct 15, 4 h logged/ });
    expect(cell).toHaveClass('logged');
    expect(screen.getByText('1 day logged · 4 h')).toBeInTheDocument();
  });

  it.each([24, 6.5])('shows a stored value that is not a preset (%s h) under Custom, filled in', async (hours) => {
    listWorkDays.mockResolvedValue([day('a', '2026-10-16', hours)]);
    updateWorkDay.mockResolvedValue(day('a', '2026-10-16', 8));
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Fri, Oct 16'));

    const menu = menuFor('Fri, Oct 16');
    expect(within(menu).getByRole('button', { name: 'Custom…' })).toHaveAttribute('aria-pressed', 'true');
    expect(customField()).toHaveValue(hours);
    expect(customField()).toHaveFocus();
    for (const preset of ['1 h', '2 h', '4 h', '8 h', '12 h']) {
      expect(within(menu).getByRole('button', { name: preset })).toHaveAttribute('aria-pressed', 'false');
    }

    await user.click(within(menu).getByRole('button', { name: '8 h' }));
    expect(updateWorkDay).toHaveBeenCalledWith('a', 8);
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

    await user.click(await dayCell('Sat, Oct 10'));
    await user.click(within(menuFor('Sat, Oct 10')).getByRole('button', { name: '8 h' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A work day already exists for this date.');
    expect(menuFor('Sat, Oct 10')).toBeInTheDocument();
    expect(await dayCell('Sat, Oct 10')).not.toHaveClass('logged');
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
    expect(within(menuFor('Fri, Oct 16')).getByRole('button', { name: '1 h' })).toHaveFocus();
  });

  it('closes with Escape and gives focus back to the day', async () => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();
    const cell = await dayCell('Sat, Oct 10');

    await user.click(cell);
    expect(menuFor('Sat, Oct 10')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(anyMenu()).not.toBeInTheDocument();
    expect(cell).toHaveFocus();
    expect(createWorkDay).not.toHaveBeenCalled();
  });

  it('closes with Escape from the custom field too', async () => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Sat, Oct 10'));
    await user.click(within(menuFor('Sat, Oct 10')).getByRole('button', { name: 'Custom…' }));
    await user.type(customField(), '5');
    await user.keyboard('{Escape}');

    expect(anyMenu()).not.toBeInTheDocument();
    expect(createWorkDay).not.toHaveBeenCalled();
  });

  it('closes when the day is clicked again', async () => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();
    const cell = await dayCell('Sat, Oct 10');

    await user.click(cell);
    await user.click(cell);

    expect(anyMenu()).not.toBeInTheDocument();
  });

  it('closes when the user clicks elsewhere', async () => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await dayCell('Sat, Oct 10'));
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

  it('closes when the month is changed with the mouse', async () => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();
    await user.click(await dayCell('Sat, Oct 10'));

    await user.click(screen.getByRole('button', { name: 'Previous month' }));

    expect(await screen.findByRole('heading', { name: 'September 2026' })).toBeInTheDocument();
    expect(await dayCell('Wed, Sep 30')).toBeInTheDocument();
    expect(anyMenu()).not.toBeInTheDocument();
  });

  // A mouse click on the arrows closes the menu via the click-outside handler; the keyboard does not
  // go through it, so changing month has to close the menu itself.
  it('closes when the month is changed with the keyboard, and stays closed on the way back', async () => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();
    await user.click(await dayCell('Sat, Oct 10'));
    expect(menuFor('Sat, Oct 10')).toBeInTheDocument();

    screen.getByRole('button', { name: 'Previous month' }).focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('heading', { name: 'September 2026' })).toBeInTheDocument();

    screen.getByRole('button', { name: 'Next month' }).focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
    expect(await dayCell('Sat, Oct 10')).toBeInTheDocument();
    expect(anyMenu()).not.toBeInTheDocument();
  });
});
