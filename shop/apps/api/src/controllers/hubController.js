// FILE: apps/api/src/controllers/hubController.js
const HubPage = require('../models/HubPage');
const HubAnalytics = require('../models/HubAnalytics');
const uploadService = require('../services/uploadService');

// ── Helpers ──────────────────────────────────────────────────────────────────

function detectDevice(ua = '') {
  const s = ua.toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(s)) return 'tablet';
  if (/mobile|android|iphone|ipod|windows phone/.test(s)) return 'mobile';
  if (s) return 'desktop';
  return 'unknown';
}

function parseReferrer(req) {
  const ref = (req.headers.referer || req.headers.referrer || '').toLowerCase();
  if (!ref) return 'direct';
  if (ref.includes('instagram')) return 'instagram';
  if (ref.includes('facebook') || ref.includes('fb.com')) return 'facebook';
  if (ref.includes('youtube')) return 'youtube';
  if (ref.includes('whatsapp')) return 'whatsapp';
  if (ref.includes('google')) return 'google';
  if (ref.includes('linkedin')) return 'linkedin';
  if (ref.includes('twitter') || ref.includes('t.co')) return 'twitter';
  return 'other';
}

function stripInternals(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj.draft;
  delete obj.versions;
  delete obj.__v;
  return obj;
}

function buildSectionSnapshot(doc) {
  return {
    hero: doc.hero,
    quickActions: doc.quickActions,
    featuredProducts: doc.featuredProducts,
    whyChooseUs: doc.whyChooseUs,
    stats: doc.stats,
    resources: doc.resources,
    services: doc.services,
    socials: doc.socials,
    contact: doc.contact,
    seo: doc.seo,
  };
}

// Keep at most 10 versions (pop oldest when at limit)
function pushVersion(doc, savedBy, note) {
  if (doc.versions.length >= 10) doc.versions.shift();
  doc.versions.push({ data: buildSectionSnapshot(doc), savedAt: new Date(), savedBy, note: note || '' });
}

// ── Public endpoints ──────────────────────────────────────────────────────────

// GET /api/hub  — what the /hub page fetches to render itself
exports.getHubPage = async (req, res) => {
  try {
    const doc = await HubPage.getSingleton();
    // preview=true returns draft if it exists (admin only — caller responsible for auth check)
    if (req.query.preview === 'true' && doc.hasDraft && doc.draft) {
      return res.json({ success: true, data: doc.draft, isPreview: true });
    }
    res.json({ success: true, data: stripInternals(doc) });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'HUB_FETCH_ERROR', message: err.message } });
  }
};

// POST /api/hub/analytics  — fire-and-forget click tracking from Hub.jsx
exports.trackClick = async (req, res) => {
  try {
    const { button, label, href, sessionId } = req.body;
    if (!button) return res.status(400).json({ success: false, error: { code: 'MISSING_BUTTON' } });

    await HubAnalytics.create({
      button,
      label:      label || '',
      href:       href  || '',
      deviceType: detectDevice(req.headers['user-agent']),
      referrer:   parseReferrer(req),
      sessionId:  sessionId || '',
    });
    res.status(204).end();
  } catch {
    res.status(204).end(); // silent fail — never block the user
  }
};

// ── Admin endpoints ───────────────────────────────────────────────────────────

// GET /api/hub/admin  — full document including draft status & versions list
exports.getHubAdmin = async (req, res) => {
  try {
    const doc = await HubPage.getSingleton();
    const obj = doc.toObject();
    // Return versions metadata only (no full data — keep response lean)
    obj.versionsMetadata = (doc.versions || []).map((v, i) => ({
      index: i,
      savedAt: v.savedAt,
      savedBy: v.savedBy,
      note: v.note,
    }));
    delete obj.versions;
    res.json({ success: true, data: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'HUB_ADMIN_FETCH_ERROR', message: err.message } });
  }
};

// PUT /api/hub/admin/section/:section  — update one section immediately (no draft)
exports.updateSection = async (req, res) => {
  const { section } = req.params;
  const ALLOWED = ['hero', 'quickActions', 'categoryLinks', 'featuredProducts', 'whyChooseUs', 'stats', 'resources', 'services', 'socials', 'contact', 'seo'];
  if (!ALLOWED.includes(section)) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_SECTION', message: `Unknown section: ${section}` } });
  }
  try {
    const doc = await HubPage.getSingleton();
    doc.set(section, req.body);
    doc.markModified(section);
    doc.updatedBy = req.user?._id;
    await doc.save();
    res.json({ success: true, data: doc[section] });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'HUB_SECTION_SAVE_ERROR', message: err.message } });
  }
};

// POST /api/hub/admin/draft  — save entire hub state as draft (doesn't publish)
exports.saveDraft = async (req, res) => {
  try {
    const doc = await HubPage.getSingleton();
    doc.draft = req.body;
    doc.hasDraft = true;
    doc.updatedBy = req.user?._id;
    await doc.save();
    res.json({ success: true, message: 'Draft saved.' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'HUB_DRAFT_SAVE_ERROR', message: err.message } });
  }
};

// POST /api/hub/admin/publish  — promote draft (or current body) to published
exports.publishHub = async (req, res) => {
  try {
    const doc = await HubPage.getSingleton();

    // Save a version of the current published state before overwriting
    pushVersion(doc, req.user?._id, req.body.note || 'Published');

    const source = doc.hasDraft && doc.draft ? doc.draft : req.body;

    const SECTION_KEYS = ['hero', 'quickActions', 'featuredProducts', 'whyChooseUs', 'stats', 'resources', 'services', 'socials', 'contact', 'seo'];
    for (const key of SECTION_KEYS) {
      if (source[key] !== undefined) {
        doc.set(key, source[key]);
        doc.markModified(key);
      }
    }

    doc.draft    = null;
    doc.hasDraft = false;
    doc.status   = 'published';
    doc.publishedAt = new Date();
    doc.updatedBy   = req.user?._id;

    await doc.save();
    res.json({ success: true, message: 'Hub page published.', publishedAt: doc.publishedAt });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'HUB_PUBLISH_ERROR', message: err.message } });
  }
};

// POST /api/hub/admin/discard  — discard draft, revert to published
exports.discardDraft = async (req, res) => {
  try {
    const doc = await HubPage.getSingleton();
    doc.draft    = null;
    doc.hasDraft = false;
    await doc.save();
    res.json({ success: true, message: 'Draft discarded.' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'HUB_DISCARD_ERROR', message: err.message } });
  }
};

// GET /api/hub/admin/versions  — list version history
exports.getVersions = async (req, res) => {
  try {
    const doc = await HubPage.getSingleton();
    const versions = (doc.versions || []).map((v, i) => ({
      index: i,
      savedAt: v.savedAt,
      savedBy: v.savedBy,
      note: v.note,
    })).reverse(); // newest first
    res.json({ success: true, data: versions });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'HUB_VERSIONS_ERROR', message: err.message } });
  }
};

// GET /api/hub/admin/versions/:index  — get full data of a specific version
exports.getVersionDetail = async (req, res) => {
  try {
    const doc = await HubPage.getSingleton();
    const index = parseInt(req.params.index, 10);
    const version = doc.versions[index];
    if (!version) return res.status(404).json({ success: false, error: { code: 'VERSION_NOT_FOUND' } });
    res.json({ success: true, data: version.data, meta: { savedAt: version.savedAt, note: version.note } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'HUB_VERSION_DETAIL_ERROR', message: err.message } });
  }
};

// POST /api/hub/admin/versions/:index/restore  — restore a version
exports.restoreVersion = async (req, res) => {
  try {
    const doc = await HubPage.getSingleton();
    const index = parseInt(req.params.index, 10);
    const version = doc.versions[index];
    if (!version) return res.status(404).json({ success: false, error: { code: 'VERSION_NOT_FOUND' } });

    // Save current state as a new version before restoring
    pushVersion(doc, req.user?._id, `Before restore from ${new Date(version.savedAt).toLocaleDateString()}`);

    const SECTION_KEYS = ['hero', 'quickActions', 'featuredProducts', 'whyChooseUs', 'stats', 'resources', 'services', 'socials', 'contact', 'seo'];
    for (const key of SECTION_KEYS) {
      if (version.data[key] !== undefined) doc.set(key, version.data[key]);
    }
    doc.status      = 'published';
    doc.publishedAt = new Date();
    doc.updatedBy   = req.user?._id;
    doc.hasDraft    = false;
    doc.draft       = null;

    await doc.save();
    res.json({ success: true, message: 'Version restored and published.' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'HUB_RESTORE_ERROR', message: err.message } });
  }
};

// ── Analytics ─────────────────────────────────────────────────────────────────

// GET /api/hub/admin/analytics  — aggregated dashboard data
exports.getAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay   = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek  = new Date(now); startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

    const [totalByButton, todayByButton, weekByButton, monthByButton, byDevice, byReferrer, recentClicks] = await Promise.all([
      HubAnalytics.aggregate([{ $group: { _id: '$button', count: { $sum: 1 }, label: { $last: '$label' } } }, { $sort: { count: -1 } }]),
      HubAnalytics.aggregate([{ $match: { timestamp: { $gte: startOfDay } } }, { $group: { _id: '$button', count: { $sum: 1 } } }]),
      HubAnalytics.aggregate([{ $match: { timestamp: { $gte: startOfWeek } } }, { $group: { _id: '$button', count: { $sum: 1 } } }]),
      HubAnalytics.aggregate([{ $match: { timestamp: { $gte: startOfMonth } } }, { $group: { _id: '$button', count: { $sum: 1 } } }]),
      HubAnalytics.aggregate([{ $group: { _id: '$deviceType', count: { $sum: 1 } } }]),
      HubAnalytics.aggregate([{ $group: { _id: '$referrer', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      HubAnalytics.find().sort({ timestamp: -1 }).limit(20).select('button label deviceType referrer timestamp'),
    ]);

    const totalCount = totalByButton.reduce((s, r) => s + r.count, 0);

    const toMap = arr => arr.reduce((m, r) => { m[r._id] = r.count; return m; }, {});
    const todayMap = toMap(todayByButton);
    const weekMap  = toMap(weekByButton);
    const monthMap = toMap(monthByButton);

    const buttons = totalByButton.map(r => ({
      button: r._id,
      label:  r.label || r._id,
      total:  r.count,
      today:  todayMap[r._id] || 0,
      week:   weekMap[r._id]  || 0,
      month:  monthMap[r._id] || 0,
      ctr:    totalCount > 0 ? ((r.count / totalCount) * 100).toFixed(1) : '0.0',
    }));

    res.json({
      success: true,
      data: {
        totalClicks: totalCount,
        todayClicks: todayByButton.reduce((s, r) => s + r.count, 0),
        weekClicks:  weekByButton.reduce((s, r) => s + r.count, 0),
        monthClicks: monthByButton.reduce((s, r) => s + r.count, 0),
        buttons,
        byDevice:   byDevice.map(r => ({ device: r._id, count: r.count })),
        byReferrer: byReferrer.map(r => ({ referrer: r._id, count: r.count })),
        recentClicks,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'HUB_ANALYTICS_ERROR', message: err.message } });
  }
};

// GET /api/hub/admin/analytics/export  — CSV download
exports.exportAnalytics = async (req, res) => {
  try {
    const rows = await HubAnalytics.find().sort({ timestamp: -1 }).limit(5000).lean();
    const header = 'Button,Label,Device,Referrer,Timestamp\n';
    const csv = header + rows.map(r =>
      `"${r.button}","${r.label}","${r.deviceType}","${r.referrer}","${new Date(r.timestamp).toISOString()}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="hub-analytics.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'HUB_EXPORT_ERROR', message: err.message } });
  }
};

// ── Hero Media ────────────────────────────────────────────────────────────────

const HERO_MEDIA_FIELDS = ['desktopImage', 'desktopVideo', 'desktopPoster', 'mobileImage', 'mobileVideo', 'mobilePoster'];

function parseHeroField(field) {
  // 'desktopImage' → ['desktop', 'image']
  const device = field.startsWith('desktop') ? 'desktop' : 'mobile';
  const type   = field.replace(/^desktop|^mobile/, '').toLowerCase(); // 'image' | 'video' | 'poster'
  return [device, type];
}

// POST /api/hub/admin/hero/media  — upload a hero media asset
exports.uploadHeroMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded.' } });
    }

    const { field } = req.body;
    if (!field || !HERO_MEDIA_FIELDS.includes(field)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_FIELD', message: `field must be one of: ${HERO_MEDIA_FIELDS.join(', ')}` } });
    }

    const isVideoField = field.toLowerCase().includes('video');
    const isVideoFile  = req.file.mimetype.startsWith('video/');
    const isPosterField = field.toLowerCase().includes('poster');

    // Semantic validation: video fields need video files; image/poster fields need image files
    if (isVideoField && !isVideoFile) {
      return res.status(400).json({ success: false, error: { code: 'WRONG_FILE_TYPE', message: 'Video field requires an MP4 or WebM file.' } });
    }
    if ((isPosterField || (!isVideoField && !isPosterField)) && isVideoFile) {
      return res.status(400).json({ success: false, error: { code: 'WRONG_FILE_TYPE', message: 'Image/poster field requires an image file.' } });
    }

    // Store via existing upload infrastructure (same adapter as all other uploads)
    const media = await uploadService.uploadFile(req.file, 'hub-hero');

    // Persist URL onto the hero sub-field in the singleton
    const [device, type] = parseHeroField(field);
    const doc = await HubPage.getSingleton();
    doc.set(`hero.${device}.${type}`, { url: media.url, mediaId: media._id, mimeType: media.mimeType });
    doc.markModified('hero');
    doc.updatedBy = req.user?._id;
    await doc.save();

    res.json({
      success: true,
      data: { field, url: media.url, mediaId: media._id, mimeType: media.mimeType },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'HERO_MEDIA_UPLOAD_ERROR', message: err.message } });
  }
};

// POST /api/hub/admin/categories/image  — upload an image for a category card
exports.uploadCategoryImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded.' } });
    }
    const media = await uploadService.uploadFile(req.file, 'hub-categories');
    res.json({ success: true, data: { url: media.url, mediaId: media._id, mimeType: media.mimeType } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'CATEGORY_IMAGE_ERROR', message: err.message } });
  }
};

// DELETE /api/hub/admin/hero/media/:field  — remove a hero media asset
exports.deleteHeroMedia = async (req, res) => {
  try {
    const { field } = req.params;
    if (!HERO_MEDIA_FIELDS.includes(field)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_FIELD' } });
    }

    const [device, type] = parseHeroField(field);
    const doc = await HubPage.getSingleton();
    const mediaId = doc.hero[device]?.[type]?.mediaId;

    // Clear the asset on the document
    doc.set(`hero.${device}.${type}`, { url: '', mediaId: null, mimeType: '' });
    doc.markModified('hero');
    doc.updatedBy = req.user?._id;
    await doc.save();

    // Remove from storage + Media collection (best-effort; non-blocking)
    if (mediaId) {
      try {
        const Media = require('../models/Media');
        const media = await Media.findById(mediaId);
        if (media) {
          const adapter = uploadService.getAdapter();
          const resType = media.mimeType?.startsWith('video/') ? 'video' : 'image';
          await adapter.delete(media.filename, resType);
          await media.deleteOne();
        }
      } catch { /* non-fatal — file may already be gone */ }
    }

    res.json({ success: true, message: `${field} deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'HERO_MEDIA_DELETE_ERROR', message: err.message } });
  }
};
