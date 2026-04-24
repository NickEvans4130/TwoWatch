import { useState } from 'react';
import { posterUrl, itemTitle, itemYear, TMDBItem } from '../lib/tmdb';

interface Props {
  item: TMDBItem;
  onAdd?: (item: TMDBItem) => Promise<void>;
  added?: boolean;
  size?: 'sm' | 'md';
}

export default function MovieCard({ item, onAdd, added, size = 'md' }: Props) {
  const [adding, setAdding] = useState(false);
  const [localAdded, setLocalAdded] = useState(false);
  const isAdded = added || localAdded;

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAdd || isAdded || adding) return;
    setAdding(true);
    try {
      await onAdd(item);
      setLocalAdded(true);
    } finally {
      setAdding(false);
    }
  };

  const poster = posterUrl(item.poster_path);
  const title = itemTitle(item);
  const year = itemYear(item);
  const width = size === 'sm' ? '140px' : '160px';
  const height = size === 'sm' ? '210px' : '240px';

  return (
    <div
      className="group relative flex-shrink-0 cursor-pointer"
      style={{ width }}
    >
      {/* Poster */}
      <div
        className="relative rounded-2xl overflow-hidden transition-all duration-200 ease-out"
        style={{
          height,
          background: 'rgba(255,255,255,0.05)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        {poster ? (
          <img
            src={poster}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: 'rgba(167,139,250,0.1)' }}>
            🎬
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
          {onAdd && (
            <button
              onClick={handleAdd}
              disabled={isAdded || adding}
              className="w-full py-1.5 rounded-full text-xs font-semibold transition-all duration-150"
              style={{
                background: isAdded
                  ? 'rgba(74,222,128,0.2)'
                  : 'linear-gradient(135deg, #a78bfa, #f472b6)',
                color: isAdded ? '#4ade80' : 'white',
                border: isAdded ? '1px solid rgba(74,222,128,0.4)' : 'none',
                boxShadow: isAdded ? 'none' : '0 0 20px rgba(167,139,250,0.4)',
              }}
            >
              {adding ? '...' : isAdded ? '✓ Added' : '+ Add'}
            </button>
          )}
        </div>

        {/* Media type badge */}
        <div
          className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            background: item.media_type === 'tv' ? 'rgba(167,139,250,0.25)' : 'rgba(244,114,182,0.25)',
            color: item.media_type === 'tv' ? '#a78bfa' : '#f472b6',
            border: `1px solid ${item.media_type === 'tv' ? 'rgba(167,139,250,0.3)' : 'rgba(244,114,182,0.3)'}`,
            backdropFilter: 'blur(8px)',
          }}
        >
          {item.media_type === 'tv' ? 'TV' : 'Film'}
        </div>

        {/* Hover glow ring */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{ boxShadow: 'inset 0 0 0 1px rgba(167,139,250,0.3)' }}
        />
      </div>

      {/* Title */}
      <div className="mt-2 px-0.5">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {year}
        </p>
      </div>
    </div>
  );
}
