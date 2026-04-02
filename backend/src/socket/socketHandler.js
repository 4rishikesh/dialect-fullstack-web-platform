const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DebateSession = require('../models/DebateSession');
const matchmakingService = require('../services/matchmakingService');
const nlpService = require('../services/nlpService');

// Active rooms: roomId -> { userA, userB, session, turnTimer, round, started }
const activeRooms = new Map();

function verifySocket(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error('Authentication error'));
  }
}

module.exports = function (io) {
  io.use(verifySocket);

  io.on('connection', async (socket) => {
    let user;
    try {
      user = await User.findById(socket.userId).select('-password');
      if (!user || user.isBanned) { socket.disconnect(); return; }
      socket.user = user;
    } catch { socket.disconnect(); return; }

    console.log(`[SOCKET] Connected: ${user.username} (${socket.id})`);

    // ─── MATCHMAKING ──────────────────────────────────────────────
    socket.on('queue:join', async ({ topic, mode }) => {
      if (matchmakingService.isInQueue(socket.userId)) return;
      matchmakingService.addToQueue(socket.userId, user.eloRating, topic || 'General', mode || 'text', socket.id);
      socket.emit('queue:joined', { queueSize: matchmakingService.getQueueSize() });

      const match = matchmakingService.findMatch(socket.userId);
      if (match) await createRoom(io, match);
    });

    socket.on('queue:leave', () => {
      matchmakingService.removeFromQueue(socket.userId);
      socket.emit('queue:left');
    });

    // ─── DEBATE ROOM ───────────────────────────────────────────────
    socket.on('room:join', ({ roomId }) => {
      const room = activeRooms.get(roomId);
      if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
      socket.join(roomId);
      socket.currentRoom = roomId;

      const isA = room.userA.userId === socket.userId;
      const isB = room.userB.userId === socket.userId;
      if (!isA && !isB) { socket.emit('error', { message: 'Not a participant' }); return; }

      room[isA ? 'socketA' : 'socketB'] = socket.id;
      room[isA ? 'connectedA' : 'connectedB'] = true;

      if (room.connectedA && room.connectedB && !room.started) {
        room.started = true;
        startDebate(io, roomId);
      }
    });

    socket.on('debate:send_message', async ({ roomId, content }) => {
      const room = activeRooms.get(roomId);
      if (!room || !room.started) return;
      const isA = room.userA.userId === socket.userId;
      const isB = room.userB.userId === socket.userId;
      if (!isA && !isB) return;
      const turn = room.session.currentTurn;
      if ((turn === 'A' && !isA) || (turn === 'B' && !isB)) {
        socket.emit('error', { message: 'Not your turn' }); return;
      }

      const { filtered, wasFiltered } = nlpService.filterProfanity(content);
      const alias = isA ? room.session.userAAliasInSession : room.session.userBAliasInSession;

      const msg = { userId: socket.userId, alias, content: filtered, filtered: wasFiltered, round: room.session.currentRound, timestamp: new Date() };
      room.session.transcript.push(msg);

      io.to(roomId).emit('debate:message', { ...msg, side: isA ? 'A' : 'B' });

      if (wasFiltered) {
        const autoFlag = { reporterId: socket.userId, reason: 'Auto-censorship triggered', category: 'Profanity Bypass', status: 'pending' };
        room.session.flags.push(autoFlag);
      }

      advanceTurn(io, roomId);
    });

    socket.on('debate:forfeit', ({ roomId }) => endDebate(io, roomId, socket.userId, 'forfeit'));

    socket.on('debate:flag', async ({ roomId, reason, category }) => {
      const room = activeRooms.get(roomId);
      if (!room) return;
      room.session.flags.push({ reporterId: socket.userId, reason, category, status: 'pending' });
      await room.session.save();
      socket.emit('flag:confirmed', { message: 'Report submitted successfully' });
    });

    // ─── WebRTC SIGNALING ─────────────────────────────────────────
    socket.on('webrtc:offer', ({ roomId, offer }) => {
      socket.to(roomId).emit('webrtc:offer', { offer, from: socket.id });
    });
    socket.on('webrtc:answer', ({ roomId, answer }) => {
      socket.to(roomId).emit('webrtc:answer', { answer, from: socket.id });
    });
    socket.on('webrtc:ice_candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('webrtc:ice_candidate', { candidate, from: socket.id });
    });
    socket.on('webrtc:ready', ({ roomId }) => {
      socket.to(roomId).emit('webrtc:peer_ready', { from: socket.id });
    });

    // ─── DISCONNECT ────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[SOCKET] Disconnected: ${user.username}`);
      matchmakingService.removeFromQueue(socket.userId);

      if (socket.currentRoom) {
        const room = activeRooms.get(socket.currentRoom);
        if (room && room.started && room.session.status === 'active') {
          io.to(socket.currentRoom).emit('debate:opponent_disconnected', { timeout: 60 });
          const isA = room.userA.userId === socket.userId;
          room[isA ? 'connectedA' : 'connectedB'] = false;
          room.disconnectTimer = setTimeout(() => {
            if (!room[isA ? 'connectedA' : 'connectedB']) {
              endDebate(io, socket.currentRoom, null, isA ? 'disconnect_A' : 'disconnect_B');
            }
          }, 60000);
        }
      }
    });

    socket.on('debate:reconnect', ({ roomId }) => {
      const room = activeRooms.get(roomId);
      if (!room) return;
      const isA = room.userA.userId === socket.userId;
      if (room.disconnectTimer) clearTimeout(room.disconnectTimer);
      room[isA ? 'connectedA' : 'connectedB'] = true;
      room[isA ? 'socketA' : 'socketB'] = socket.id;
      socket.join(roomId);
      socket.currentRoom = roomId;
      io.to(roomId).emit('debate:opponent_reconnected');
    });
  });

  async function createRoom(io, match) {
    const { roomId, userA, userB } = match;
    const [dbA, dbB] = await Promise.all([User.findById(userA.userId), User.findById(userB.userId)]);
    const aliasA = dbA.mode === 'ghost' ? dbA.ghostAlias : dbA.username;
    const aliasB = dbB.mode === 'ghost' ? dbB.ghostAlias : dbB.username;

    const session = new DebateSession({
      roomId, topic: userA.topic, mode: userA.mode, status: 'waiting',
      userA: dbA._id, userB: dbB._id,
      userAAliasInSession: aliasA, userBAliasInSession: aliasB,
      userAMode: dbA.mode, userBMode: dbB.mode
    });
    await session.save();

    activeRooms.set(roomId, {
      roomId, session,
      userA: { userId: userA.userId, socketId: userA.socketId, alias: aliasA },
      userB: { userId: userB.userId, socketId: userB.socketId, alias: aliasB },
      connectedA: false, connectedB: false, started: false,
      socketA: null, socketB: null
    });

    const socketA = io.sockets.sockets.get(userA.socketId);
    const socketB = io.sockets.sockets.get(userB.socketId);

    if (socketA) socketA.emit('match:found', { roomId, topic: userA.topic, mode: userA.mode, opponentAlias: aliasB, side: 'A' });
    if (socketB) socketB.emit('match:found', { roomId, topic: userA.topic, mode: userA.mode, opponentAlias: aliasA, side: 'B' });
  }

  function startDebate(io, roomId) {
    const room = activeRooms.get(roomId);
    room.session.status = 'active';
    room.session.startTime = new Date();
    room.session.currentTurn = 'A';
    room.session.save();

    io.to(roomId).emit('debate:started', {
      topic: room.session.topic, mode: room.session.mode,
      aliasA: room.session.userAAliasInSession, aliasB: room.session.userBAliasInSession,
      firstTurn: 'A', turnDuration: room.session.turnDuration, maxRounds: room.session.maxRounds
    });

    startTurnTimer(io, roomId);
  }

  function startTurnTimer(io, roomId) {
    const room = activeRooms.get(roomId);
    if (!room) return;
    if (room.turnTimer) clearInterval(room.turnTimer);

    let remaining = room.session.turnDuration;
    room.turnTimer = setInterval(() => {
      remaining--;
      io.to(roomId).emit('debate:timer', { remaining, turn: room.session.currentTurn });
      if (remaining <= 0) advanceTurn(io, roomId, true);
    }, 1000);
  }

  function advanceTurn(io, roomId, timeout = false) {
    const room = activeRooms.get(roomId);
    if (!room) return;
    if (room.turnTimer) clearInterval(room.turnTimer);

    const prevTurn = room.session.currentTurn;
    if (prevTurn === 'B') {
      room.session.currentRound++;
      if (room.session.currentRound > room.session.maxRounds) {
        endDebate(io, roomId, null, 'rounds_complete');
        return;
      }
    }
    room.session.currentTurn = prevTurn === 'A' ? 'B' : 'A';
    room.session.save();
    io.to(roomId).emit('debate:turn_change', { turn: room.session.currentTurn, round: room.session.currentRound, timedOut: timeout });
    startTurnTimer(io, roomId);
  }

  async function endDebate(io, roomId, forfeiterUserId, reason) {
    const room = activeRooms.get(roomId);
    if (!room) return;
    if (room.turnTimer) clearInterval(room.turnTimer);

    const session = room.session;
    session.status = 'ended';
    session.endTime = new Date();

    const dbA = await User.findById(room.userA.userId);
    const dbB = await User.findById(room.userB.userId);

    let winner = null, eloChangeA = 0, eloChangeB = 0;

    if (reason === 'forfeit' || reason === 'disconnect_A') {
      winner = 'B';
    } else if (reason === 'disconnect_B') {
      winner = 'A';
    } else {
      const transcriptA = session.transcript.filter(m => m.userId.toString() === room.userA.userId.toString());
      const transcriptB = session.transcript.filter(m => m.userId.toString() === room.userB.userId.toString());

      if (transcriptA.length > 0 || transcriptB.length > 0) {
        const report = nlpService.analyzeDebate(transcriptA, transcriptB);
        session.aiReport = report;
        winner = report.winner;
      } else {
        winner = 'draw';
      }
    }

    session.winner = winner;

    if (winner === 'A') {
      const { winnerChange, loserChange } = nlpService.calculateEloChange(dbA.eloRating, dbB.eloRating);
      eloChangeA = winnerChange; eloChangeB = loserChange;
      dbA.wins++; dbB.losses++;
    } else if (winner === 'B') {
      const { winnerChange, loserChange } = nlpService.calculateEloChange(dbB.eloRating, dbA.eloRating);
      eloChangeB = winnerChange; eloChangeA = loserChange;
      dbB.wins++; dbA.losses++;
    } else {
      dbA.draws++; dbB.draws++;
    }

    session.eloChangeA = eloChangeA;
    session.eloChangeB = eloChangeB;

    dbA.eloRating = Math.max(100, dbA.eloRating + eloChangeA);
    dbB.eloRating = Math.max(100, dbB.eloRating + eloChangeB);
    dbA.totalDebates++; dbB.totalDebates++;
    dbA.debateHistory.push(session._id);
    dbB.debateHistory.push(session._id);

    if (session.aiReport) {
      dbA.avgVocabScore = Math.round((dbA.avgVocabScore * (dbA.totalDebates - 1) + session.aiReport.vocabScoreA) / dbA.totalDebates);
      dbB.avgVocabScore = Math.round((dbB.avgVocabScore * (dbB.totalDebates - 1) + session.aiReport.vocabScoreB) / dbB.totalDebates);
    }

    await Promise.all([session.save(), dbA.save(), dbB.save()]);

    io.to(roomId).emit('debate:ended', {
      winner, reason, roomId,
      eloChangeA, eloChangeB,
      newEloA: dbA.eloRating, newEloB: dbB.eloRating,
      report: session.aiReport,
      aliasA: session.userAAliasInSession, aliasB: session.userBAliasInSession
    });

    activeRooms.delete(roomId);
    console.log(`[ROOM] Ended ${roomId} — winner: ${winner} — reason: ${reason}`);
  }
};