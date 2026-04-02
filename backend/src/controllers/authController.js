const User = require('../models/User');
const jwt = require('jsonwebtoken');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ success: false, message: 'All fields are required' });
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists)
      return res.status(409).json({ success: false, message: 'Email or username already taken' });
    const user = await User.create({ username, email, password });
    const token = signToken(user._id);
    res.status(201).json({ success: true, token, user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (user.isBanned)
      return res.status(403).json({ success: false, message: 'Account suspended' });
    const token = signToken(user._id);
    res.json({ success: true, token, user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user.toPublicJSON() });
};

exports.updateMode = async (req, res) => {
  try {
    const { mode } = req.body;
    if (!['ghost', 'public'].includes(mode))
      return res.status(400).json({ success: false, message: 'Invalid mode' });
    if (mode === 'public' && req.user.totalDebates < 1)
      return res.status(400).json({ success: false, message: 'Complete at least one debate before switching to Public Mode' });
    req.user.mode = mode;
    await req.user.save();
    res.json({ success: true, user: req.user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -email');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.mode === 'ghost') {
      return res.json({ success: true, user: { _id: user._id, ghostAlias: user.ghostAlias, eloRating: user.eloRating, mode: 'ghost' } });
    }
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};