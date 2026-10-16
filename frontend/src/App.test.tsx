import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import App from './App';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  me: vi.fn(),
  listWorkDays: vi.fn(),
}));

const me = vi.mocked(api.me);
const listWorkDays = vi.mocked(api.listWorkDays);

const jane: api.User = {
  id: 'u1', username: 'jane', email: 'jane@example.com', name: 'Jane', surname: 'Doe',
  isActive: true, createdAt: '2026-10-15T12:00:00Z', updatedAt: '', lastLoginAt: null,
};

const renderApp = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

beforeEach(() => {
  me.mockReset();
  listWorkDays.mockReset().mockResolvedValue([]);
  localStorage.clear();
});

describe('App', () => {
  it('shows the sign in page when there is no token', () => {
    renderApp();

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(me).not.toHaveBeenCalled();
  });

  it('loads the profile for a stored token and shows the tracker', async () => {
    api.tokenStore.set('jwt-123');
    me.mockResolvedValue(jane);

    renderApp();

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /\d{4}$/ })).toBeInTheDocument();
  });

  it('signing out clears the token and returns to the sign in page', async () => {
    api.tokenStore.set('jwt-123');
    me.mockResolvedValue(jane);
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(api.tokenStore.get()).toBeNull();
  });

  it('offers a retry when the profile cannot be loaded', async () => {
    api.tokenStore.set('jwt-123');
    me.mockRejectedValueOnce(new api.ApiError(0, ['Cannot reach the server. Is the API running?'])).mockResolvedValue(jane);
    const user = userEvent.setup();
    renderApp();

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
  });

  it('shows the sign in page on any address when signed out', () => {
    renderApp('/profile');

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('opens the profile when the user clicks their name, and the calendar again from the brand', async () => {
    api.tokenStore.set('jwt-123');
    me.mockResolvedValue(jane);
    const user = userEvent.setup();
    renderApp();

    const profileLink = await screen.findByRole('link', { name: 'Jane Doe' });
    expect(profileLink).not.toHaveAttribute('aria-current');
    await user.click(profileLink);

    expect(await screen.findByRole('heading', { level: 1, name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your hours' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Jane Doe' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('link', { name: 'Service Tracker' }));

    expect(await screen.findByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your hours' })).not.toBeInTheDocument();
  });

  it('can open the profile directly, e.g. after a reload', async () => {
    api.tokenStore.set('jwt-123');
    me.mockResolvedValue(jane);
    renderApp('/profile');

    expect(await screen.findByRole('heading', { name: 'Your hours' })).toBeInTheDocument();
  });

  it('sends unknown addresses to the calendar', async () => {
    api.tokenStore.set('jwt-123');
    me.mockResolvedValue(jane);
    renderApp('/nope');

    expect(await screen.findByRole('button', { name: 'Previous month' })).toBeInTheDocument();
  });

  it('signing out from the profile returns to the sign in page, and signing in lands on the calendar', async () => {
    api.tokenStore.set('jwt-123');
    me.mockResolvedValue(jane);
    const user = userEvent.setup();
    renderApp('/profile');

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});
