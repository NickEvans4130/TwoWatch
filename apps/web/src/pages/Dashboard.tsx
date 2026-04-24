import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

interface Couple {
  id: string;
  inviteCode: string;
  userA: { id: string; email: string; name: string | null };
  userB: { id: string; email: string; name: string | null } | null;
  _count: { watchlist: number };
}

interface WatchProgress {
  id: string;
  season: number | null;
  episode: number | null;
  watchedAt: string;
  completedBy: string;
}

interface WatchlistItem {
  id: string;
  tmdbId: string;
  imdbId: string;
  mediaType: string;
  title: string;
  posterPath: string | null;
  addedAt: string;
  progress: WatchProgress[];
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [couple, setCouple] = useState<Couple | null | undefined>(undefined);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCouple = useCallback(async () => {
    try {
      const res = await api.get<{ couple: Couple | null }>('/api/couple/me');
      setCouple(res.couple);
    } catch {
      setCouple(null);
    }
  }, []);

  const loadWatchlist = useCallback(async () => {
    try {
      const res = await api.get<{ items: WatchlistItem[] }>('/api/watchlist');
      setWatchlist(res.items);
    } catch {
      // no couple yet
    }
  }, []);

  useEffect(() => {
    loadCouple();
    loadWatchlist();
  }, [loadCouple, loadWatchlist]);

  const createCouple = async () => {
    setCreating(true);
    setError(null);
    try {
      await api.post('/api/couple/create', {});
      await loadCouple();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setCreating(false);
    }
  };

  const joinCouple = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoining(true);
    setError(null);
    try {
      await api.post('/api/couple/join', { inviteCode });
      await loadCouple();
      await loadWatchlist();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setJoining(false);
    }
  };

  const copyInvite = (code: string) => {
    const url = `${window.location.origin}/login?invite=${code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startWatch = async (item: WatchlistItem, season?: number, episode?: number) => {
    try {
      const body: { watchlistItemId: string; season?: number; episode?: number } = { watchlistItemId: item.id };
      if (season !== undefined) body.season = season;
      if (episode !== undefined) body.episode = episode;
      const res = await api.post<{ roomId: string }>('/api/room/create', body);
      navigate(`/watch/${res.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    }
  };

  const removeItem = async (id: string) => {
    try {
      await api.delete(`/api/watchlist/${id}`);
      setWatchlist((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // ignore
    }
  };

  const getNextEpisode = (item: WatchlistItem): { season: number; episode: number } => {
    const lastProgress = item.progress[0];
    if (!lastProgress || !lastProgress.season || !lastProgress.episode) {
      return { season: 1, episode: 1 };
    }
    return { season: lastProgress.season, episode: lastProgress.episode + 1 };
  };

  if (couple === undefined) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
        <Nav />
        <div className="flex items-center justify-center h-64">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const partnerName = couple
    ? (couple.userA.id === user?.id ? couple.userB?.name || couple.userB?.email : couple.userA.name || couple.userA.email)
    : null;

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
          Hey, {user?.name || user?.email?.split('@')[0]}
        </h1>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: '#3a1a1a', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
            {error}
          </div>
        )}

        {/* No couple */}
        {!couple && (
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="p-6 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h2 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Start watching together</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Create a couple and invite your partner.</p>
              <button
                onClick={createCouple}
                disabled={creating}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {creating ? 'Creating...' : 'Create couple'}
              </button>
            </div>

            <div className="p-6 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h2 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Join with a code</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Your partner shared an invite code with you.</p>
              <form onSubmit={joinCouple} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <button
                  type="submit"
                  disabled={joining}
                  className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  {joining ? '...' : 'Join'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Couple pending */}
        {couple && !couple.userB && (
          <div className="mb-8 p-6 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Waiting for your partner</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Share this invite code or link with them:</p>
            <div className="flex items-center gap-3 flex-wrap">
              <code className="text-sm px-3 py-1.5 rounded-md font-mono" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                {couple.inviteCode}
              </code>
              <button
                onClick={() => copyInvite(couple.inviteCode)}
                className="text-sm px-3 py-1.5 rounded-md"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </div>
        )}

        {/* Couple active */}
        {couple && couple.userB && (
          <div className="mb-8 flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Watching with <strong style={{ color: 'var(--text-primary)' }}>{partnerName}</strong>
            </span>
            <Link to="/search" className="ml-auto text-sm px-3 py-1.5 rounded-md" style={{ background: 'var(--accent)', color: 'white' }}>
              + Add to watchlist
            </Link>
          </div>
        )}

        {/* Watchlist */}
        {couple && couple.userB && (
          <>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Watchlist</h2>
            {watchlist.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Nothing in your watchlist yet.</p>
                <Link to="/search" className="text-sm px-4 py-2 rounded-lg" style={{ background: 'var(--accent)', color: 'white' }}>
                  Search for something to watch
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {watchlist.map((item) => {
                  const next = item.mediaType === 'tv' ? getNextEpisode(item) : null;
                  const watchedCount = item.progress.length;

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl overflow-hidden flex flex-col"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    >
                      {item.posterPath ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w300${item.posterPath}`}
                          alt={item.title}
                          className="w-full object-cover"
                          style={{ height: '180px' }}
                        />
                      ) : (
                        <div className="w-full flex items-center justify-center text-2xl" style={{ height: '180px', background: 'var(--bg-secondary)' }}>
                          🎬
                        </div>
                      )}

                      <div className="p-4 flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-medium text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                          <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                            {item.mediaType === 'tv' ? 'TV' : 'Movie'}
                          </span>
                        </div>

                        {watchedCount > 0 && item.mediaType === 'tv' && (
                          <p className="text-xs mb-2" style={{ color: 'var(--success)' }}>
                            {watchedCount} episode{watchedCount !== 1 ? 's' : ''} watched
                          </p>
                        )}
                        {item.mediaType === 'movie' && watchedCount > 0 && (
                          <p className="text-xs mb-2" style={{ color: 'var(--success)' }}>Watched</p>
                        )}

                        <div className="mt-auto flex gap-2">
                          <button
                            onClick={() => startWatch(item, next?.season, next?.episode)}
                            className="flex-1 py-2 rounded-lg text-xs font-medium"
                            style={{ background: 'var(--accent)', color: 'white' }}
                          >
                            {next ? `Watch S${next.season}E${next.episode}` : 'Watch'}
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="px-3 py-2 rounded-lg text-xs"
                            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
