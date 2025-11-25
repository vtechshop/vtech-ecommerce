// Global setup for Playwright tests
import axios from 'axios';

export default async function globalSetup(config) {
  console.log('Setting up Playwright tests...');

  const API_URL = 'http://localhost:8080/api';

  // Create test users
  const testUsers = [
    {
      email: 'demo@example.com',
      password: 'Password123',
      name: 'Demo User',
      role: 'customer'
    },
    {
      email: 'admin@example.com',
      password: 'Password123',
      name: 'Admin User',
      role: 'admin'
    },
    {
      email: 'vendor@example.com',
      password: 'Vendor@123',
      name: 'Vendor User',
      role: 'vendor'
    }
  ];

  for (const user of testUsers) {
    try {
      // Try to register the user
      await axios.post(`${API_URL}/auth/register`, {
        email: user.email,
        password: user.password,
        name: user.name,
        terms: true
      });
      console.log(`✓ Created test user: ${user.email}`);
    } catch (error) {
      // User might already exist, which is fine
      if (error.response?.status === 400 && error.response?.data?.error?.message?.includes('already exists')) {
        console.log(`✓ Test user already exists: ${user.email}`);
      } else {
        console.log(`⚠ Could not create user ${user.email}:`, error.response?.data?.error?.message || error.message);
      }
    }
  }

  console.log('Test setup complete!');
}
