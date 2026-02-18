// FILE: apps/api/src/controllers/appConfigController.js
const AppConfig = require('../models/AppConfig');
const asyncHandler = require('../middleware/asyncHandler');

// GET /api/config/app - Public: Get app config
exports.getConfig = asyncHandler(async (req, res) => {
  let config = await AppConfig.findOne().lean();

  // If no config exists, create one with defaults
  if (!config) {
    config = await AppConfig.create({});
    config = config.toObject();
  }

  res.json({ success: true, data: config });
});

// PUT /api/config/app - Admin: Update app config
exports.updateConfig = asyncHandler(async (req, res) => {
  const updateData = {};

  // Only update fields that are provided
  if (req.body.contactInfo) {
    updateData.contactInfo = req.body.contactInfo;
  }
  if (req.body.aboutPage) {
    updateData.aboutPage = req.body.aboutPage;
  }
  if (req.body.referralConfig) {
    updateData.referralConfig = req.body.referralConfig;
  }
  if (req.body.festivalSale) {
    updateData.festivalSale = req.body.festivalSale;
  }
  if (req.body.giftCardAmounts) {
    updateData.giftCardAmounts = req.body.giftCardAmounts;
  }

  const config = await AppConfig.findOneAndUpdate(
    {},
    { $set: updateData },
    { upsert: true, new: true, runValidators: true }
  );

  res.json({ success: true, data: config });
});
