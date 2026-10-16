import { useEffect, useState } from 'react';
import { ApiError, me, setUnauthorizedHandler, tokenStore, type User } from './api';
import AuthPage from './AuthPage';
import TrackerPage from './TrackerPage';

export default function App() {
  const [token, setToken] = useState<string | null>(() => tokenStore.get());
  const [user, setUser] = useState<User | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // An expired/invalid token (401 on any authenticated call) sends the user back to the sign-in page.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
    });
    return () => setUnauthorizedHandler(undefined);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoadError(null);
    me()
      .then((profile) => {
        if (!cancelled) setUser(profile);
      })
      .catch((err) => {
        // A 401 has already been handled above (token cleared); anything else is worth showing.
        if (!cancelled && !(err instanceof ApiError && err.status === 401)) {
          setLoadError(err instanceof ApiError ? err.messages.join(' ') : 'Something went wrong.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  function handleAuthenticated(newToken: string) {
    tokenStore.set(newToken);
    setToken(newToken);
  }

  function handleLogout() {
    tokenStore.clear();
    setToken(null);
    setUser(null);
  }

  if (!token) return <AuthPage onAuthenticated={handleAuthenticated} />;

  if (loadError) {
    return (
      <main className="card auth">
        <p role="alert" className="errors">
          {loadError}
        </p>
        <button type="button" className="primary" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>{' '}
        <button type="button" onClick={handleLogout}>
          Sign out
        </button>
      </main>
    );
  }

  if (!user) return <p className="muted center">Loading…</p>;

  return <TrackerPage user={user} onLogout={handleLogout} />;
}
