const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Lesson = require('../models/Lesson');
const { auth } = require('../middleware/auth');
const QRCode = require('qrcode');

// Utility: assign track based on quiz answers
function assignTrack(answers) {
  // answers = array of objects { questionId, answer }
  // Basic logic - here, suppose answers have a "interest" string: 'design', 'data-entry', 'coding'
  // Count interest frequency and pick max
  const count = { design: 0, 'data-entry': 0, coding: 0 };
  answers.forEach(a => {
    if (count[a.answer] !== undefined) count[a.answer]++;
  });
  let maxTrack = 'design';
  let maxVal = 0;
  for (const key in count) {
    if (count[key] > maxVal) {
      maxVal = count[key];
      maxTrack = key;
    }
  }
  return maxTrack;
}

// Registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({ name, email, passwordHash });
    await user.save();

    return res.json({ message: 'User registered' });
  } catch (e) {
    return res.status(500).json({ message: 'Server error', error: e.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try{
    const { email, password } = req.body;
    if(!email || !password) return res.status(400).json({message: 'Email and password required'});

    const user = await User.findOne({ email });
    if(!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if(!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {expiresIn: '7d'});

    return res.json({ 
      token, 
      user: { id: user._id, name: user.name, email: user.email, role: user.role, track: user.track }
    });
  }catch(e){
    return res.status(500).json({ message: 'Server error' });
  }
});

// Submit quiz answers and assign track
router.post('/quiz', auth, async (req, res) => {
  try {
    const { answers } = req.body; // expect array [{questionId, answer}]
    if (!answers || !answers.length) return res.status(400).json({ message: 'Answers required' });

    const track = assignTrack(answers);

    req.user.track = track;
    await req.user.save();

    return res.json({ message: 'Track assigned', track });
  } catch(e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get dashboard data: lessons for user's track + progress
router.get('/dashboard', auth, async (req, res) => {
  try {
    if (!req.user.track) return res.status(400).json({ message: 'User track not assigned yet' });

    const lessons = await Lesson.find({ track: req.user.track, approved: true }).sort({ createdAt: 1 });
    const progress = req.user.progress;

    const lessonsWithProgress = lessons.map(lesson => {
      const prog = progress.find(p => p.lessonId.toString() === lesson._id.toString());
      return {
        _id: lesson._id,
        title: lesson.title,
        content: lesson.content,
        durationMinutes: lesson.durationMinutes,
        completed: prog ? prog.completed : false
      };
    });

    const completedCount = lessonsWithProgress.filter(l => l.completed).length;
    const percentage = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;

    return res.json({ lessons: lessonsWithProgress, progressPercentage: percentage });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Mark lesson as completed and generate certificate QR-code if last lesson
router.post('/lesson/:id/complete', auth, async (req, res) => {
  try {
    const lessonId = req.params.id;
    // Check if lesson belongs to user's track and is approved
    const lesson = await Lesson.findOne({ _id: lessonId, track: req.user.track, approved: true });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    // Update user's progress
    const progIndex = req.user.progress.findIndex(p => p.lessonId.toString() === lessonId);
    if(progIndex === -1) {
      req.user.progress.push({ lessonId, completed: true, completedAt: new Date() });
    } else {
      req.user.progress[progIndex].completed = true;
      req.user.progress[progIndex].completedAt = new Date();
    }
    await req.user.save();

    // Check if all lessons completed
    const lessons = await Lesson.find({ track: req.user.track, approved: true });
    const completedLessonsCount = req.user.progress.filter(p => p.completed && lessons.find(l => l._id.toString() === p.lessonId.toString())).length;
    const allCompleted = (lessons.length === completedLessonsCount);

    let certificateUrl = null;
    if (allCompleted) {
      // Generate QR code containing certificate info URL or text
      // For demo, we create a simple QR with user+track+date data

      const certData = `Certificate: ${req.user.name}, Track: ${req.user.track}, Date: ${new Date().toLocaleDateString()}`;
      certificateUrl = await QRCode.toDataURL(certData);

      // Save certificate QR to user
      req.user.certificates.push({
        lessonId: null, // overall certification
        certificateUrl
      });
      await req.user.save();
    }

    return res.json({ message: 'Lesson marked complete', certificateUrl, allCompleted });
  } catch(e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get user's certificates
router.get('/certificates', auth, async (req, res) => {
  try {
    return res.json({ certificates: req.user.certificates });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;