const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  track: { type: String, enum: ['design', 'data-entry', 'coding'], required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  durationMinutes: { type: Number, default: 10 },
  approved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lesson', lessonSchema);