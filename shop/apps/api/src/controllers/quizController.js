// FILE: apps/api/src/controllers/quizController.js
const QuizQuestion = require('../models/QuizQuestion');
const QuizAttempt = require('../models/QuizAttempt');
const LoyaltyPoints = require('../models/LoyaltyPoints');
const AppError = require('../utils/AppError');
const asyncHandler = require('../middleware/asyncHandler');

// GET /api/gamification/quiz/daily - Auth: Get today's quiz questions
exports.getDailyQuiz = asyncHandler(async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Get IDs of questions the user already answered today
  const answeredToday = await QuizAttempt.find({
    user: req.user._id,
    attemptedAt: { $gte: startOfDay },
  }).distinct('question');

  // Get 5 random active questions not already answered today
  const questions = await QuizQuestion.aggregate([
    {
      $match: {
        isActive: true,
        _id: { $nin: answeredToday },
      },
    },
    { $sample: { size: 5 } },
    {
      $project: {
        question: 1,
        options: 1,
        points: 1,
        category: 1,
        // DO NOT include correctAnswer
      },
    },
  ]);

  res.json({ success: true, data: questions });
});

// POST /api/gamification/quiz/answer - Auth: Submit answer
exports.submitAnswer = asyncHandler(async (req, res) => {
  const { questionId, selectedAnswer } = req.body;

  if (!questionId || selectedAnswer === undefined) {
    throw AppError.badRequest('questionId and selectedAnswer are required');
  }

  if (selectedAnswer < 0 || selectedAnswer > 3) {
    throw AppError.badRequest('selectedAnswer must be between 0 and 3');
  }

  const question = await QuizQuestion.findById(questionId);
  if (!question) {
    throw AppError.notFound('Question');
  }

  // Check if user already answered this question today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const alreadyAnswered = await QuizAttempt.findOne({
    user: req.user._id,
    question: questionId,
    attemptedAt: { $gte: startOfDay },
  });

  if (alreadyAnswered) {
    throw AppError.badRequest('You already answered this question today', 'ALREADY_ANSWERED');
  }

  const isCorrect = selectedAnswer === question.correctAnswer;
  let pointsEarned = 0;

  // Award points for correct answer
  if (isCorrect) {
    pointsEarned = question.points;

    let loyaltyRecord = await LoyaltyPoints.findOne({ user: req.user._id });
    if (!loyaltyRecord) {
      loyaltyRecord = await LoyaltyPoints.create({ user: req.user._id });
    }
    loyaltyRecord.totalPoints += pointsEarned;
    loyaltyRecord.availablePoints += pointsEarned;
    loyaltyRecord.lifetimePoints += pointsEarned;
    loyaltyRecord.calculateTier();
    await loyaltyRecord.save();
  }

  // Save attempt
  await QuizAttempt.create({
    user: req.user._id,
    question: questionId,
    selectedAnswer,
    isCorrect,
    pointsEarned,
  });

  res.json({
    success: true,
    data: {
      isCorrect,
      correctAnswer: question.correctAnswer,
      pointsEarned,
    },
  });
});

// GET /api/gamification/quiz/history - Auth: User's quiz history
exports.getHistory = asyncHandler(async (req, res) => {
  const attempts = await QuizAttempt.find({ user: req.user._id })
    .populate('question', 'question options category')
    .sort({ attemptedAt: -1 })
    .limit(50)
    .lean();

  // Calculate stats
  const totalAttempts = await QuizAttempt.countDocuments({ user: req.user._id });
  const correctCount = await QuizAttempt.countDocuments({ user: req.user._id, isCorrect: true });

  const pipeline = await QuizAttempt.aggregate([
    { $match: { user: req.user._id } },
    { $group: { _id: null, totalPoints: { $sum: '$pointsEarned' } } },
  ]);

  const totalPoints = pipeline[0]?.totalPoints || 0;

  res.json({
    success: true,
    data: {
      attempts,
      stats: {
        totalAttempts,
        correctCount,
        totalPoints,
        accuracy: totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0,
      },
    },
  });
});

// POST /api/gamification/quiz/questions - Admin: Create question
exports.createQuestion = asyncHandler(async (req, res) => {
  const { question, options, correctAnswer, points, category, isActive } = req.body;

  if (!question || !options || correctAnswer === undefined) {
    throw AppError.badRequest('question, options, and correctAnswer are required');
  }

  if (!Array.isArray(options) || options.length !== 4) {
    throw AppError.badRequest('Exactly 4 options are required');
  }

  const quizQuestion = await QuizQuestion.create({
    question,
    options,
    correctAnswer,
    points: points || 10,
    category: category || 'general',
    isActive: isActive !== undefined ? isActive : true,
  });

  res.status(201).json({ success: true, data: quizQuestion });
});

// PUT /api/gamification/quiz/questions/:id - Admin: Update question
exports.updateQuestion = asyncHandler(async (req, res) => {
  const quizQuestion = await QuizQuestion.findById(req.params.id);
  if (!quizQuestion) {
    throw AppError.notFound('Question');
  }

  const allowedFields = ['question', 'options', 'correctAnswer', 'points', 'category', 'isActive'];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      quizQuestion[field] = req.body[field];
    }
  });

  await quizQuestion.save();
  res.json({ success: true, data: quizQuestion });
});

// DELETE /api/gamification/quiz/questions/:id - Admin: Delete question
exports.deleteQuestion = asyncHandler(async (req, res) => {
  const question = await QuizQuestion.findByIdAndDelete(req.params.id);
  if (!question) {
    throw AppError.notFound('Question');
  }
  res.json({ success: true, data: { message: 'Question deleted successfully' } });
});

// GET /api/gamification/quiz/questions - Admin: Get all questions
exports.getAllQuestions = asyncHandler(async (req, res) => {
  const questions = await QuizQuestion.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: questions });
});
