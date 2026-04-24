import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface Props {
  transparent?: boolean;
}

export default function Nav({ transparent }: Props) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <nav
      className="flex items-center justify-between px-6 py-4 relative z-10"
      style={{
        background: transparent ? 'transparent' : 'rgba(7,8,15,0.8)',
        backdropFilter: transparent ? 'none' : 'blur(20px)',
        borderBottom: transparent ? 'none' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2">
        <span
          className="text-xl font-bold tracking-tight gradient-text"
        >
          TwoWatch
        </span>
      </Link>

      {user ? (
        <div className="flex items-center gap-3">
          <Link
            to="/search"
            className="text-sm transition-colors duration-150 hidden sm:block"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            Search
          </Link>
          <Link
            to="/dashboard"
            className="text-sm transition-colors duration-150 hidden sm:block"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            Dashboard
          </Link>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="text-sm px-4 py-1.5 rounded-full transition-all duration-150"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
            }}
          >
            Sign out
          </button>
        </div>
      ) : (
        <Link
          to="/login"
          className="btn-glow text-white text-sm font-semibold px-5 py-2 rounded-full"
        >
          Sign in
        </Link>
      )}
    </nav>
  );
}
