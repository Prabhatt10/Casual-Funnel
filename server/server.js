import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import connectDB from './config/db.js';
import eventRoutes from './routes/eventRoutes.js';
import Event from './models/Event.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

dotenv.config();

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true
  }
});

// Make socket.io instance available globally inside controllers
app.set('socketio', io);

// Socket Connection handling
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);
  
  // Listen for direct 'new_click' socket emissions from clients
  socket.on('new_click', async (payload) => {
    try {
      const { sessionId, pageUrl, x, y, timestamp } = payload;

      if (!sessionId || !pageUrl || x === undefined || y === undefined) {
        console.warn('Socket received invalid new_click payload:', payload);
        return;
      }

      const savedEvent = await Event.create({
        sessionId,
        eventType: 'click',
        pageUrl,
        timestamp: new Date(timestamp || Date.now()),
        coordinates: { x: Number(x), y: Number(y) }
      });

      // Broadcast to all dashboard client listeners
      io.emit('click_received', savedEvent);
    } catch (error) {
      console.error('Socket error saving direct new_click:', error.message);
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

// Middleware Setup
app.use(helmet({
  contentSecurityPolicy: false // Allows loading tracker scripts etc in local environment easily
}));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5174', // fallback for Vite alt ports
  'http://127.0.0.1:5500',  // standard live server ports for tracker testing
  'http://localhost:5500',
  'http://127.0.0.1:8080',
  'http://localhost:8080'
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl or local scripts loaded locally)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    return callback(null, true); // for demo tracker versatility, accept any source during evaluation
  },
  credentials: true
}));

// API Routes
app.use('/api', eventRoutes);

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'User Analytics API is running...' });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
