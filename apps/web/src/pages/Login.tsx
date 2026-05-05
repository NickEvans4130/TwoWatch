import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import GlowButton from '../components/GlowButton';

interface MagicLinkResponse {
  message: string;
  devMagicUrl?: string;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<MagicLinkResponse>('/api/auth/magic-link', {
        email,
        name: name || undefined,
      });
      setSent(true);
      if (res.devMagicUrl) setDevUrl(res.devMagicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(167,139,250,0.1) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="absolute bottom-1/4 left-1/4 pointer-events-none" style={{ width: '300px', height: '300px', background: 'radial-gradient(ellipse, rgba(244,114,182,0.07) 0%, transparent 70%)', filter: 'blur(30px)' }} />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold gradient-text inline-block">
            TwoWatch
          </Link>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
          }}
        >
          {sent ? (
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-5"
                style={{ background: 'rgba(167,139,250,0.12)' }}
              >
                ✉️
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Check your email
              </h2>
              <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                We sent a magic link to
              </p>
              <p className="text-sm font-medium mb-6" style={{ color: 'var(--text-primary)' }}>
                {email}
              </p>

              {devUrl && (
                <div
                  className="rounded-2xl p-4 text-left"
                  style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
                >
                  <p className="text-xs font-semibold mb-2" style={{ color: '#fbbf24' }}>
                    DEV MODE — click to sign in:
                  </p>
                  <a
                    href={devUrl}
                    className="text-xs font-mono break-all transition-colors duration-150"
                    style={{ color: '#a78bfa' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#f472b6')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#a78bfa')}
                  >
                    {devUrl}
                  </a>
                </div>
              )}

              <button
                onClick={() => { setSent(false); setDevUrl(null); }}
                className="mt-5 text-sm transition-colors duration-150"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                Welcome back
              </h2>
              <p className="text-sm mb-7" style={{ color: 'var(--text-secondary)' }}>
                No password needed — we'll send you a magic link.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-muted)' }}>
                    Your name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional, for new accounts)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Alex"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-glow w-full px-4 py-3 rounded-2xl text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-muted)' }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input-glow w-full px-4 py-3 rounded-2xl text-sm"
                  />
                </div>

                {error && (
                  <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
                )}

                <GlowButton type="submit" disabled={loading} fullWidth size="lg">
                  {loading ? 'Sending...' : 'Send magic link'}
                </GlowButton>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          By signing in you agree to watch responsibly ♥
        </p>
      </div>
    </div>
  );
}
