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

describe('TrackerPage', () => {
  it("loads the current month and shows the days with the month's total", async () => {
    listWorkDays.mockResolvedValue([day('a', '2026-10-15', 8), day('b', '2026-10-16', 6.5)]);

    renderPage();

    expect(await screen.findByText('Thu, Oct 15')).toBeInTheDocument();
    expect(screen.getByText('Fri, Oct 16')).toBeInTheDocument();
    expect(listWorkDays).toHaveBeenCalledWith('2026-10-01', '2026-10-31');
    expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
    expect(screen.getByText('14.5 h')).toBeInTheDocument();
    expect(screen.getByText('2 days')).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    listWorkDays.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('No work days logged for this month.')).toBeInTheDocument();
  });

  it('adds a day, defaulting the date to today, and keeps the list sorted', async () => {
    listWorkDays.mockResolvedValue([day('a', '2026-10-20', 4)]);
    createWorkDay.mockResolvedValue(day('b', '2026-10-16', 7));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Tue, Oct 20');

    expect(screen.getByLabelText('Date')).toHaveValue('2026-10-16');
    await user.type(screen.getByLabelText('Hours'), '7');
    await user.click(screen.getByRole('button', { name: 'Add day' }));

    expect(createWorkDay).toHaveBeenCalledWith('2026-10-16', 7);
    const rows = await screen.findAllByRole('row');
    expect(rows[1]).toHaveTextContent('Fri, Oct 16');
    expect(rows[2]).toHaveTextContent('Tue, Oct 20');
    expect(screen.getByText('11 h')).toBeInTheDocument();
    expect(screen.getByLabelText('Hours')).toHaveValue(null);
  });

  it('shows the server message when the day already exists', async () => {
    listWorkDays.mockResolvedValue([]);
    createWorkDay.mockRejectedValue(new api.ApiError(409, ['A work day already exists for this date.']));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No work days logged for this month.');

    await user.type(screen.getByLabelText('Hours'), '8');
    await user.click(screen.getByRole('button', { name: 'Add day' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A work day already exists for this date.');
  });

  it('edits the hours of a day', async () => {
    listWorkDays.mockResolvedValue([day('a', '2026-10-15', 8)]);
    updateWorkDay.mockResolvedValue(day('a', '2026-10-15', 5.5));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Edit Thu, Oct 15' }));
    const input = screen.getByLabelText('Hours for Thu, Oct 15');
    await user.clear(input);
    await user.type(input, '5.5');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(updateWorkDay).toHaveBeenCalledWith('a', 5.5);
    const row = await screen.findByRole('row', { name: /Thu, Oct 15/ });
    expect(within(row).getByText('5.5 h')).toBeInTheDocument();
  });

  it('keeps the editor open and shows the error when saving fails', async () => {
    listWorkDays.mockResolvedValue([day('a', '2026-10-15', 8)]);
    updateWorkDay.mockRejectedValue(new api.ApiError(400, ['The field WorkedHours must be between 0.01 and 24.']));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Edit Thu, Oct 15' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('between 0.01 and 24');
    expect(screen.getByLabelText('Hours for Thu, Oct 15')).toBeInTheDocument();
  });

  it('deletes a day', async () => {
    listWorkDays.mockResolvedValue([day('a', '2026-10-15', 8)]);
    deleteWorkDay.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Delete Thu, Oct 15' }));

    expect(deleteWorkDay).toHaveBeenCalledWith('a');
    expect(await screen.findByText('No work days logged for this month.')).toBeInTheDocument();
  });

  it('moves between months and defaults the date to the first of the month', async () => {
    listWorkDays.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No work days logged for this month.');

    await user.click(screen.getByRole('button', { name: 'Next month' }));

    expect(await screen.findByRole('heading', { name: 'November 2026' })).toBeInTheDocument();
    expect(listWorkDays).toHaveBeenLastCalledWith('2026-11-01', '2026-11-30');
    expect(screen.getByLabelText('Date')).toHaveValue('2026-11-01');

    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toHaveValue('2026-10-16');
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
