// FILE: apps/api/src/routes/hub.js
const express = require('express');
const router  = express.Router();
const path    = require('path');
const multer  = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const { publicReadLimiter, catalogTrackingLimiter, uploadLimiter } = require('../middleware/rateLimiter');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');
const ctrl = require('../controllers/hubController');

// ── Hero-media multer  (images + videos; reuses memoryStorage like uploadService) ──
const heroMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB — generous for hero videos
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const ALLOWED = {
      'image/jpeg':  ['.jpg', '.jpeg'],
      'image/png':   ['.png'],
      'image/webp':  ['.webp'],
      'image/gif':   ['.gif'],
      'image/avif':  ['.avif'],
      'video/mp4':   ['.mp4'],
      'video/webm':  ['.webm'],
    };
    const validExts = ALLOWED[file.mimetype];
    if (validExts && validExts.includes(ext)) return cb(null, true);
    cb(new Error('Only images (JPG, PNG, WebP, GIF, AVIF) and videos (MP4, WebM) are allowed.'));
  },
}).single('file');

function heroMediaMiddleware(req, res, next) {
  heroMediaUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, error: { code: 'UPLOAD_ERROR', message: err.message } });
    }
    if (err) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_FILE', message: err.message } });
    }
    next();
  });
}

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
router.put('/admin/section/:section', invalidateCache('cache:/api/hub*'), ctrl.updateSection);

// Draft workflow
router.post('/admin/draft',   ctrl.saveDraft);
router.post('/admin/publish', invalidateCache('cache:/api/hub*'), ctrl.publishHub);
router.post('/admin/discard', ctrl.discardDraft);

// Version history
router.get('/admin/versions',                    ctrl.getVersions);
router.get('/admin/versions/:index',             ctrl.getVersionDetail);
router.post('/admin/versions/:index/restore',    invalidateCache('cache:/api/hub*'), ctrl.restoreVersion);

// Analytics
router.get('/admin/analytics',        ctrl.getAnalytics);
router.get('/admin/analytics/export', ctrl.exportAnalytics);

// Hero media upload/delete
router.post('/admin/hero/media',         uploadLimiter, heroMediaMiddleware, invalidateCache('cache:/api/hub*'), ctrl.uploadHeroMedia);
router.delete('/admin/hero/media/:field', invalidateCache('cache:/api/hub*'), ctrl.deleteHeroMedia);

module.exports = router;
