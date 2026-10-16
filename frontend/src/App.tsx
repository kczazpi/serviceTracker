import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { ApiError, me, setUnauthorizedHandler, tokenStore, type User } from './api';
import AuthPage from './AuthPage';
import Layout from './Layout';
import ProfilePage from './ProfilePage';
import TrackerPage from './TrackerPage';

export default function App() {
  const navigate = useNavigate();
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
    navigate('/', { replace: true });
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

  return (
    <Routes>
      <Route element={<Layout user={user} onLogout={handleLogout} />}>
        <Route index element={<TrackerPage />} />
        <Route path="profile" element={<ProfilePage user={user} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
