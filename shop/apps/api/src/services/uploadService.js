// FILE: apps/api/src/services/uploadService.js
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');

class UploadService {
  constructor() {
    this.storage = multer.memoryStorage();
    this.upload = multer({
      storage: this.storage,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
          return cb(null, true);
        }
        cb(new Error('Invalid file type'));
      },
    });
  }

  getAdapter() {
    const driver = env.UPLOAD_DRIVER || 'local';

    if (driver === 's3') {
      const S3Adapter = require('../adapters/storage/S3Adapter');
      return new S3Adapter(
        env.S3_BUCKET,
        env.S3_REGION,
        env.S3_KEY,
        env.S3_SECRET
      );
    }

    const LocalAdapter = require('../adapters/storage/LocalAdapter');
    return new LocalAdapter();
  }

  async uploadFile(file, folder = 'general') {
    const adapter = this.getAdapter();
    const filename = `${folder}/${uuidv4()}${path.extname(file.originalname)}`;
    
    await adapter.upload(file, filename);
    
    const Media = require('../models/Media');
    const media = await Media.create({
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: adapter.getUrl(filename),
      folder,
    });

    return media;
  }

  middleware(fieldName = 'file') {
    return this.upload.single(fieldName);
  }

  middlewareMultiple(fieldName = 'files', maxCount = 10) {
    return this.upload.array(fieldName, maxCount);
  }
}

module.exports = new UploadService();