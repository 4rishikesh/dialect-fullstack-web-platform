const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const DebateSession = require('../models/DebateSession');
const User = require('../models/User');

// Get debate session by roomId
router.get('/session/:roomId', protect, async (req, res) => {
  try {
    const session = await DebateSession.findOne({ roomId: req.params.roomId })
      .populate('userA', 'username ghostAlias mode eloRating')
      .populate('userB', 'username ghostAlias mode eloRating');
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    const isParticipant = session.userA?._id.toString() === req.user._id.toString() ||
                          session.userB?._id.toString() === req.user._id.toString();
    if (!isParticipant) return res.status(403).json({ success: false, message: 'Not a participant' });
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get user's debate history
router.get('/history', protect, async (req, res) => {
  try {
    const sessions = await DebateSession.find({
      $or: [{ userA: req.user._id }, { userB: req.user._id }],
      status: 'ended'
    }).sort({ endTime: -1 }).limit(20).select('roomId topic mode winner endTime eloChangeA eloChangeB userAAliasInSession userBAliasInSession');
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get AI report for a session
router.get('/report/:roomId', protect, async (req, res) => {
  try {
    const session = await DebateSession.findOne({ roomId: req.params.roomId });
    if (!session) return res.status(404).json({ success: false, message: 'Not found' });
    const isA = session.userA?.toString() === req.user._id.toString();
    const isB = session.userB?.toString() === req.user._id.toString();
    if (!isA && !isB) return res.status(403).json({ success: false, message: 'Not authorized' });
    res.json({ success: true, report: session.aiReport, side: isA ? 'A' : 'B', session: { topic: session.topic, mode: session.mode, winner: session.winner, eloChangeA: session.eloChangeA, eloChangeB: session.eloChangeB } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;