import { useRef } from 'react';

interface Props {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export default function SectionRow({ title, children, action }: Props) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: dir === 'right' ? 360 : -360, behavior: 'smooth' });
  };

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {action}
          <button
            onClick={() => scroll('left')}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 text-xs"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}
            aria-label="Scroll left"
          >
            ←
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 text-xs"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}
            aria-label="Scroll right"
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto scroll-hide pb-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {children}
      </div>
    </section>
  );
}
