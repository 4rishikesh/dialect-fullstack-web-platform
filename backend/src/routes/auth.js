const express = require('express');
const router = express.Router();
const { register, login, getMe, updateMode, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.patch('/mode', protect, updateMode);
router.get('/profile/:id', protect, getProfile);

module.exports = router;