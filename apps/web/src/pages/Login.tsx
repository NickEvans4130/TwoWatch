import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

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
      const res = await api.post<MagicLinkResponse>('/api/auth/magic-link', { email, name: name || undefined });
      setSent(true);
      if (res.devMagicUrl) setDevUrl(res.devMagicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>TwoWatch</Link>
        </div>

        <div className="rounded-2xl p-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-4">✉️</div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Check your email</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                We sent a magic link to <strong>{email}</strong>
              </p>

              {devUrl && (
                <div className="mt-6 p-4 rounded-xl text-left" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-mono mb-2" style={{ color: 'var(--warning)' }}>DEV MODE — magic link:</p>
                  <a
                    href={devUrl}
                    className="text-xs font-mono break-all"
                    style={{ color: 'var(--accent)' }}
                  >
                    {devUrl}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Sign in to TwoWatch</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                No password needed — we'll email you a magic link.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Your name (optional, for new accounts)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Alex"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                {error && (
                  <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="py-3 rounded-lg font-semibold text-sm mt-1 disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  {loading ? 'Sending...' : 'Send magic link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
