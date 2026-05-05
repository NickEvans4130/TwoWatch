import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import coupleRoutes from './routes/couple';
import watchlistRoutes from './routes/watchlist';
import searchRoutes from './routes/search';
import roomRoutes from './routes/room';
import { setupSocket } from './socket/roomSocket';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/couple', coupleRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/room', roomRoutes);

setupSocket(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

httpServer.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Run: lsof -i :${PORT} -t | xargs kill -9`);
    process.exit(1);
  } else {
    throw err;
  }
});

function shutdown() {
  httpServer.close(() => process.exit(0));
  // Force exit if server hasn't closed within 2s
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
