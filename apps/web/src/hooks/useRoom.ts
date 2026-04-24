import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export interface RoomUser {
  userId: string;
  name: string;
  ready: boolean;
  connected: boolean;
}

export interface RoomState {
  roomId: string;
  users: RoomUser[];
  bothReady: boolean;
  canPlay: boolean;
}

export function useRoom(roomId: string, userId: string, token: string) {
  const socketRef = useRef<Socket | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [partnerStatus, setPartnerStatus] = useState<{ type: 'disconnected' | 'reconnected'; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_room', { roomId, userId, token });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('room_state', (state: RoomState) => {
      setRoomState(state);
    });

    socket.on('partner_disconnected', ({ name }: { name: string }) => {
      setPartnerStatus({ type: 'disconnected', name });
      setTimeout(() => setPartnerStatus(null), 5000);
    });

    socket.on('partner_reconnected', ({ name }: { name: string }) => {
      setPartnerStatus({ type: 'reconnected', name });
      setTimeout(() => setPartnerStatus(null), 3000);
    });

    socket.on('error', ({ message }: { message: string }) => {
      setError(message);
    });

    const heartbeat = setInterval(() => {
      socket.emit('heartbeat', { roomId });
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      socket.disconnect();
    };
  }, [roomId, userId, token]);

  const setReady = useCallback((ready: boolean) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit(ready ? 'user_ready' : 'user_unready', { roomId });
  }, [roomId]);

  return { roomState, partnerStatus, error, connected, setReady };
}
