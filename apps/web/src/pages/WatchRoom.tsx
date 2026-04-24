import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useRoom, RoomUser } from '../hooks/useRoom';

interface Room {
  id: string;
  coupleId: string;
  imdbId: string;
  mediaType: string;
  season: number | null;
  episode: number | null;
}

function getEmbedUrl(room: Room): string {
  if (room.mediaType === 'movie') {
    return `https://vidsrc.cc/embed/movie/${room.imdbId}?autoplay=0`;
  }
  const s = room.season ?? 1;
  const e = room.episode ?? 1;
  return `https://vidsrc.cc/embed/tv/${room.imdbId}/${s}/${e}?autoplay=0`;
}

function StatusDot({ user }: { user: RoomUser }) {
  let color = 'var(--text-secondary)'; // grey = disconnected
  if (user.connected && user.ready) color = 'var(--ready-green)';
  else if (user.connected) color = 'var(--warning)';

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minWidth: '140px' }}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {user.name}
        </span>
      </div>
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        {!user.connected ? 'Disconnected' : user.ready ? 'Ready' : 'Not ready'}
      </p>
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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { roomState, partnerStatus, setReady } = useRoom(
    roomId || '',
    user?.id || '',
    token || ''
  );

  useEffect(() => {
    if (!roomId) return;
    api.get<{ room: Room }>(`/api/room/${roomId}`)
      .then((res) => setRoom(res.room))
      .catch(() => setLoadError('Room not found'));
  }, [roomId]);

  // Sync local ready state with what we've emitted
  const toggleReady = () => {
    const next = !isReady;
    setIsReady(next);
    setReady(next);
  };

  const canPlay = roomState?.canPlay ?? false;
  const users = roomState?.users ?? [];
  const myUser = users.find((u) => u.userId === user?.id);
  const partnerUser = users.find((u) => u.userId !== user?.id);
  const partnerConnected = partnerUser?.connected ?? false;

  const overlayMessage = (): string => {
    if (!partnerUser || !partnerConnected) return 'Waiting for your partner to join...';
    if (!myUser?.ready && !partnerUser.ready) return "Both here — tap Ready when you're set";
    if (!myUser?.ready) return `${partnerUser.name} is ready — tap Ready to start`;
    if (!partnerUser.ready) return `Waiting for ${partnerUser.name} to be ready...`;
    return 'Starting...';
  };

  const roomTitle = room
    ? room.mediaType === 'tv' && room.season && room.episode
      ? `S${room.season}E${room.episode}`
      : ''
    : '';

  // Listen to postMessage from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'PLAYER_EVENT') {
        const { event } = e.data.data || {};
        if (event === 'play' && !canPlay) {
          // Partner not ready — show overlay again (canPlay will be false, overlay will re-appear)
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [canPlay]);

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <p className="mb-4" style={{ color: 'var(--danger)' }}>{loadError}</p>
          <Link to="/dashboard" style={{ color: 'var(--accent)' }}>Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
      >
        <Link to="/dashboard" className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          TwoWatch
        </Link>
        {room && (
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {roomTitle}
          </span>
        )}
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm px-3 py-1.5 rounded-md"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          Leave
        </button>
      </div>

      {/* Partner status toast */}
      {partnerStatus && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm z-50 transition-all"
          style={{
            background: partnerStatus.type === 'disconnected' ? 'var(--danger)' : 'var(--success)',
            color: 'white',
          }}
        >
          {partnerStatus.type === 'disconnected'
            ? `${partnerStatus.name} disconnected`
            : `${partnerStatus.name} rejoined`}
        </div>
      )}

      {/* Video area */}
      <div className="flex-1 relative overflow-hidden">
        {/* VidSrc iframe — always mounted */}
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
            className="absolute inset-0 flex flex-col items-center justify-center z-10"
            style={{ background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(4px)' }}
          >
            <div className="text-center max-w-sm px-6">
              <div className="text-4xl mb-4">
                {!partnerConnected ? '⏳' : myUser?.ready && partnerUser?.ready ? '▶' : '🎬'}
              </div>
              <p className="text-base font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                {overlayMessage()}
              </p>
              {!partnerConnected && (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Share the room link with your partner
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div
        className="shrink-0 px-4 py-4"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
      >
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          {/* User status cards */}
          <div className="flex gap-3 justify-center flex-wrap">
            {myUser && (
              <StatusDot user={{ ...myUser, name: 'You' }} />
            )}
            {partnerUser && (
              <StatusDot user={partnerUser} />
            )}
            {!partnerUser && (
              <div
                className="rounded-xl p-4 flex flex-col gap-2"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minWidth: '140px' }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--text-secondary)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Partner</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Not joined yet</p>
              </div>
            )}
          </div>

          {/* Ready button */}
          <button
            onClick={toggleReady}
            disabled={!partnerConnected}
            className="w-full py-3 rounded-xl font-semibold text-base disabled:opacity-40 transition-colors"
            style={{
              background: isReady ? 'var(--bg-card)' : 'var(--accent)',
              color: isReady ? 'var(--text-secondary)' : 'white',
              border: isReady ? '1px solid var(--border)' : 'none',
            }}
          >
            {isReady ? '✗ Not ready' : '✓ I\'m Ready'}
          </button>

          {!partnerConnected && (
            <p className="text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
              Waiting for your partner to connect before you can get ready
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
