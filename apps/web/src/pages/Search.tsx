import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Nav from '../components/Nav';
import MovieCard from '../components/MovieCard';
import SectionRow from '../components/SectionRow';
import SkeletonCard from '../components/SkeletonCard';
import { api } from '../lib/api';
import { getPopularMovies, getTrending, searchTMDB, TMDBItem, itemTitle } from '../lib/tmdb';

interface Couple {
  id: string; inviteCode: string;
  userA: { id: string; email: string; name: string | null };
  userB: { id: string; email: string; name: string | null } | null;
  _count: { watchlist: number };
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('coupleId') ?? '';

  const [couples, setCouples] = useState<Couple[]>([]);
  const [selectedCoupleId, setSelectedCoupleId] = useState(preselectedId);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBItem[]>([]);
  const [popular, setPopular] = useState<TMDBItem[]>([]);
  const [trending, setTrending] = useState<TMDBItem[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load couples
  useEffect(() => {
    api.get<{ couples: Couple[] }>('/api/couple/me').then((res) => {
      setCouples(res.couples);
      if (!selectedCoupleId && res.couples.length > 0) {
        setSelectedCoupleId(res.couples[0].id);
      }
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load popular + trending on mount
  useEffect(() => {
    getPopularMovies().then((r) => setPopular(r.slice(0, 20))).catch(() => {}).finally(() => setLoadingPopular(false));
    getTrending().then((r) => setTrending(r.slice(0, 20))).catch(() => {}).finally(() => setLoadingTrending(false));
  }, []);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setLoadingSearch(true);
    try {
      const results = await searchTMDB(q);
      setSearchResults(results);
    } catch { setSearchResults([]); }
    finally { setLoadingSearch(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  // Add item to watchlist — resolves IMDB ID via backend enrich endpoint
  const handleAdd = useCallback(async (item: TMDBItem) => {
    if (!selectedCoupleId) { setError('Select a couple first'); return; }
    setError(null);

    let imdbId = '';
    try {
      const enriched = await api.get<{ imdbId: string }>(
        `/api/search/enrich?tmdbId=${item.id}&mediaType=${item.media_type}`
      );
      imdbId = enriched.imdbId;
    } catch { /* proceed without IMDB ID */ }

    await api.post('/api/watchlist/add', {
      coupleId: selectedCoupleId,
      tmdbId: String(item.id),
      imdbId,
      mediaType: item.media_type,
      title: itemTitle(item),
      posterPath: item.poster_path,
    });
  }, [selectedCoupleId]);

  const searching = query.trim().length > 0;

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg)' }}>
      {/* bg glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{ width: '600px', height: '300px', background: 'radial-gradient(ellipse, rgba(244,114,182,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      <Nav />

      <main className="relative z-10 max-w-5xl mx-auto px-5 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Link to="/dashboard" className="text-sm transition-colors duration-150" style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
              ← Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Add to watchlist <span className="gradient-text">♥</span>
          </h1>
        </div>

        {/* Couple picker */}
        {couples.length > 0 && (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Adding for:</span>
            {couples.map((c) => {
              const name = c.userB?.name || c.userB?.email?.split('@')[0] || c.userA.name || c.userA.email.split('@')[0];
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCoupleId(c.id)}
                  className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150"
                  style={{
                    background: selectedCoupleId === c.id ? 'linear-gradient(135deg, #a78bfa, #f472b6)' : 'rgba(255,255,255,0.06)',
                    color: selectedCoupleId === c.id ? 'white' : 'var(--text-secondary)',
                    boxShadow: selectedCoupleId === c.id ? '0 0 20px rgba(167,139,250,0.25)' : 'none',
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 rounded-2xl text-sm" style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--danger)', border: '1px solid rgba(248,113,113,0.2)' }}>
            {error}
          </div>
        )}

        {/* Search bar */}
        <div className="relative mb-10">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-lg pointer-events-none" style={{ color: 'var(--text-muted)' }}>
            🔍
          </div>
          <input
            type="text"
            placeholder="Search for a movie or show..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="input-glow w-full pl-12 pr-5 py-4 rounded-2xl text-base"
            style={{ fontSize: '16px' }}
          />
          {loadingSearch && (
            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>
              ...
            </div>
          )}
        </div>

        {/* Search results */}
        {searching ? (
          <div>
            <h2 className="text-base font-semibold mb-4 px-1" style={{ color: 'var(--text-secondary)' }}>
              {loadingSearch ? 'Searching...' : `Results for "${query}"`}
            </h2>
            {!loadingSearch && searchResults.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🎬</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No results found. Try a different title.</p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {searchResults.map((item) => (
                <MovieCard
                  key={item.id}
                  item={item}
                  onAdd={selectedCoupleId ? handleAdd : undefined}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Popular picks */}
            <SectionRow title="Popular picks">
              {loadingPopular
                ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
                : popular.map((item) => (
                    <MovieCard
                      key={item.id}
                      item={item}
                      onAdd={selectedCoupleId ? handleAdd : undefined}
                    />
                  ))}
            </SectionRow>

            {/* Trending */}
            <SectionRow title="Trending this week">
              {loadingTrending
                ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
                : trending.map((item) => (
                    <MovieCard
                      key={item.id}
                      item={item}
                      onAdd={selectedCoupleId ? handleAdd : undefined}
                    />
                  ))}
            </SectionRow>

            <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
              Tip: search by title or paste a TMDB link to find anything
            </p>
          </>
        )}
      </main>
    </div>
  );
}
