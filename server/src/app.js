// TeamConnect — Main Express App
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);

// ── Socket.io setup ──────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Make io accessible in routes
app.set('io', io);

// ── Middleware ───────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Static files (uploaded avatars, PDFs) ───
app.use('/uploads', express.static('uploads'));

// ── Routes ───────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/invitations', require('./routes/roles'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/ideas', require('./routes/ideas'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/matching', require('./routes/matching'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/skills', require('./routes/skills'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/leaderboard', require('./routes/leaderboard'));

// ── Health check ─────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global error handler ─────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Socket.io handlers ───────────────────────
require('./socket/handlers')(io);

// ── Start server ─────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 TeamConnect server running on port ${PORT}`);
});

module.exports = { app, httpServer };
