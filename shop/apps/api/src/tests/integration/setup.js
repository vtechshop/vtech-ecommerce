// FILE: apps/api/src/tests/setup.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let useExternalMongo = false;

// Increase timeout for MongoMemoryServer (especially for CI)
jest.setTimeout(30000);

beforeAll(async () => {
  // Check if external MongoDB is available (CI environment)
  const externalUri = process.env.MONGODB_URI;

  if (externalUri) {
    // Use CI-provided MongoDB
    useExternalMongo = true;
    await mongoose.connect(externalUri);
  } else {
    // Use MongoMemoryServer for local development
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'test',
      },
      binary: {
        // Increase download timeout for slow connections
        downloadDir: './node_modules/.cache/mongodb-memory-server',
      },
    });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  }
}, 60000); // 60 second timeout for beforeAll

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer && !useExternalMongo) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});