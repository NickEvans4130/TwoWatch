import { Server, Socket } from 'socket.io';
import { verifyToken } from '../lib/jwt';
import prisma from '../lib/prisma';

interface UserSlot {
  userId: string;
  name: string;
  ready: boolean;
  connected: boolean;
  lastSeen: number;
  socketId: string;
}

interface RoomState {
  roomId: string;
  coupleId: string;
  users: Map<string, UserSlot>;
  startedAt: number | null;
  lastActivity: number;
}

const rooms = new Map<string, RoomState>();

function getRoomState(roomId: string) {
  return rooms.get(roomId);
}

function broadcastRoomState(io: Server, roomId: string) {
  const state = rooms.get(roomId);
  if (!state) return;

  const users = Array.from(state.users.values()).map((u) => ({
    userId: u.userId,
    name: u.name,
    ready: u.ready,
    connected: u.connected,
  }));

  const connectedUsers = users.filter((u) => u.connected);
  const bothReady = connectedUsers.length === 2 && connectedUsers.every((u) => u.ready);

  io.to(roomId).emit('room_state', {
    roomId,
    users,
    bothReady,
    canPlay: bothReady,
  });
}

async function recordWatchProgress(roomId: string) {
  const state = rooms.get(roomId);
  if (!state || !state.startedAt) return;

  const elapsed = Date.now() - state.startedAt;
  if (elapsed < 10 * 60 * 1000) return; // less than 10 min

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return;

    const item = await prisma.watchlistItem.findFirst({
      where: { coupleId: room.coupleId, tmdbId: room.tmdbId },
    });
    if (!item) return;

    const userIds = Array.from(state.users.keys());
    await prisma.watchProgress.create({
      data: {
        watchlistItemId: item.id,
        season: room.season,
        episode: room.episode,
        completedBy: JSON.stringify(userIds),
      },
    });
  } catch (err) {
    console.error('Failed to record watch progress:', err);
  }
}

// Expire rooms after 24h of inactivity
setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, room] of rooms) {
    if (room.lastActivity < cutoff) {
      rooms.delete(id);
    }
  }
}, 60 * 60 * 1000);

export function setupSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;

    socket.on('join_room', async ({ roomId, userId, token }: { roomId: string; userId: string; token: string }) => {
      try {
        const payload = verifyToken(token);
        if (payload.userId !== userId) {
          socket.emit('error', { message: 'Token mismatch' });
          return;
        }

        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: { couple: { include: { userA: true, userB: true } } },
        });

        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const couple = room.couple;
        const isUserA = couple.userAId === userId;
        const isUserB = couple.userBId === userId;

        console.log(`[room] join_room roomId=${roomId} userId=${userId} isUserA=${isUserA} isUserB=${isUserB} coupleUserB=${couple.userBId ?? 'null'}`);

        if (!isUserA && !isUserB) {
          console.log(`[room] rejected: user ${userId} not in couple ${couple.id}`);
          socket.emit('error', { message: 'Not authorized for this room — make sure both accounts are in the same couple' });
          return;
        }

        const userName = (isUserA ? couple.userA.name : couple.userB?.name) || payload.email;

        currentRoomId = roomId;
        currentUserId = userId;

        socket.join(roomId);

        if (!rooms.has(roomId)) {
          rooms.set(roomId, {
            roomId,
            coupleId: couple.id,
            users: new Map(),
            startedAt: null,
            lastActivity: Date.now(),
          });
        }

        const state = rooms.get(roomId)!;
        state.lastActivity = Date.now();

        const existing = state.users.get(userId);
        if (existing) {
          // Reconnect
          existing.connected = true;
          existing.socketId = socket.id;
          existing.lastSeen = Date.now();
          socket.to(roomId).emit('partner_reconnected', { name: userName });
        } else {
          state.users.set(userId, {
            userId,
            name: userName,
            ready: false,
            connected: true,
            lastSeen: Date.now(),
            socketId: socket.id,
          });
        }

        broadcastRoomState(io, roomId);
      } catch (err) {
        console.error('join_room error:', err);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('user_ready', ({ roomId }: { roomId: string }) => {
      if (!currentUserId) return;
      const state = rooms.get(roomId);
      if (!state) return;

      const user = state.users.get(currentUserId);
      if (!user) return;

      user.ready = true;
      state.lastActivity = Date.now();

      // Track when both become ready for the first time
      const connectedUsers = Array.from(state.users.values()).filter((u) => u.connected);
      if (connectedUsers.length === 2 && connectedUsers.every((u) => u.ready) && !state.startedAt) {
        state.startedAt = Date.now();
      }

      broadcastRoomState(io, roomId);
    });

    socket.on('user_unready', ({ roomId }: { roomId: string }) => {
      if (!currentUserId) return;
      const state = rooms.get(roomId);
      if (!state) return;

      const user = state.users.get(currentUserId);
      if (!user) return;

      user.ready = false;
      state.lastActivity = Date.now();
      broadcastRoomState(io, roomId);
    });

    socket.on('heartbeat', ({ roomId }: { roomId: string }) => {
      if (!currentUserId) return;
      const state = rooms.get(roomId);
      if (!state) return;

      const user = state.users.get(currentUserId);
      if (user) {
        user.lastSeen = Date.now();
        state.lastActivity = Date.now();
      }
    });

    socket.on('disconnect', async () => {
      if (!currentRoomId || !currentUserId) return;

      const state = rooms.get(currentRoomId);
      if (!state) return;

      const user = state.users.get(currentUserId);
      if (user) {
        user.connected = false;
        user.ready = false;
        socket.to(currentRoomId).emit('partner_disconnected', { name: user.name });
        broadcastRoomState(io, currentRoomId);
      }

      // Check if all users disconnected → record progress
      const anyConnected = Array.from(state.users.values()).some((u) => u.connected);
      if (!anyConnected) {
        await recordWatchProgress(currentRoomId);
      }
    });
  });
}
