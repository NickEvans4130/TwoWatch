import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import GlowButton from '../components/GlowButton';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

interface CoupleUser { id: string; email: string; name: string | null }
interface Couple {
  id: string; inviteCode: string;
  userA: CoupleUser; userB: CoupleUser | null;
  _count: { watchlist: number };
}
interface WatchProgress { id: string; season: number | null; episode: number | null; watchedAt: string; completedBy: string }
interface WatchlistItem {
  id: string; tmdbId: string; imdbId: string; mediaType: string;
  title: string; posterPath: string | null; addedAt: string; progress: WatchProgress[];
}

function partnerOf(couple: Couple, myId: string): CoupleUser | null {
  return couple.userA.id === myId ? couple.userB : couple.userA;
}
function partnerName(couple: Couple, myId: string): string {
  const p = partnerOf(couple, myId);
  return p ? (p.name || p.email.split('@')[0]) : 'Pending';
}

function EmptyWatchlist({ coupleId }: { coupleId: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-5"
        style={{ background: 'rgba(167,139,250,0.1)' }}
      >
        🎬
      </div>
      <h3 className="font-semibold mb-2 text-lg" style={{ color: 'var(--text-primary)' }}>
        Nothing to watch yet
      </h3>
      <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--text-secondary)' }}>
        Add movies and shows to your shared watchlist to get started.
      </p>
      <Link to={`/search?coupleId=${coupleId}`}>
        <GlowButton size="md">Find something to watch</GlowButton>
      </Link>
    </div>
  );
}

function WatchlistCard({ item, onWatch, onRemove }: {
  item: WatchlistItem;
  onWatch: (item: WatchlistItem, season?: number, episode?: number) => void;
  onRemove: (id: string) => void;
}) {
  const next = item.mediaType === 'tv'
    ? (() => {
        const last = item.progress[0];
        return last?.season && last?.episode
          ? { season: last.season, episode: last.episode + 1 }
          : { season: 1, episode: 1 };
      })()
    : null;

  const watched = item.progress.length > 0;

  return (
    <div
      className="group relative rounded-2xl overflow-hidden flex-shrink-0 cursor-pointer transition-all duration-200"
      style={{
        width: '160px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(167,139,250,0.25)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)';
      }}
    >
      {/* Poster */}
      <div className="relative rounded-2xl overflow-hidden" style={{ height: '240px', background: 'rgba(255,255,255,0.05)' }}>
        {item.posterPath ? (
          <img
            src={`https://image.tmdb.org/t/p/w300${item.posterPath}`}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: 'rgba(167,139,250,0.08)' }}>🎬</div>
        )}

        {/* Watched badge */}
        {watched && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: 'rgba(74,222,128,0.9)' }}>
            ✓
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)' }}
        >
          <button
            onClick={() => onWatch(item, next?.season, next?.episode)}
            className="w-full py-1.5 rounded-full text-xs font-semibold mb-1.5 btn-glow text-white"
          >
            {next ? `S${next.season}E${next.episode}` : 'Watch'}
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="w-full py-1 rounded-full text-xs transition-all duration-150"
            style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Remove
          </button>
        </div>
      </div>

      {/* Title below */}
      <div className="mt-2 px-0.5">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {item.mediaType === 'tv' ? 'TV Show' : 'Movie'}
          {item.progress.length > 0 && item.mediaType === 'tv' ? ` · ${item.progress.length} watched` : ''}
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [couples, setCouples] = useState<Couple[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  const selected = couples.find((c) => c.id === selectedId) ?? null;

  const loadCouples = useCallback(async () => {
    try {
      const res = await api.get<{ couples: Couple[] }>('/api/couple/me');
      setCouples(res.couples);
      if (res.couples.length > 0 && !selectedId) {
        const complete = res.couples.find((c) => c.userB !== null) ?? res.couples[0];
        setSelectedId(complete.id);
      }
    } catch { /* ignore */ }
  }, [selectedId]);

  const loadWatchlist = useCallback(async (coupleId: string) => {
    setWatchlistLoading(true);
    try {
      const res = await api.get<{ items: WatchlistItem[] }>(`/api/watchlist?coupleId=${coupleId}`);
      setWatchlist(res.items);
    } catch { setWatchlist([]); }
    finally { setWatchlistLoading(false); }
  }, []);

  useEffect(() => { loadCouples(); }, [loadCouples]);
  useEffect(() => { if (selectedId) loadWatchlist(selectedId); }, [selectedId, loadWatchlist]);

  const createCouple = async () => {
    setCreating(true); setError(null);
    try {
      const res = await api.post<{ couple: Couple }>('/api/couple/create', {});
      setCouples((prev) => [res.couple, ...prev]);
      setSelectedId(res.couple.id);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setCreating(false); }
  };

  const joinCouple = async (e: React.FormEvent) => {
    e.preventDefault(); setJoining(true); setError(null);
    try {
      const res = await api.post<{ couple: Couple }>('/api/couple/join', { inviteCode });
      setCouples((prev) => {
        const exists = prev.find((c) => c.id === res.couple.id);
        return exists ? prev.map((c) => c.id === res.couple.id ? res.couple : c) : [res.couple, ...prev];
      });
      setSelectedId(res.couple.id);
      setInviteCode('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setJoining(false); }
  };

  const copyInvite = (couple: Couple) => {
    navigator.clipboard.writeText(`${window.location.origin}/login?invite=${couple.inviteCode}`);
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
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
  };

  const removeItem = async (id: string) => {
    try {
      await api.delete(`/api/watchlist/${id}`);
      setWatchlist((prev) => prev.filter((i) => i.id !== id));
    } catch { /* ignore */ }
  };

  const myName = user?.name || user?.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg)' }}>
      {/* Background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{ width: '800px', height: '400px', background: 'radial-gradient(ellipse, rgba(167,139,250,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      <Nav />

      <main className="relative z-10 max-w-5xl mx-auto px-5 py-10">

        {/* Greeting */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Hey, {myName} <span className="gradient-text">♥</span>
          </h1>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            {selected?.userB ? `Watching with ${partnerName(selected, user?.id ?? '')}` : 'Ready to watch something together?'}
          </p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-2xl text-sm" style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--danger)', border: '1px solid rgba(248,113,113,0.2)' }}>
            {error}
          </div>
        )}

        {/* Couple selector + join row */}
        <div className="glass-card rounded-3xl p-5 mb-8">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Couple tabs */}
            {couples.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150"
                style={{
                  background: selectedId === c.id ? 'linear-gradient(135deg, #a78bfa, #f472b6)' : 'rgba(255,255,255,0.06)',
                  color: selectedId === c.id ? 'white' : 'var(--text-secondary)',
                  boxShadow: selectedId === c.id ? '0 0 20px rgba(167,139,250,0.3)' : 'none',
                }}
              >
                {c.userB ? (
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#4ade80' }} />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#fbbf24' }} />
                )}
                {partnerName(c, user?.id ?? '')}
              </button>
            ))}

            <GlowButton size="sm" onClick={createCouple} disabled={creating} variant="secondary">
              {creating ? '...' : '+ New couple'}
            </GlowButton>

            {/* Join form */}
            <form onSubmit={joinCouple} className="flex gap-2 ml-auto">
              <input
                type="text"
                placeholder="Invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="input-glow px-4 py-2 rounded-full text-sm w-44"
              />
              <GlowButton type="submit" size="sm" disabled={joining || !inviteCode.trim()}>
                {joining ? '...' : 'Join'}
              </GlowButton>
            </form>
          </div>
        </div>

        {/* Selected couple panel */}
        {selected ? (
          <>
            {/* Status card */}
            {!selected.userB ? (
              <div
                className="rounded-3xl p-5 mb-8 flex items-center gap-4 flex-wrap"
                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: 'rgba(251,191,36,0.15)' }}>
                  ⏳
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Waiting for your partner to join</p>
                  <code className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{selected.inviteCode}</code>
                </div>
                <GlowButton size="sm" onClick={() => copyInvite(selected)}>
                  {copied === selected.id ? '✓ Copied' : 'Copy invite link'}
                </GlowButton>
              </div>
            ) : (
              <div
                className="rounded-3xl p-5 mb-8 flex items-center gap-4 flex-wrap"
                style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: 'rgba(74,222,128,0.12)' }}>
                  ♥
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                    Watching with <strong>{partnerName(selected, user?.id ?? '')}</strong>
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {selected._count.watchlist} item{selected._count.watchlist !== 1 ? 's' : ''} in watchlist
                  </p>
                </div>
                <Link to={`/search?coupleId=${selected.id}`}>
                  <GlowButton size="sm">+ Add to watchlist</GlowButton>
                </Link>
              </div>
            )}

            {/* Watchlist */}
            <div className="mb-4 flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Watchlist</h2>
              {watchlist.length > 0 && (
                <Link to={`/search?coupleId=${selected.id}`} className="text-sm transition-colors duration-150" style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#a78bfa')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                  + Add more
                </Link>
              )}
            </div>

            {watchlistLoading ? (
              <div className="flex gap-4 overflow-x-auto scroll-hide pb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0" style={{ width: '160px' }}>
                    <div className="skeleton rounded-2xl" style={{ height: '240px' }} />
                    <div className="mt-2 space-y-1.5">
                      <div className="skeleton rounded h-3.5" style={{ width: '80%' }} />
                      <div className="skeleton rounded h-3" style={{ width: '50%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : watchlist.length === 0 ? (
              <EmptyWatchlist coupleId={selected.id} />
            ) : (
              <div className="flex gap-4 overflow-x-auto scroll-hide pb-4">
                {watchlist.map((item) => (
                  <WatchlistCard
                    key={item.id}
                    item={item}
                    onWatch={startWatch}
                    onRemove={removeItem}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">♥</div>
            <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Start watching together</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Create a couple and share the invite link with someone.</p>
            <GlowButton onClick={createCouple} disabled={creating} size="lg">
              {creating ? 'Creating...' : 'Create a couple'}
            </GlowButton>
          </div>
        )}
      </main>
    </div>
  );
}
