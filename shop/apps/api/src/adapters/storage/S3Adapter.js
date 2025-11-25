// FILE: apps/api/src/adapters/storage/S3Adapter.js
const StorageAdapter = require('./StorageAdapter');
const AWS = require('aws-sdk');

class S3Adapter extends StorageAdapter {
  constructor(bucket, region, accessKeyId, secretAccessKey) {
    super();
    this.bucket = bucket;
    this.s3 = new AWS.S3({
      region,
      accessKeyId,
      secretAccessKey,
    });
  }

  async upload(file, filePath) {
    const params = {
      Bucket: this.bucket,
      Key: filePath,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    };

    await this.s3.upload(params).promise();
    return filePath;
  }

  async delete(filePath) {
    const params = {
      Bucket: this.bucket,
      Key: filePath,
    };

    await this.s3.deleteObject(params).promise();
  }

  getUrl(filePath) {
    return `https://${this.bucket}.s3.amazonaws.com/${filePath}`;
  }
}

module.exports = S3Adapter;