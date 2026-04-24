import { Router, Request, Response } from 'express';

const router = Router();

const TMDB_BASE = 'https://api.themoviedb.org/3';

async function tmdbGet(path: string): Promise<unknown> {
  const url = `${TMDB_BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${process.env.TMDB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const q = req.query.q as string;
  const type = req.query.type as string | undefined;

  if (!q) {
    res.status(400).json({ error: 'Missing query parameter q' });
    return;
  }

  if (!process.env.TMDB_API_KEY) {
    res.status(500).json({ error: 'TMDB_API_KEY not configured' });
    return;
  }

  try {
    const searchData = await tmdbGet(`/search/multi?query=${encodeURIComponent(q)}&include_adult=false`) as {
      results: Array<{
        id: number;
        media_type: string;
        title?: string;
        name?: string;
        poster_path?: string;
        release_date?: string;
        first_air_date?: string;
      }>;
    };

    const filtered = searchData.results.filter((r) => {
      if (r.media_type !== 'movie' && r.media_type !== 'tv') return false;
      if (type && r.media_type !== type) return false;
      return true;
    });

    const results = await Promise.all(
      filtered.slice(0, 10).map(async (r) => {
        try {
          const extData = await tmdbGet(`/${r.media_type}/${r.id}/external_ids`) as { imdb_id?: string };
          const imdbId = extData.imdb_id || '';
          const dateStr = r.release_date || r.first_air_date || '';
          return {
            tmdbId: String(r.id),
            imdbId,
            title: r.title || r.name || '',
            posterPath: r.poster_path || null,
            mediaType: r.media_type as 'movie' | 'tv',
            year: dateStr ? new Date(dateStr).getFullYear() : null,
          };
        } catch {
          return null;
        }
      })
    );

    res.json({ results: results.filter(Boolean) });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
