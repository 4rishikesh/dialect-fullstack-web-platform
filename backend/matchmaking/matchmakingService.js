const { v4: uuidv4 } = require('uuid');

// In-memory matchmaking queue: { userId, eloRating, topic, mode, socketId, joinedAt, tolerance }
const queue = new Map();

exports.addToQueue = function (userId, eloRating, topic, mode, socketId) {
  queue.set(userId, { userId, eloRating, topic, mode, socketId, joinedAt: Date.now(), tolerance: 150 });
};

exports.removeFromQueue = function (userId) {
  queue.delete(userId);
};

exports.findMatch = function (userId) {
  const seeker = queue.get(userId);
  if (!seeker) return null;

  for (const [candidateId, candidate] of queue) {
    if (candidateId === userId) continue;
    if (candidate.mode !== seeker.mode) continue;
    const eloDiff = Math.abs(seeker.eloRating - candidate.eloRating);
    const tolerance = Math.max(seeker.tolerance, candidate.tolerance);
    if (eloDiff <= tolerance) {
      const roomId = uuidv4();
      queue.delete(userId);
      queue.delete(candidateId);
      return { roomId, userA: seeker, userB: candidate };
    }
  }
  return null;
};

exports.expandTolerance = function (userId) {
  const entry = queue.get(userId);
  if (entry) {
    entry.tolerance = Math.min(entry.tolerance + 50, 400);
    queue.set(userId, entry);
  }
};

exports.getQueueSize = function () {
  return queue.size;
};

exports.isInQueue = function (userId) {
  return queue.has(userId);
};