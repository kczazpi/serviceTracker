import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  isActive: true, createdAt: '', updatedAt: '', lastLoginAt: null,
};

beforeEach(() => {
  me.mockReset();
  listWorkDays.mockReset().mockResolvedValue([]);
  localStorage.clear();
});

describe('App', () => {
  it('shows the sign in page when there is no token', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(me).not.toHaveBeenCalled();
  });

  it('loads the profile for a stored token and shows the tracker', async () => {
    api.tokenStore.set('jwt-123');
    me.mockResolvedValue(jane);

    render(<App />);

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /\d{4}$/ })).toBeInTheDocument();
  });

  it('signing out clears the token and returns to the sign in page', async () => {
    api.tokenStore.set('jwt-123');
    me.mockResolvedValue(jane);
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(api.tokenStore.get()).toBeNull();
  });

  it('offers a retry when the profile cannot be loaded', async () => {
    api.tokenStore.set('jwt-123');
    me.mockRejectedValueOnce(new api.ApiError(0, ['Cannot reach the server. Is the API running?'])).mockResolvedValue(jane);
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
  });
});
