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
