import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Nav() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav
      className="flex items-center justify-between px-6 py-4 border-b"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
    >
      <Link to={user ? '/dashboard' : '/'} className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
        TwoWatch
      </Link>
      {user && (
        <div className="flex items-center gap-4">
          <Link to="/search" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Search
          </Link>
          <Link to="/dashboard" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded-md"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}
