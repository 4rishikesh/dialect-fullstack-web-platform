const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  eloRating: { type: Number, default: 1000 },
  mode: { type: String, enum: ['ghost', 'public'], default: 'ghost' },
  ghostAlias: { type: String, default: '' },
  avatar: { type: String, default: '' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: '' },
  totalDebates: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  avgVocabScore: { type: Number, default: 0 },
  debateHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DebateSession' }],
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.ghostAlias) {
    this.ghostAlias = `Debater_${Math.floor(1000 + Math.random() * 9000)}`;
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    eloRating: this.eloRating,
    mode: this.mode,
    ghostAlias: this.ghostAlias,
    role: this.role,
    totalDebates: this.totalDebates,
    wins: this.wins,
    losses: this.losses,
    draws: this.draws,
    avgVocabScore: this.avgVocabScore,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);