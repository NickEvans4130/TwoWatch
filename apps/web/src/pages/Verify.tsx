import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
    if (!token) {
      setError('Missing token in URL');
      return;
    }

    api.get<VerifyResponse>(`/api/auth/verify?token=${token}`)
      .then((res) => {
        setAuth(res.token, res.user);
        navigate('/dashboard', { replace: true });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Invalid or expired link');
      });
  }, [searchParams, setAuth, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        {error ? (
          <>
            <p className="text-lg font-medium mb-2" style={{ color: 'var(--danger)' }}>{error}</p>
            <a href="/login" className="text-sm" style={{ color: 'var(--accent)' }}>Back to login</a>
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Signing you in...</p>
        )}
      </div>
    </div>
  );
}
