import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import AuthPage from './AuthPage';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  login: vi.fn(),
  register: vi.fn(),
}));

const login = vi.mocked(api.login);
const register = vi.mocked(api.register);

beforeEach(() => {
  login.mockReset();
  register.mockReset();
});

describe('AuthPage', () => {
  it('signs in and hands the token to the app', async () => {
    login.mockResolvedValue('jwt-123');
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    render(<AuthPage onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByLabelText('Username'), 'jane');
    await user.type(screen.getByLabelText('Password'), 'Passw0rd!');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(login).toHaveBeenCalledWith('jane', 'Passw0rd!');
    expect(onAuthenticated).toHaveBeenCalledWith('jwt-123');
  });

  it('shows the error when sign in fails', async () => {
    login.mockRejectedValue(new api.ApiError(401, ['Wrong username or password, or the account is temporarily locked.']));
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    render(<AuthPage onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByLabelText('Username'), 'jane');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong username or password');
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('registers, then signs in with the same credentials', async () => {
    register.mockResolvedValue({} as api.User);
    login.mockResolvedValue('jwt-456');
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    render(<AuthPage onAuthenticated={onAuthenticated} />);

    await user.click(screen.getByRole('button', { name: 'Create an account' }));
    await user.type(screen.getByLabelText('Username'), 'jane');
    await user.type(screen.getByLabelText('Name'), 'Jane');
    await user.type(screen.getByLabelText('Surname'), 'Doe');
    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'Passw0rd!');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(register).toHaveBeenCalledWith({
      username: 'jane',
      name: 'Jane',
      surname: 'Doe',
      email: 'jane@example.com',
      password: 'Passw0rd!',
    });
    expect(login).toHaveBeenCalledWith('jane', 'Passw0rd!');
    expect(onAuthenticated).toHaveBeenCalledWith('jwt-456');
  });

  it('lists every registration error and does not sign in', async () => {
    register.mockRejectedValue(new api.ApiError(400, ['Passwords must have a digit.', 'Email is taken.']));
    const user = userEvent.setup();
    render(<AuthPage onAuthenticated={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Create an account' }));
    await user.type(screen.getByLabelText('Username'), 'jane');
    await user.type(screen.getByLabelText('Name'), 'Jane');
    await user.type(screen.getByLabelText('Surname'), 'Doe');
    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'weak');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Passwords must have a digit.');
    expect(alert).toHaveTextContent('Email is taken.');
    expect(login).not.toHaveBeenCalled();
  });
});
