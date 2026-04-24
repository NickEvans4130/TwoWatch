import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Nav from '../components/Nav';
import { api } from '../lib/api';

interface SearchResult {
  tmdbId: string;
  imdbId: string;
  title: string;
  posterPath: string | null;
  mediaType: 'movie' | 'tv';
  year: number | null;
}

interface Couple {
  id: string;
  inviteCode: string;
  userA: { id: string; email: string; name: string | null };
  userB: { id: string; email: string; name: string | null } | null;
  _count: { watchlist: number };
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const preselectedCoupleId = searchParams.get('coupleId');

  const [couples, setCouples] = useState<Couple[]>([]);
  const [selectedCoupleId, setSelectedCoupleId] = useState<string>(preselectedCoupleId ?? '');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.get<{ couples: Couple[] }>('/api/couple/me').then((res) => {
      setCouples(res.couples);
      if (!selectedCoupleId && res.couples.length > 0) {
        setSelectedCoupleId(res.couples[0].id);
      }
    }).catch(() => {});
  }, [selectedCoupleId]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`);
      setResults(res.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  const addToWatchlist = async (item: SearchResult) => {
    if (!selectedCoupleId) {
      setError('Select a couple first');
      return;
    }
    const key = `${item.tmdbId}:${selectedCoupleId}`;
    setAdding((prev) => new Set(prev).add(key));
    try {
      await api.post('/api/watchlist/add', {
        coupleId: selectedCoupleId,
        tmdbId: item.tmdbId,
        imdbId: item.imdbId,
        mediaType: item.mediaType,
        title: item.title,
        posterPath: item.posterPath,
      });
      setAdded((prev) => new Set(prev).add(key));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      if (msg.toLowerCase().includes('already')) {
        setAdded((prev) => new Set(prev).add(key));
      } else {
        setError(msg);
      }
    } finally {
      setAdding((prev) => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  const selectedCouple = couples.find((c) => c.id === selectedCoupleId);
  const partnerName = selectedCouple
    ? (selectedCouple.userB?.name || selectedCouple.userB?.email?.split('@')[0] || selectedCouple.userA.name || selectedCouple.userA.email.split('@')[0])
    : null;

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Add to watchlist</h1>
          <Link to="/dashboard" className="ml-auto text-sm" style={{ color: 'var(--text-secondary)' }}>
            Back to dashboard
          </Link>
        </div>

        {/* Couple picker */}
        {couples.length > 1 && (
          <div className="mb-4 flex gap-2 flex-wrap">
            <span className="text-sm self-center" style={{ color: 'var(--text-secondary)' }}>Adding for:</span>
            {couples.map((c) => {
              const partner = c.userB?.name || c.userB?.email?.split('@')[0] || c.userA.name || c.userA.email.split('@')[0];
              return (
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
                  {partner}
                </button>
              );
            })}
          </div>
        )}

        {selectedCouple && (
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
            Adding to watchlist shared with <strong style={{ color: 'var(--text-primary)' }}>{partnerName}</strong>
          </p>
        )}

        <input
          type="text"
          placeholder="Search for a movie or TV show..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />

        {error && <p className="text-sm mb-4" style={{ color: 'var(--danger)' }}>{error}</p>}
        {loading && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Searching...</p>}
        {!loading && results.length === 0 && query.trim() && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No results found.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((item) => {
            const key = `${item.tmdbId}:${selectedCoupleId}`;
            const isAdded = added.has(key);
            const isAdding = adding.has(key);
            return (
              <div
                key={item.tmdbId}
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
                <div className="p-4 flex flex-col gap-2">
                  <div>
                    <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {item.year} · {item.mediaType === 'tv' ? 'TV Show' : 'Movie'}
                    </p>
                  </div>
                  <button
                    onClick={() => addToWatchlist(item)}
                    disabled={isAdded || isAdding || !selectedCoupleId}
                    className="w-full py-2 rounded-lg text-xs font-medium disabled:opacity-60"
                    style={{
                      background: isAdded ? 'var(--bg-secondary)' : 'var(--accent)',
                      color: isAdded ? 'var(--success)' : 'white',
                      border: isAdded ? '1px solid var(--success)' : 'none',
                    }}
                  >
                    {isAdding ? 'Adding...' : isAdded ? 'Added' : '+ Add to watchlist'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
