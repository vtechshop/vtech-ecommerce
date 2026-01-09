// Test CRUD operations for Admin and Vendor dashboards
const axios = require('axios');

const API_URL = 'http://localhost:8080/api';

async function testAdminCRUD() {
  console.log('\n=== TESTING ADMIN CRUD OPERATIONS ===\n');

  try {
    // 1. Login as admin
    console.log('1. Logging in as admin...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@shop.test',
      password: 'yZLx4pn5&5'
    });

    const token = loginRes.data.data.accessToken;
    console.log('✅ Login successful');

    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

    // 2. Get users list
    console.log('\n2. Getting users list...');
    const usersRes = await axios.get(`${API_URL}/admin/users?limit=5`, config);
    console.log(`✅ Got ${usersRes.data.data.users.length} users`);
    console.log(`   Total: ${usersRes.data.data.total}`);

    // 3. Get products list
    console.log('\n3. Getting products list...');
    const productsRes = await axios.get(`${API_URL}/admin/products?limit=5`, config);
    console.log(`✅ Got ${productsRes.data.data.products.length} products`);
    console.log(`   Total: ${productsRes.data.data.total}`);

    // 4. Create a new category
    console.log('\n4. Creating new category...');
    const categoryRes = await axios.post(`${API_URL}/admin/categories`, {
      name: 'Test Category ' + Date.now(),
      description: 'Test category description'
    }, config);
    console.log(`✅ Category created: ${categoryRes.data.data.name}`);
    const categoryId = categoryRes.data.data._id;

    // 5. Update category
    console.log('\n5. Updating category...');
    const updateRes = await axios.put(`${API_URL}/admin/categories/${categoryId}`, {
      description: 'Updated description'
    }, config);
    console.log(`✅ Category updated: ${updateRes.data.data.description}`);

    // 6. Delete category
    console.log('\n6. Deleting category...');
    await axios.delete(`${API_URL}/admin/categories/${categoryId}`, config);
    console.log(`✅ Category deleted`);

    // 7. Get vendors
    console.log('\n7. Getting vendors list...');
    const vendorsRes = await axios.get(`${API_URL}/admin/vendors?limit=5`, config);
    console.log(`✅ Got ${vendorsRes.data.data.vendors.length} vendors`);

    // 8. Get dashboard stats
    console.log('\n8. Getting dashboard stats...');
    const statsRes = await axios.get(`${API_URL}/admin/dashboard/stats`, config);
    console.log(`✅ Dashboard stats:`);
    console.log(`   Users: ${statsRes.data.data.stats.totalUsers}`);
    console.log(`   Products: ${statsRes.data.data.stats.totalProducts}`);
    console.log(`   Orders: ${statsRes.data.data.stats.totalOrders}`);

    console.log('\n✅ ALL ADMIN CRUD TESTS PASSED\n');
    return true;

  } catch (error) {
    console.error(`\n❌ Admin test failed:`, error.response?.data || error.message);
    return false;
  }
}

async function testVendorCRUD() {
  console.log('\n=== TESTING VENDOR CRUD OPERATIONS ===\n');

  try {
    // 1. Login as vendor
    console.log('1. Logging in as vendor...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'vendor@shop.test',
      password: 'mENKHqKj@8'
    });

    const token = loginRes.data.data.accessToken;
    console.log('✅ Login successful');

    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

    // 2. Get vendor dashboard stats
    console.log('\n2. Getting vendor dashboard stats...');
    const statsRes = await axios.get(`${API_URL}/vendors/dashboard/stats`, config);
    console.log(`✅ Dashboard stats:`);
    console.log(`   Products: ${statsRes.data.data.stats.totalProducts}`);
    console.log(`   Orders: ${statsRes.data.data.stats.totalOrders}`);
    console.log(`   Earnings: ₹${statsRes.data.data.stats.totalEarnings}`);

    // 3. Get vendor products
    console.log('\n3. Getting vendor products...');
    const productsRes = await axios.get(`${API_URL}/vendors/products?limit=5`, config);
    console.log(`✅ Got ${productsRes.data.data.products.length} products`);
    console.log(`   Total: ${productsRes.data.data.total}`);

    // 4. Create a new product
    console.log('\n4. Creating new product...');
    const productRes = await axios.post(`${API_URL}/vendors/products`, {
      title: 'Test Product ' + Date.now(),
      description: 'Test product description',
      price: 999,
      stock: 10,
      sku: 'TEST-' + Date.now(),
      categoryIds: [],
      published: false
    }, config);
    console.log(`✅ Product created: ${productRes.data.data.title}`);
    const productId = productRes.data.data._id;

    // 5. Update product
    console.log('\n5. Updating product...');
    const updateRes = await axios.put(`${API_URL}/vendors/products/${productId}`, {
      price: 1299,
      description: 'Updated description'
    }, config);
    console.log(`✅ Product updated: Price ₹${updateRes.data.data.price}`);

    // 6. Get inventory
    console.log('\n6. Getting inventory...');
    const inventoryRes = await axios.get(`${API_URL}/vendors/inventory`, config);
    console.log(`✅ Got ${inventoryRes.data.data.products.length} products in inventory`);

    // 7. Get vendor orders
    console.log('\n7. Getting vendor orders...');
    const ordersRes = await axios.get(`${API_URL}/vendors/orders?limit=5`, config);
    console.log(`✅ Got ${ordersRes.data.data.orders.length} orders`);

    // 8. Delete product
    console.log('\n8. Deleting product...');
    await axios.delete(`${API_URL}/vendors/products/${productId}`, config);
    console.log(`✅ Product deleted`);

    console.log('\n✅ ALL VENDOR CRUD TESTS PASSED\n');
    return true;

  } catch (error) {
    console.error(`\n❌ Vendor test failed:`, error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function runTests() {
  console.log('\n🧪 STARTING CRUD OPERATION TESTS\n');
  console.log('API URL:', API_URL);
  console.log('='.repeat(60));

  const adminPass = await testAdminCRUD();
  const vendorPass = await testVendorCRUD();

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST SUMMARY:\n');
  console.log(`Admin CRUD: ${adminPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Vendor CRUD: ${vendorPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`\nOverall: ${adminPass && vendorPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);

  process.exit(adminPass && vendorPass ? 0 : 1);
}

runTests().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
