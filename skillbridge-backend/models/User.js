const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
  completed: { type: Boolean, default: false },
  completedAt: Date
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  track: { type: String, enum: ['design', 'data-entry', 'coding'] }, // assigned after quiz
  progress: [progressSchema],
  certificates: [{
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
    certificateUrl: String // URL to QR code certificate
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);