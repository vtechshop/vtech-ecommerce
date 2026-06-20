const express = require('express');
const router = express.Router();
const ShippingRestriction = require('../models/ShippingRestriction');

// GET - list with optional type filter + search
router.get('/', async (req, res, next) => {
  try {
    const { type, search, page = 1, limit = 100 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { stateName:    new RegExp(search, 'i') },
        { districtName: new RegExp(search, 'i') },
        { pincode:      new RegExp(search, 'i') },
        { note:         new RegExp(search, 'i') },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      ShippingRestriction.find(filter).sort({ type: 1, stateName: 1, districtName: 1 }).skip(skip).limit(Number(limit)).lean(),
      ShippingRestriction.countDocuments(filter),
    ]);
    res.json({ success: true, data: items, total, page: Number(page) });
  } catch (err) { next(err); }
});

// POST - create single restriction
router.post('/', async (req, res, next) => {
  try {
    const { type, stateName, districtName = '', pincode = '', note = '' } = req.body;
    if (!type || !stateName) return res.status(400).json({ success: false, error: 'type and stateName are required' });
    const item = await ShippingRestriction.create({ type, stateName, districtName, pincode, note });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
});

// POST - bulk import rows from CSV
router.post('/bulk-import', async (req, res, next) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No rows provided' });
    }
    const valid = rows.filter(r => r.type && r.stateName);
    const result = await ShippingRestriction.insertMany(valid, { ordered: false });
    res.json({ success: true, inserted: result.length });
  } catch (err) { next(err); }
});

// GET - export all as JSON (frontend converts to CSV)
router.get('/export', async (req, res, next) => {
  try {
    const items = await ShippingRestriction.find().sort({ type: 1, stateName: 1 }).lean();
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

// PUT - update / toggle isActive
router.put('/:id', async (req, res, next) => {
  try {
    const item = await ShippingRestriction.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

// DELETE
router.delete('/:id', async (req, res, next) => {
  try {
    await ShippingRestriction.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
