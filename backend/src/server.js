require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const debateRoutes = require('./routes/debate');
const leaderboardRoutes = require('./routes/leaderboard');
const socketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST'], credentials: true }
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});
app.use('/api/auth', authRoutes);
app.use('/api/debate', debateRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Socket.io
socketHandler(io);

// DB + Start
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('[DB] Connected to MongoDB');
    server.listen(process.env.PORT || 5000, () => {
      console.log(`[SERVER] Running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch(err => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  });

module.exports = { app, io };
