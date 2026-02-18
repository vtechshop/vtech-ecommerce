// FILE: apps/api/src/models/QuizQuestion.js
const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        return v.length === 4;
      },
      message: 'Exactly 4 options are required',
    },
  },
  correctAnswer: {
    type: Number,
    required: [true, 'Correct answer index is required'],
    min: 0,
    max: 3,
  },
  points: {
    type: Number,
    default: 10,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  category: {
    type: String,
    enum: ['general', 'tech', 'shopping', 'science'],
    default: 'general',
  },
}, { timestamps: true });

// Indexes
quizQuestionSchema.index({ isActive: 1, category: 1 });

module.exports = mongoose.model('QuizQuestion', quizQuestionSchema);
