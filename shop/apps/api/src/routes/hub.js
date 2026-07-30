// FILE: apps/api/src/routes/hub.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { publicReadLimiter, catalogTrackingLimiter } = require('../middleware/rateLimiter');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');
const ctrl = require('../controllers/hubController');

// ── Public routes ─────────────────────────────────────────────────────────────

// GET /api/hub  — hub page content (cached 5 min)
router.get('/', publicReadLimiter, cacheMiddleware(300), ctrl.getHubPage);

// POST /api/hub/analytics  — click tracking (fire-and-forget)
router.post('/analytics', catalogTrackingLimiter, ctrl.trackClick);

// ── Admin routes ──────────────────────────────────────────────────────────────

router.use('/admin', authenticate, authorize(['admin']));

// Full hub doc
router.get('/admin', ctrl.getHubAdmin);

// Update a single section
router.put('/admin/section/:section', invalidateCache('cache:/hub*'), ctrl.updateSection);

// Draft workflow
router.post('/admin/draft',   ctrl.saveDraft);
router.post('/admin/publish', invalidateCache('cache:/hub*'), ctrl.publishHub);
router.post('/admin/discard', ctrl.discardDraft);

// Version history
router.get('/admin/versions',                    ctrl.getVersions);
router.get('/admin/versions/:index',             ctrl.getVersionDetail);
router.post('/admin/versions/:index/restore',    invalidateCache('cache:/hub*'), ctrl.restoreVersion);

// Analytics
router.get('/admin/analytics',        ctrl.getAnalytics);
router.get('/admin/analytics/export', ctrl.exportAnalytics);

module.exports = router;
