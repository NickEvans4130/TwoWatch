import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

interface VerifyResponse {
  token: string;
  user: { id: string; email: string; name: string | null };
}

export default function Verify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) { setError('Missing token in URL'); return; }

    api.get<VerifyResponse>(`/api/auth/verify?token=${token}`)
      .then((res) => {
        setAuth(res.token, res.user);
        const redirect = localStorage.getItem('tw_redirect') || '/dashboard';
        localStorage.removeItem('tw_redirect');
        navigate(redirect, { replace: true });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Invalid or expired link');
      });
  }, [searchParams, setAuth, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center relative" style={{ background: 'var(--bg)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(167,139,250,0.08) 0%, transparent 70%)' }} />

      <div className="relative z-10 text-center">
        {error ? (
          <div
            className="rounded-3xl p-8 max-w-sm"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="text-3xl mb-4">🔗</div>
            <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Link expired or invalid</p>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            <Link
              to="/login"
              className="btn-glow text-white text-sm font-semibold px-6 py-2.5 rounded-full inline-block"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-12 h-12 rounded-full animate-pulse-glow"
              style={{ background: 'linear-gradient(135deg, #a78bfa, #f472b6)' }}
            />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Signing you in...</p>
          </div>
        )}
      </div>
    </div>
  );
}
