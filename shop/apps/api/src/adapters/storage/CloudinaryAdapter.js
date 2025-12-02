// FILE: apps/api/src/adapters/storage/CloudinaryAdapter.js
const StorageAdapter = require('./StorageAdapter');
const { v2: cloudinary } = require('cloudinary');

class CloudinaryAdapter extends StorageAdapter {
  constructor(cloudName, apiKey, apiSecret) {
    super();
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  async upload(file, filePath) {
    // Extract folder from filePath (e.g., "general/uuid.webp" -> "general")
    const folder = filePath.split('/')[0] || 'uploads';

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `vtech/${folder}`,
          resource_type: 'auto',
          transformation: [
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result.public_id);
          }
        }
      );

      uploadStream.end(file.buffer);
    });
  }

  async delete(publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      // Ignore if already deleted
      console.error('Cloudinary delete error:', err.message);
    }
  }

  getUrl(publicId) {
    // Return Cloudinary URL with auto format and quality
    return cloudinary.url(publicId, {
      secure: true,
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });
  }
}

module.exports = CloudinaryAdapter;
