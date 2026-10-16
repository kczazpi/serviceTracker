import { NavLink, Outlet } from 'react-router-dom';
import type { User } from './api';

interface Props {
  user: User;
  onLogout: () => void;
}

/** Top bar shared by every signed-in page. The user's name links to their profile. */
export default function Layout({ user, onLogout }: Props) {
  return (
    <div className="page">
      <header className="topbar">
        <NavLink to="/" end className="brand">
          Service Tracker
        </NavLink>
        <NavLink to="/profile" className="user-link" title="Your profile">
          {user.name} {user.surname}
        </NavLink>
        <button type="button" onClick={onLogout}>
          Sign out
        </button>
      </header>
      <Outlet />
    </div>
  );
}
