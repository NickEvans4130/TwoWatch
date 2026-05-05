import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useRoom, RoomUser } from '../hooks/useRoom';

interface Room {
  id: string; coupleId: string; imdbId: string;
  mediaType: string; season: number | null; episode: number | null;
}

function getEmbedUrl(room: Room): string {
  if (room.mediaType === 'movie') {
    return `https://vidsrc.cc/embed/movie/${room.imdbId}?autoplay=0`;
  }
  return `https://vidsrc.cc/embed/tv/${room.imdbId}/${room.season ?? 1}/${room.episode ?? 1}?autoplay=0`;
}

function UserSlot({ user, label }: { user: RoomUser | null; label: string }) {
  const dotColor = !user || !user.connected
    ? 'var(--text-muted)'
    : user.ready ? 'var(--ready-green)' : 'var(--warning)';

  const statusText = !user
    ? 'Not joined'
    : !user.connected ? 'Disconnected'
    : user.ready ? 'Ready ✓'
    : 'Here, not ready';

  return (
    <div
      className="flex flex-col items-center gap-2 px-5 py-3 rounded-2xl min-w-[120px]"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${user?.ready && user.connected ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: user?.ready && user.connected ? '0 0 20px rgba(74,222,128,0.1)' : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      <div className="flex items-center gap-1.5">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: dotColor, boxShadow: user?.connected ? `0 0 6px ${dotColor}` : 'none' }}
        />
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {user ? (label === 'You' ? 'You' : user.name) : label}
        </span>
      </div>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{statusText}</span>
    </div>
  );
}

export default function WatchRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [room, setRoom] = useState<Room | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { roomState, partnerStatus, error: socketError, setReady } = useRoom(
    roomId || '', user?.id || '', token || ''
  );

  useEffect(() => {
    if (!roomId) return;
    api.get<{ room: Room }>(`/api/room/${roomId}`)
      .then((res) => setRoom(res.room))
      .catch(() => setLoadError('Room not found'));
  }, [roomId]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'PLAYER_EVENT') { /* future sync hooks */ }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const toggleReady = () => {
    const next = !isReady;
    setIsReady(next);
    setReady(next);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const canPlay = roomState?.canPlay ?? false;
  const users = roomState?.users ?? [];
  const myUser = users.find((u) => u.userId === user?.id) ?? null;
  const partnerUser = users.find((u) => u.userId !== user?.id) ?? null;
  const partnerConnected = partnerUser?.connected ?? false;

  const overlayState = (): 'waiting-partner' | 'both-here' | 'partner-ready' | 'you-ready' | 'starting' => {
    if (!partnerUser || !partnerConnected) return 'waiting-partner';
    if (canPlay) return 'starting';
    if (!myUser?.ready && !partnerUser.ready) return 'both-here';
    if (partnerUser.ready && !myUser?.ready) return 'partner-ready';
    return 'you-ready';
  };

  const overlayContent = () => {
    const state = overlayState();
    const pName = partnerUser?.name || 'your partner';
    const map = {
      'waiting-partner': { icon: '⏳', title: 'Waiting for your partner', sub: 'Share the room link so they can join.' },
      'both-here':       { icon: '🎬', title: "You're both here!", sub: "Tap Ready when you're set to start." },
      'partner-ready':   { icon: '✓', title: `${pName} is ready!`, sub: 'Tap Ready when you want to start.' },
      'you-ready':       { icon: '⏳', title: `Waiting for ${pName}...`, sub: "They'll be ready soon." },
      'starting':        { icon: '▶', title: 'Starting!', sub: '' },
    };
    return map[state];
  };

  const roomLabel = room
    ? room.mediaType === 'tv' && room.season && room.episode
      ? `S${room.season}E${room.episode}`
      : 'Movie'
    : '';

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center p-8 rounded-3xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Room not found</p>
          <Link to="/dashboard" className="text-sm" style={{ color: '#a78bfa' }}>Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const { icon, title, sub } = overlayContent();

  return (
    <div className="flex flex-col h-screen" style={{ background: '#07080f' }}>

      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0 z-20"
        style={{ background: 'rgba(7,8,15,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Link to="/dashboard" className="text-base font-bold gradient-text">TwoWatch</Link>
        {roomLabel && (
          <span className="text-sm px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
            {roomLabel}
          </span>
        )}
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm px-4 py-1.5 rounded-full transition-all duration-150"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.15)'; (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
        >
          Leave
        </button>
      </div>

      {/* Socket error */}
      {socketError && (
        <div className="px-5 py-2 text-sm text-center z-20" style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--danger)', borderBottom: '1px solid rgba(248,113,113,0.2)' }}>
          {socketError}
        </div>
      )}

      {/* Partner toast */}
      {partnerStatus && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-sm font-medium z-50 transition-all"
          style={{
            background: partnerStatus.type === 'disconnected' ? 'rgba(248,113,113,0.9)' : 'rgba(74,222,128,0.9)',
            color: 'white',
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {partnerStatus.type === 'disconnected' ? `${partnerStatus.name} disconnected` : `${partnerStatus.name} rejoined ♥`}
        </div>
      )}

      {/* Video area */}
      <div className="flex-1 relative overflow-hidden">
        {room && (
          <iframe
            ref={iframeRef}
            src={getEmbedUrl(room)}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            allow="autoplay; fullscreen"
            style={{ border: 'none' }}
          />
        )}

        {/* Overlay */}
        {!canPlay && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center z-10 transition-opacity duration-300"
            style={{ background: 'rgba(7,8,15,0.88)', backdropFilter: 'blur(8px)' }}
          >
            {/* Glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(167,139,250,0.08) 0%, transparent 100%)' }}
            />

            <div className="relative z-10 text-center px-8 max-w-sm">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mx-auto mb-5"
                style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}
              >
                {icon}
              </div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h2>
              {sub && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}

              {overlayState() === 'waiting-partner' && (
                <div className="mt-5 flex flex-col items-center gap-3">
                  <button
                    onClick={copyLink}
                    className="btn-glow text-white text-sm font-semibold px-6 py-2.5 rounded-full"
                  >
                    {linkCopied ? '✓ Copied!' : 'Copy room link'}
                  </button>
                  <p className="text-xs font-mono px-3 py-2 rounded-xl break-all" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.06)', maxWidth: '300px' }}>
                    {window.location.href}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div
        className="shrink-0 px-5 py-4 z-20"
        style={{ background: 'rgba(7,8,15,0.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-lg mx-auto flex flex-col gap-4">
          {/* User slots */}
          <div className="flex gap-3 justify-center flex-wrap">
            <UserSlot user={myUser} label="You" />
            <UserSlot user={partnerUser} label="Partner" />
          </div>

          {/* Ready button */}
          <button
            onClick={toggleReady}
            disabled={!partnerConnected}
            className="w-full py-3.5 rounded-2xl font-semibold text-base disabled:opacity-30 transition-all duration-200"
            style={isReady ? {
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-secondary)',
            } : {
              background: 'linear-gradient(135deg, #a78bfa, #f472b6)',
              boxShadow: '0 0 30px rgba(167,139,250,0.35)',
              color: 'white',
              border: 'none',
            }}
            onMouseEnter={(e) => {
              if (!isReady && partnerConnected) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 50px rgba(167,139,250,0.5)';
            }}
            onMouseLeave={(e) => {
              if (!isReady) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(167,139,250,0.35)';
            }}
          >
            {isReady ? '✗ Not ready' : '✓ I\'m Ready'}
          </button>

          {!partnerConnected && (
            <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              Waiting for your partner to connect
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
