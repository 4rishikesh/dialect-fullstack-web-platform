const express = require('express');
const router = express.Router();
const User = require('../models/User');
const DebateSession = require('../models/DebateSession');
const { protect, adminOnly } = require('../middleware/auth');

// Get leaderboard (public mode users only)
router.get('/', protect, async (req, res) => {
  try {
    const users = await User.find({ mode: 'public', isBanned: false })
      .select('username eloRating wins losses draws totalDebates avgVocabScore')
      .sort({ eloRating: -1 })
      .limit(100);
    res.json({ success: true, leaderboard: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: get all flagged sessions
router.get('/admin/flags', protect, adminOnly, async (req, res) => {
  try {
    const sessions = await DebateSession.find({ 'flags.0': { $exists: true } })
      .populate('userA', 'username').populate('userB', 'username')
      .select('roomId topic flags userA userB createdAt');
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: ban a user
router.post('/admin/ban/:userId', protect, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isBanned = true;
    user.banReason = reason || 'Violated community guidelines';
    await user.save();
    res.json({ success: true, message: `User ${user.username} banned` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;