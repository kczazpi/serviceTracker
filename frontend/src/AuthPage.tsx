import { useState, type FormEvent } from 'react';
import { ApiError, login, register } from './api';
import ErrorList from './ErrorList';

interface Props {
  onAuthenticated: (token: string) => void;
}

const emptyForm = { username: '', name: '', surname: '', email: '', password: '' };

export default function AuthPage({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';
  const set = (field: keyof typeof emptyForm) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  function switchMode() {
    setMode(isRegister ? 'login' : 'register');
    setErrors([]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setBusy(true);
    try {
      if (isRegister) await register(form);
      const token = await login(form.username, form.password);
      onAuthenticated(token);
    } catch (err) {
      setErrors(err instanceof ApiError ? err.messages : ['Something went wrong.']);
      setBusy(false);
    }
  }

  return (
    <main className="card auth">
      <h1>Service Tracker</h1>
      <h2>{isRegister ? 'Create an account' : 'Sign in'}</h2>

      <form onSubmit={handleSubmit}>
        <label>
          Username
          <input value={form.username} onChange={set('username')} autoComplete="username" required />
        </label>

        {isRegister && (
          <>
            <label>
              Name
              <input value={form.name} onChange={set('name')} autoComplete="given-name" required />
            </label>
            <label>
              Surname
              <input value={form.surname} onChange={set('surname')} autoComplete="family-name" required />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
            </label>
          </>
        )}

        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
          />
        </label>
        {isRegister && (
          <p className="hint">At least 6 characters with an upper-case letter, a lower-case letter, a digit and a symbol.</p>
        )}

        <ErrorList messages={errors} />

        <button type="submit" className="primary" disabled={busy}>
          {isRegister ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="switch">
        {isRegister ? 'Already have an account?' : 'New here?'}{' '}
        <button type="button" className="link" onClick={switchMode}>
          {isRegister ? 'Sign in' : 'Create an account'}
        </button>
      </p>
    </main>
  );
}
