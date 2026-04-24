import { useState, useEffect, useRef, useCallback } from 'react';
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

interface SearchResponse {
  results: SearchResult[];
}

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`);
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
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  const addToWatchlist = async (item: SearchResult) => {
    setAdding((prev) => new Set(prev).add(item.tmdbId));
    try {
      await api.post('/api/watchlist/add', {
        tmdbId: item.tmdbId,
        imdbId: item.imdbId,
        mediaType: item.mediaType,
        title: item.title,
        posterPath: item.posterPath,
      });
      setAdded((prev) => new Set(prev).add(item.tmdbId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      if (msg.toLowerCase().includes('already')) {
        setAdded((prev) => new Set(prev).add(item.tmdbId));
      }
    } finally {
      setAdding((prev) => {
        const next = new Set(prev);
        next.delete(item.tmdbId);
        return next;
      });
    }
  };

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Add to watchlist</h1>

        <input
          type="text"
          placeholder="Search for a movie or TV show..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-6"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />

        {error && (
          <p className="text-sm mb-4" style={{ color: 'var(--danger)' }}>{error}</p>
        )}

        {loading && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Searching...</p>
        )}

        {!loading && results.length === 0 && query.trim() && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No results found.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((item) => (
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
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {item.year} · {item.mediaType === 'tv' ? 'TV Show' : 'Movie'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => addToWatchlist(item)}
                  disabled={added.has(item.tmdbId) || adding.has(item.tmdbId)}
                  className="w-full py-2 rounded-lg text-xs font-medium disabled:opacity-60"
                  style={{
                    background: added.has(item.tmdbId) ? 'var(--bg-secondary)' : 'var(--accent)',
                    color: added.has(item.tmdbId) ? 'var(--success)' : 'white',
                    border: added.has(item.tmdbId) ? '1px solid var(--success)' : 'none',
                  }}
                >
                  {adding.has(item.tmdbId) ? 'Adding...' : added.has(item.tmdbId) ? 'Added' : '+ Add to watchlist'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
