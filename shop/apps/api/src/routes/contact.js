// FILE: apps/api/src/routes/contact.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const ContactSubmission = require('../models/ContactSubmission');

// Rate limiting for contact form - prevent spam
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 submissions per hour per IP
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many contact submissions. Please try again later.',
    },
  },
});

// POST /contact/submit - Public endpoint for contact form submissions
router.post('/submit', contactLimiter, async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'All fields are required',
        },
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Please provide a valid email address',
        },
      });
    }

    // Create contact submission
    const submission = await ContactSubmission.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      message: 'Your message has been received. We will get back to you soon!',
      data: {
        id: submission._id,
        name: submission.name,
        email: submission.email,
        subject: submission.subject,
        createdAt: submission.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
