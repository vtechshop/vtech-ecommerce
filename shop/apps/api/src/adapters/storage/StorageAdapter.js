// FILE: apps/api/src/adapters/storage/StorageAdapter.js
// Base storage adapter interface
class StorageAdapter {
  async upload(file, path) {
    throw new Error('upload must be implemented');
  }

  async delete(path) {
    throw new Error('delete must be implemented');
  }

  async getUrl(path) {
    throw new Error('getUrl must be implemented');
  }
}

module.exports = StorageAdapter;