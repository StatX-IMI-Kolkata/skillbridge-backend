const express = require('express');
const router = express.Router();
const Lesson = require('../models/Lesson');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const QRCode = require('qrcode');

// Middleware stack
router.use(auth);
router.use(adminAuth);

// Get all lessons for admin (all approval statuses)
router.get('/lessons', async (req, res) => {
  try {
    const lessons = await Lesson.find().sort({ createdAt: -1 });
    return res.json({ lessons });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Upload new lesson
router.post('/lessons', async (req, res) => {
  try {
    const { track, title, content, durationMinutes } = req.body;
    if (!track || !title || !content) return res.status(400).json({ message: 'Track, title and content are required' });

    if(!['design', 'data-entry', 'coding'].includes(track))
      return res.status(400).json({ message: 'Invalid track' });

    const lesson = new Lesson({ track, title, content, durationMinutes: durationMinutes || 10, approved: false });

    await lesson.save();
    return res.json({ message: 'Lesson uploaded, awaiting approval', lesson });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Approve or reject lesson
router.patch('/lessons/:id/approve', async (req, res) => {
  try {
    const lessonId = req.params.id;
    const { approved } = req.body;
    if (typeof approved !== 'boolean') return res.status(400).json({ message: 'Approved flag required' });

    const lesson = await Lesson.findById(lessonId);
    if(!lesson) return res.status(404).json({ message: 'Lesson not found' });

    lesson.approved = approved;
    await lesson.save();

    return res.json({ message: `Lesson ${approved ? 'approved' : 'rejected'}` });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get users (for admin view)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    return res.json({ users });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;