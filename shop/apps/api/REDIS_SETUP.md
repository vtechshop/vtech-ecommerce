# Redis Setup Guide

## Overview

This project now includes Redis support for caching and distributed rate limiting. Redis is optional in development mode but recommended for production.

## Installation

### 1. Install Redis Server

#### Windows
Download and install Redis from: https://github.com/microsoftarchive/redis/releases
Or use WSL2 with Ubuntu and install Redis there:
```bash
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

#### macOS
```bash
brew install redis
brew services start redis
```

#### Linux
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

### 2. Verify Redis is Running

```bash
redis-cli ping
# Should return: PONG
```

## Configuration

Redis connection settings are configured in `.env`:

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

For production or cloud Redis (e.g., Redis Cloud, AWS ElastiCache):
```env
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
REDIS_DB=0
```

## Features Implemented

### 1. Distributed Rate Limiting
Rate limiting now uses Redis store for distributed counting across multiple server instances:
- **API Limiter**: 100 requests per 15 minutes
- **Auth Limiter**: 5 attempts per 15 minutes
- **Payment Limiter**: 10 attempts per hour

Location: `src/middleware/rateLimiter.js`

### 2. Caching Utilities
Full Redis caching utilities available in `src/utils/cache.js`:

```javascript
const cache = require('./utils/cache');

// Set cache with TTL (time-to-live in seconds)
await cache.set('user:123', userData, 300); // 5 minutes

// Get cached data
const data = await cache.get('user:123');

// Delete cache
await cache.del('user:123');

// Delete by pattern
await cache.delPattern('user:*');

// Check existence
const exists = await cache.exists('user:123');

// Increment counter
await cache.increment('page:views', 1);
```

### 3. Caching Middleware
Express middleware for automatic response caching:

```javascript
const { cacheMiddleware, cacheUserData, invalidateCache } = require('./middleware/cache');

// Cache route for 5 minutes (300 seconds)
router.get('/products', cacheMiddleware(300), ProductController.getAll);

// Cache user-specific data
router.get('/profile', authenticate, cacheUserData(600), UserController.getProfile);

// Invalidate cache after updates
router.put('/products/:id', invalidateCache('cache:/api/products*'), ProductController.update);
```

## Usage Examples

### Example 1: Cache Product List

```javascript
// routes/products.js
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

// Cache product list for 10 minutes
router.get('/', cacheMiddleware(600), productController.getAll);

// Invalidate cache when products are modified
router.post('/', invalidateCache('cache:/api/products*'), productController.create);
router.put('/:id', invalidateCache('cache:/api/products*'), productController.update);
router.delete('/:id', invalidateCache('cache:/api/products*'), productController.delete);
```

### Example 2: Cache User Profile

```javascript
// routes/users.js
const { cacheUserData, invalidateUserCache } = require('../middleware/cache');

// Cache user-specific profile for 5 minutes
router.get('/profile', authenticate, cacheUserData(300), userController.getProfile);

// Invalidate user cache on profile update
router.put('/profile', authenticate, invalidateUserCache(), userController.updateProfile);
```

### Example 3: Manual Caching in Controllers

```javascript
// controllers/productController.js
const cache = require('../utils/cache');

exports.getProductById = async (req, res) => {
  const { id } = req.params;
  const cacheKey = `product:${id}`;

  // Try cache first
  let product = await cache.get(cacheKey);

  if (!product) {
    // Fetch from database
    product = await Product.findById(id);

    // Cache for 1 hour (3600 seconds)
    await cache.set(cacheKey, product, 3600);
  }

  res.json({ success: true, data: product });
};
```

### Example 4: Session Management

```javascript
const cache = require('../utils/cache');

// Store session data
await cache.set(`session:${sessionId}`, sessionData, 86400); // 24 hours

// Retrieve session
const session = await cache.get(`session:${sessionId}`);

// Delete session (logout)
await cache.del(`session:${sessionId}`);
```

## Testing

### Test Redis Connection
```bash
# In your project directory
cd shop/apps/api
npm run dev
# Check logs for "Redis connected successfully"
```

### Manual Testing with Redis CLI
```bash
# Connect to Redis
redis-cli

# View all keys
KEYS *

# View rate limit data
KEYS rl:*

# View cached data
KEYS cache:*

# Get specific value
GET cache:/api/products

# Delete all cache
FLUSHDB
```

## Production Considerations

1. **Redis Persistence**: Enable RDB or AOF persistence in production
2. **Memory Limits**: Configure maxmemory and eviction policies
3. **Security**:
   - Always use passwords in production
   - Use TLS/SSL for connections
   - Restrict network access
4. **Monitoring**: Monitor Redis memory usage, connections, and hit rates
5. **Backup**: Regular Redis backups for critical data

## Troubleshooting

### Redis Not Connected
- Check if Redis server is running: `redis-cli ping`
- Verify connection settings in `.env`
- Check firewall rules
- In development, the app will continue without Redis (with warnings)

### Cache Not Working
- Check Redis connection in logs
- Verify middleware is applied to routes
- Check TTL values are appropriate
- Use Redis CLI to inspect keys

### Rate Limiting Issues
- Verify Redis store is initialized
- Check rate limit configuration
- Monitor Redis memory for rate limit keys

## Performance Tips

1. **Set Appropriate TTLs**: Don't cache forever, use reasonable expiration times
2. **Cache Invalidation**: Implement proper cache invalidation strategies
3. **Cache Warming**: Pre-populate cache for frequently accessed data
4. **Monitor Hit Rates**: Track cache hit/miss ratios
5. **Use Patterns**: Use consistent naming patterns for keys (e.g., `user:123`, `product:456`)

## Additional Resources

- [Redis Documentation](https://redis.io/documentation)
- [ioredis Documentation](https://github.com/redis/ioredis)
- [Caching Strategies](https://aws.amazon.com/caching/best-practices/)
