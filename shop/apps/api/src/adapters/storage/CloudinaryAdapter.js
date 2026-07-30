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
    const folder = filePath.split('/')[0] || 'uploads';

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `vtech/${folder}`,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            // Return both public_id and resource_type so callers can build the correct URL
            resolve({ publicId: result.public_id, resourceType: result.resource_type });
          }
        }
      );

      uploadStream.end(file.buffer);
    });
  }

  async delete(publicId, resourceType = 'image') {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
      console.error('Cloudinary delete error:', err.message);
    }
  }

  getUrl(publicId, resourceType = 'image') {
    return cloudinary.url(publicId, {
      secure: true,
      resource_type: resourceType,
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });
  }
}

module.exports = CloudinaryAdapter;
