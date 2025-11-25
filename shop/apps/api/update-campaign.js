const mongoose = require('mongoose');

async function updateCampaign() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ecommerce');
    console.log('Connected to MongoDB');

    const AdCampaign = mongoose.model('AdCampaign', new mongoose.Schema({}, { strict: false }));

    // Update the first demo campaign
    const result = await AdCampaign.updateOne(
      { name: 'Demo Campaign 1 - Electronics Flash Sale' },
      {
        $set: {
          placement: 'product_top',
          position: 'top',
          bannerSize: 'hero',
          status: 'active',
          startAt: new Date('2025-01-01'),
          endAt: new Date('2026-12-31')
        }
      }
    );
    console.log('Update result:', result);

    // Verify the update
    const updated = await AdCampaign.findOne({ name: 'Demo Campaign 1 - Electronics Flash Sale' });
    console.log('\nUpdated campaign:');
    console.log(JSON.stringify({
      name: updated.name,
      placement: updated.placement,
      position: updated.position,
      bannerSize: updated.bannerSize,
      status: updated.status,
      startAt: updated.startAt,
      endAt: updated.endAt,
      bannerImage: updated.bannerImage
    }, null, 2));

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateCampaign();
