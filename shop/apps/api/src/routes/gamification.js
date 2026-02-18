// FILE: apps/api/src/routes/gamification.js
const express = require('express');
const router = express.Router();
const spinController = require('../controllers/spinController');
const quizController = require('../controllers/quizController');
const { authenticate, authorize } = require('../middleware/auth');

// ---- SPIN WHEEL ----
// Auth required
router.get('/spin/config', authenticate, spinController.getConfig);
router.post('/spin', authenticate, spinController.spin);
router.get('/spin/history', authenticate, spinController.getHistory);

// Admin only
router.get('/spin/config/admin', authenticate, authorize(['admin']), spinController.getAdminConfig);
router.put('/spin/config', authenticate, authorize(['admin']), spinController.updateConfig);

// ---- QUIZ ----
// Auth required
router.get('/quiz/daily', authenticate, quizController.getDailyQuiz);
router.post('/quiz/answer', authenticate, quizController.submitAnswer);
router.get('/quiz/history', authenticate, quizController.getHistory);

// Admin only
router.get('/quiz/questions', authenticate, authorize(['admin']), quizController.getAllQuestions);
router.post('/quiz/questions', authenticate, authorize(['admin']), quizController.createQuestion);
router.put('/quiz/questions/:id', authenticate, authorize(['admin']), quizController.updateQuestion);
router.delete('/quiz/questions/:id', authenticate, authorize(['admin']), quizController.deleteQuestion);

module.exports = router;
