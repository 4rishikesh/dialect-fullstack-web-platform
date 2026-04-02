const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  alias: String,
  content: String,
  filtered: Boolean,
  timestamp: { type: Date, default: Date.now },
  round: Number
});

const debateSessionSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  topic: { type: String, required: true },
  mode: { type: String, enum: ['text', 'voice', 'video'], default: 'text' },
  status: { type: String, enum: ['waiting', 'active', 'ended', 'abandoned'], default: 'waiting' },
  userA: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userB: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userAAliasInSession: String,
  userBAliasInSession: String,
  userAMode: { type: String, enum: ['ghost', 'public'] },
  userBMode: { type: String, enum: ['ghost', 'public'] },
  currentTurn: { type: String, enum: ['A', 'B'], default: 'A' },
  currentRound: { type: Number, default: 1 },
  maxRounds: { type: Number, default: 5 },
  turnDuration: { type: Number, default: 120 },
  transcript: [messageSchema],
  winner: { type: String, enum: ['A', 'B', 'draw', null], default: null },
  eloChangeA: Number,
  eloChangeB: Number,
  aiReport: {
    lexicalDiversityA: Number,
    lexicalDiversityB: Number,
    sentimentA: String,
    sentimentB: String,
    vocabScoreA: Number,
    vocabScoreB: Number,
    weakWordsA: [String],
    weakWordsB: [String],
    suggestionsA: [String],
    suggestionsB: [String],
    summaryA: String,
    summaryB: String
  },
  flags: [{
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    category: String,
    timestamp: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' }
  }],
  startTime: Date,
  endTime: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DebateSession', debateSessionSchema);