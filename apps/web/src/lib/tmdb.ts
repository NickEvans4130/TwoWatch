const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE = 'https://api.themoviedb.org/3';
export const IMG_BASE = 'https://image.tmdb.org/t/p/w500';

export function posterUrl(path: string | null | undefined): string {
  return path ? `${IMG_BASE}${path}` : '';
}

export interface TMDBItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  media_type: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  overview?: string;
}

const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 5 * 60 * 1000;

async function get<T>(path: string): Promise<T> {
  if (!API_KEY) throw new Error('VITE_TMDB_API_KEY not set');
  const cacheKey = path;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < TTL) return hit.data as T;

  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${BASE}${path}${sep}api_key=${API_KEY}`);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  const data = await res.json();
  cache.set(cacheKey, { data, ts: Date.now() });
  return data as T;
}

export async function getPopularMovies(): Promise<TMDBItem[]> {
  const data = await get<{ results: TMDBItem[] }>('/movie/popular');
  return data.results.map((m) => ({ ...m, media_type: 'movie' as const }));
}

export async function getTrending(): Promise<TMDBItem[]> {
  const data = await get<{ results: TMDBItem[] }>('/trending/all/week');
  return data.results.filter(
    (r): r is TMDBItem => r.media_type === 'movie' || r.media_type === 'tv'
  );
}

export async function searchTMDB(query: string): Promise<TMDBItem[]> {
  if (!query.trim()) return [];
  const data = await get<{ results: TMDBItem[] }>(
    `/search/multi?query=${encodeURIComponent(query)}&include_adult=false`
  );
  return data.results.filter(
    (r): r is TMDBItem => r.media_type === 'movie' || r.media_type === 'tv'
  );
}

export function itemTitle(item: TMDBItem): string {
  return item.title || item.name || 'Unknown';
}

export function itemYear(item: TMDBItem): string {
  const d = item.release_date || item.first_air_date;
  return d ? String(new Date(d).getFullYear()) : '';
}
