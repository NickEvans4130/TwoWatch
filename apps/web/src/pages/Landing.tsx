import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Landing() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <nav className="flex items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>TwoWatch</span>
        <Link
          to={user ? '/dashboard' : '/login'}
          className="text-sm px-4 py-2 rounded-lg font-medium"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          {user ? 'Dashboard' : 'Sign in'}
        </Link>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-bold mb-6 leading-tight" style={{ color: 'var(--text-primary)' }}>
            Watch together.
            <br />
            <span style={{ color: 'var(--accent)' }}>Actually together.</span>
          </h1>
          <p className="text-xl mb-4" style={{ color: 'var(--text-secondary)' }}>
            TwoWatch makes sure you and your partner start at the same moment — every time.
          </p>
          <p className="text-base mb-10" style={{ color: 'var(--text-secondary)' }}>
            Both of you must confirm you're ready before the video plays. No more "okay, 3... 2... 1... go?"
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="px-8 py-3 rounded-xl font-semibold text-base w-full sm:w-auto"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              Get started — it's free
            </Link>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
          {[
            { title: 'Mutual ready gate', desc: 'Neither of you can start until both of you confirm. No accidental starts.' },
            { title: 'Any show or movie', desc: 'Search TMDB, add to your shared watchlist, and watch via VidSrc embeds.' },
            { title: 'Long-distance friendly', desc: 'Works over any internet connection. Just share a room link.' },
          ].map((f) => (
            <div
              key={f.title}
              className="p-5 rounded-xl text-left"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
