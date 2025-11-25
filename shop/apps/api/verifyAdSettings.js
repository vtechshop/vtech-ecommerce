const mongoose = require('mongoose');
const Setting = require('./src/models/Setting');

async function verifyAdSettings() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ecommerce');

    const adSettings = await Setting.find({ category: 'ads' }).sort({ key: 1 });

    console.log('Found', adSettings.length, 'ad settings:');
    adSettings.forEach(setting => {
      console.log('-', setting.key, '=', setting.value, '(type:', setting.type + ')');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error verifying ad settings:', error);
    process.exit(1);
  }
}

verifyAdSettings();
