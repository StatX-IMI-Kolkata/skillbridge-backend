const express = require('express');
const router = express.Router();
const Lesson = require('../models/Lesson');

// Get lessons by track (public, only approved)
router.get('/:track', async (req, res) => {
  try {
    const track = req.params.track;
    if (!['design', 'data-entry', 'coding'].includes(track)) return res.status(400).json({ message: 'Invalid track' });

    const lessons = await Lesson.find({ track, approved: true }).sort({ createdAt: 1 });
    return res.json({ lessons });
  } catch(e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;