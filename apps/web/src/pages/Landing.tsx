import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Nav from '../components/Nav';

function FloatingOrb({ size, top, left, color, delay }: {
  size: number; top: string; left: string; color: string; delay: string;
}) {
  return (
    <div
      className="absolute rounded-full pointer-events-none animate-pulse-glow"
      style={{
        width: size, height: size,
        top, left,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: 'blur(40px)',
        animationDelay: delay,
      }}
    />
  );
}

function HeroMockup() {
  return (
    <div
      className="relative mx-auto animate-float"
      style={{ maxWidth: '520px' }}
    >
      {/* Glow behind mockup */}
      <div
        className="absolute inset-0 rounded-3xl"
        style={{
          background: 'radial-gradient(ellipse, rgba(167,139,250,0.2) 0%, transparent 70%)',
          filter: 'blur(30px)',
          transform: 'scale(1.2)',
        }}
      />

      {/* Mock watch room UI */}
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(12,13,26,0.9)',
          border: '1px solid rgba(167,139,250,0.2)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(167,139,250,0.15)',
        }}
      >
        {/* Mock video area */}
        <div className="relative" style={{ background: '#0a0b16', paddingBottom: '52%' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="text-5xl opacity-30"
              style={{ filter: 'blur(1px)' }}
            >
              ▶
            </div>
          </div>
          {/* Overlay state */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: 'rgba(7,8,15,0.75)', backdropFilter: 'blur(4px)' }}
          >
            <div className="text-2xl mb-2">🎬</div>
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Both here — tap Ready to start
            </p>
          </div>
        </div>

        {/* Mock controls */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: '#4ade80' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>You</span>
                <span className="text-xs ml-1 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', fontSize: '10px' }}>Ready</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Alex</span>
              <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: '#fbbf24' }} />
            </div>
          </div>
          <div
            className="w-full py-2.5 rounded-full text-center text-sm font-semibold btn-glow"
            style={{ color: 'white' }}
          >
            ✓ I'm Ready
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Background glows */}
      <FloatingOrb size={600} top="-15%" left="30%" color="rgba(167,139,250,0.12)" delay="0s" />
      <FloatingOrb size={400} top="40%" left="-10%" color="rgba(244,114,182,0.08)" delay="1.5s" />
      <FloatingOrb size={300} top="60%" left="70%" color="rgba(167,139,250,0.08)" delay="3s" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 0%, transparent 100%)',
        }}
      />

      <div className="relative z-10">
        <Nav transparent />

        {/* Hero */}
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-24">
          <div className="text-center mb-16">
            {/* Tag */}
            <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full text-sm" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa' }}>
              <span className="animate-pulse-glow">♥</span>
              For long-distance couples
            </div>

            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight mb-4 leading-[1.05]">
              <span style={{ color: 'var(--text-primary)' }}>Watch together.</span>
              <br />
              <span className="gradient-text">Actually together.</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl max-w-lg mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              A private space for two. Both of you must be ready before anything plays — no more countdowns.
            </p>

            <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
              <Link
                to={user ? '/dashboard' : '/login'}
                className="btn-glow text-white font-semibold px-8 py-4 rounded-full text-base inline-flex items-center gap-2"
              >
                {user ? 'Go to dashboard' : 'Start watching together'}
                <span>→</span>
              </Link>
              {!user && (
                <Link
                  to="/login"
                  className="text-sm px-6 py-4 rounded-full font-medium transition-all duration-200"
                  style={{ color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  Learn more
                </Link>
              )}
            </div>
          </div>

          {/* Mockup */}
          <div className="mb-24 px-4">
            <HeroMockup />
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                icon: '🔒',
                title: 'Mutual ready gate',
                desc: 'Neither of you can start until both confirm. No accidental starts, no waiting alone.',
              },
              {
                icon: '🎬',
                title: 'Any show or movie',
                desc: 'Search TMDB, build a shared watchlist, watch via embedded player. Thousands of titles.',
              },
              {
                icon: '💌',
                title: 'Long-distance friendly',
                desc: 'Works over any connection. Share a room link — your partner joins in one click.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="glass-card rounded-3xl p-6 group"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 transition-transform duration-200 group-hover:scale-110"
                  style={{ background: 'rgba(167,139,250,0.1)' }}
                >
                  {f.icon}
                </div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-12" style={{ color: 'var(--text-muted)' }}>
          <p className="text-sm">Made with ♥ for long-distance love</p>
        </div>
      </div>
    </div>
  );
}
