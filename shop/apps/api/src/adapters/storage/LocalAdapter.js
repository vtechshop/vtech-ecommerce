// FILE: apps/api/src/adapters/storage/LocalAdapter.js
const StorageAdapter = require('./StorageAdapter');
const path = require('path');
const fs = require('fs').promises;

class LocalAdapter extends StorageAdapter {
  constructor(basePath = 'uploads') {
    super();
    // Use absolute path to avoid cwd-related issues
    this.basePath = path.isAbsolute(basePath) ? basePath : path.resolve(process.cwd(), basePath);
  }

  async upload(file, filePath) {
    const fullPath = path.join(this.basePath, filePath);
    const dir = path.dirname(fullPath);

    // Create directory if it doesn't exist
    await fs.mkdir(dir, { recursive: true });

    // Move file
    await fs.writeFile(fullPath, file.buffer);

    return filePath;
  }

  async delete(filePath) {
    const fullPath = path.join(this.basePath, filePath);
    try {
      await fs.unlink(fullPath);
    } catch (err) {
      // Ignore if already deleted/missing
      if (err.code !== 'ENOENT') throw err;
    }
  }

  getUrl(filePath) {
    const env = require('../../config/env');
    return `${env.APP_URL}/uploads/${filePath}`;
  }
}

module.exports = LocalAdapter;