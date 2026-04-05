require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const debateRoutes = require('./routes/debate');
const leaderboardRoutes = require('./routes/leaderboard');
const socketHandler = require('./socket/socketHandler');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (!allowedOrigins.includes('http://localhost:5173')) {
  allowedOrigins.push('http://localhost:5173');
}

console.log('[CORS] Allowed origins:', allowedOrigins);

// ... (keep your existing requires and allowedOrigins logic at the top)

const corsOptions = {
  origin: function (origin, callback) {
    // 1. Allow requests with no origin (like mobile apps, curl, or internal tools)
    if (!origin) {
      return callback(null, true);
    }

    // 2. Check if the incoming origin is in our allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      // 3. Log the mismatch to Railway "Deploy Logs" for debugging
      // This will help you see if there is a subtle typo in your CLIENT_URL
      console.error(`[CORS REJECTED] Origin: "${origin}" is not in:`, allowedOrigins);

      // 4. FIX: Pass 'false' instead of 'new Error()' to prevent the 502 crash.
      // This tells Express to block the request safely.
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  // 5. Ensure Pre-flight requests return 200 OK
  optionsSuccessStatus: 200,
};

// ... (keep the rest of your app.use and route logic)

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 10000,
});

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use('/api/auth', authRoutes);
app.use('/api/debate', debateRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date(), allowedOrigins });
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

app.use(errorHandler);

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

socketHandler(io, app);

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 8000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('[DB] Connected to MongoDB');
    if (fs.existsSync(frontendDistPath)) {
      console.log(`[FRONTEND] Serving built app from ${frontendDistPath}`);
    } else {
      console.log('[FRONTEND] No built frontend found — API-only mode');
    }
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`[SERVER] Running on port ${PORT}`);
      console.log(`[MODE] ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  });

process.on('SIGTERM', () => {
  console.log('[SERVER] SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = { app, io };