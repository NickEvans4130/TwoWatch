import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

interface CoupleUser {
  id: string;
  email: string;
  name: string | null;
}

interface Couple {
  id: string;
  inviteCode: string;
  userA: CoupleUser;
  userB: CoupleUser | null;
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

function coupleName(couple: Couple, myId: string): string {
  const partner = couple.userA.id === myId ? couple.userB : couple.userA;
  return partner ? (partner.name || partner.email.split('@')[0]) : 'Pending partner';
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [couples, setCouples] = useState<Couple[]>([]);
  const [selectedCoupleId, setSelectedCoupleId] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCouple = couples.find((c) => c.id === selectedCoupleId) ?? null;

  const loadCouples = useCallback(async () => {
    try {
      const res = await api.get<{ couples: Couple[] }>('/api/couple/me');
      setCouples(res.couples);
      // Auto-select the first complete couple, or first couple if none complete
      if (res.couples.length > 0 && !selectedCoupleId) {
        const complete = res.couples.find((c) => c.userB !== null);
        setSelectedCoupleId((complete ?? res.couples[0]).id);
      }
    } catch {
      // ignore
    }
  }, [selectedCoupleId]);

  const loadWatchlist = useCallback(async (coupleId: string) => {
    try {
      const res = await api.get<{ items: WatchlistItem[] }>(`/api/watchlist?coupleId=${coupleId}`);
      setWatchlist(res.items);
    } catch {
      setWatchlist([]);
    }
  }, []);

  useEffect(() => {
    loadCouples();
  }, [loadCouples]);

  useEffect(() => {
    if (selectedCoupleId) loadWatchlist(selectedCoupleId);
  }, [selectedCoupleId, loadWatchlist]);

  const createCouple = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await api.post<{ couple: Couple }>('/api/couple/create', {});
      setCouples((prev) => [res.couple, ...prev]);
      setSelectedCoupleId(res.couple.id);
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
      const res = await api.post<{ couple: Couple }>('/api/couple/join', { inviteCode });
      setCouples((prev) => {
        const exists = prev.find((c) => c.id === res.couple.id);
        if (exists) return prev.map((c) => (c.id === res.couple.id ? res.couple : c));
        return [res.couple, ...prev];
      });
      setSelectedCoupleId(res.couple.id);
      setInviteCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setJoining(false);
    }
  };

  const copyInvite = (couple: Couple) => {
    const url = `${window.location.origin}/login?invite=${couple.inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopied(couple.id);
    setTimeout(() => setCopied(null), 2000);
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

  const getNextEpisode = (item: WatchlistItem) => {
    const last = item.progress[0];
    if (!last || !last.season || !last.episode) return { season: 1, episode: 1 };
    return { season: last.season, episode: last.episode + 1 };
  };

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Hey, {user?.name || user?.email?.split('@')[0]}
          </h1>
          <button
            onClick={createCouple}
            disabled={creating}
            className="text-sm px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {creating ? '...' : '+ New couple'}
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: '#3a1a1a', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
            {error}
          </div>
        )}

        {/* Join with invite code */}
        <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <form onSubmit={joinCouple} className="flex gap-2 items-center flex-wrap">
            <label className="text-sm font-medium shrink-0" style={{ color: 'var(--text-secondary)' }}>
              Join with invite code:
            </label>
            <input
              type="text"
              placeholder="Paste invite code here"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <button
              type="submit"
              disabled={joining || !inviteCode.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 shrink-0"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              {joining ? '...' : 'Join'}
            </button>
          </form>
        </div>

        {couples.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              No couples yet. Create one and share the invite code.
            </p>
          </div>
        ) : (
          <>
            {/* Couple tabs */}
            {couples.length > 1 && (
              <div className="flex gap-2 flex-wrap mb-6">
                {couples.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCoupleId(c.id)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium"
                    style={{
                      background: selectedCoupleId === c.id ? 'var(--accent)' : 'var(--bg-card)',
                      color: selectedCoupleId === c.id ? 'white' : 'var(--text-secondary)',
                      border: `1px solid ${selectedCoupleId === c.id ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    {coupleName(c, user?.id ?? '')}
                  </button>
                ))}
              </div>
            )}

            {/* Selected couple panel */}
            {selectedCouple && (
              <>
                {/* Couple status bar */}
                <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl flex-wrap" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  {selectedCouple.userB ? (
                    <>
                      <div className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Watching with <strong style={{ color: 'var(--text-primary)' }}>{coupleName(selectedCouple, user?.id ?? '')}</strong>
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full" style={{ background: 'var(--warning)' }} />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Waiting for partner to join
                      </span>
                      <code className="text-xs font-mono px-2 py-1 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                        {selectedCouple.inviteCode}
                      </code>
                      <button
                        onClick={() => copyInvite(selectedCouple)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ background: 'var(--accent)', color: 'white' }}
                      >
                        {copied === selectedCouple.id ? 'Copied!' : 'Copy link'}
                      </button>
                    </>
                  )}
                  <Link
                    to={`/search?coupleId=${selectedCouple.id}`}
                    className="ml-auto text-sm px-3 py-1.5 rounded-md"
                    style={{ background: 'var(--accent)', color: 'white' }}
                  >
                    + Add to watchlist
                  </Link>
                </div>

                {/* Watchlist */}
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Watchlist</h2>
                {watchlist.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Nothing in the watchlist yet.</p>
                    <Link
                      to={`/search?coupleId=${selectedCouple.id}`}
                      className="text-sm px-4 py-2 rounded-lg"
                      style={{ background: 'var(--accent)', color: 'white' }}
                    >
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
          </>
        )}
      </main>
    </div>
  );
}
