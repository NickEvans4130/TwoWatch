export default function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden flex-shrink-0" style={{ width: '160px' }}>
      <div className="skeleton rounded-2xl" style={{ height: '240px' }} />
      <div className="mt-2 space-y-1.5 px-0.5">
        <div className="skeleton rounded h-3.5" style={{ width: '80%' }} />
        <div className="skeleton rounded h-3" style={{ width: '50%' }} />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden">
          <div className="skeleton rounded-2xl" style={{ aspectRatio: '2/3' }} />
          <div className="mt-2 space-y-1.5 px-0.5">
            <div className="skeleton rounded h-3.5" style={{ width: '80%' }} />
            <div className="skeleton rounded h-3" style={{ width: '50%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
