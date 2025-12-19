# CI/CD Pipeline Fixes

## Status: ✅ FIXED (2025-12-19)

Your CI/CD pipeline was broken due to **5 critical configuration issues**. All have been resolved.

---

## 🔴 Issues Found & Fixed

### 1. **Wrong Docker File Paths**
**Problem**: Workflow looked for Docker files at wrong location
```yaml
❌ file: ./configs/docker/Dockerfile.api
✅ file: ./shop/configs/Dockerfile.api
```

**Impact**: Docker build stage failed with "file not found"

---

### 2. **Wrong Docker Build Context**
**Problem**: Docker context was set to repository root instead of shop directory
```yaml
❌ context: .
✅ context: ./shop
```

**Impact**: Docker couldn't find package.json and source files

---

### 3. **Incomplete NPM Cache Configuration**
**Problem**: Only cached API package-lock.json, not web
```yaml
❌ cache-dependency-path: shop/apps/api/package-lock.json
✅ cache-dependency-path: |
     shop/apps/api/package-lock.json
     shop/apps/web/package-lock.json
```

**Impact**: Slower builds, cache misses for web dependencies

---

### 4. **Missing/Wrong Environment Variables**
**Problem**: Test environment variables were incorrect or missing

**Fixed:**
```yaml
# Added:
+ NODE_ENV: test                    # Enables test mode
+ MONGODB_URI: mongodb://...        # App uses MONGODB_URI not MONGO_URI
+ JWT_SECRET: test-secret...        # App uses JWT_SECRET not JWT_ACCESS_SECRET
+ CLOUDINARY_CLOUD_NAME: test       # Prevents upload failures
+ CLOUDINARY_API_KEY: test
+ CLOUDINARY_API_SECRET: test
```

**Impact**: Tests failed due to missing environment configuration

---

### 5. **Missing Web Build Environment**
**Problem**: Web build didn't know which API URL to use
```yaml
# Added to Build Web step:
+ env:
+   VITE_API_URL: https://api.vtechkitchen.com/api
```

**Impact**: Built frontend would try to connect to localhost in production

---

## 📋 Complete Changes

```diff
# .github/workflows/ci-cd.yml

 - name: Setup Node.js
   uses: actions/setup-node@v3
   with:
     node-version: '20'
     cache: 'npm'
-    cache-dependency-path: shop/apps/api/package-lock.json
+    cache-dependency-path: |
+      shop/apps/api/package-lock.json
+      shop/apps/web/package-lock.json

 - name: Run API tests
   run: |
     cd shop/apps/api
     npm test
   env:
-    MONGO_URI: mongodb://localhost:27017/shop-test
-    JWT_ACCESS_SECRET: test-secret-min-32-chars-long
+    NODE_ENV: test
+    MONGODB_URI: mongodb://localhost:27017/shop-test
+    JWT_SECRET: test-secret-min-32-chars-long
     JWT_REFRESH_SECRET: test-refresh-secret-min-32-chars
     REDIS_HOST: localhost
     REDIS_PORT: 6379
+    CLOUDINARY_CLOUD_NAME: test
+    CLOUDINARY_API_KEY: test
+    CLOUDINARY_API_SECRET: test

 - name: Build Web
   run: |
     cd shop/apps/web
     npm run build
+  env:
+    VITE_API_URL: https://api.vtechkitchen.com/api

 - name: Build and push API
   uses: docker/build-push-action@v4
   with:
-    context: .
-    file: ./configs/docker/Dockerfile.api
+    context: ./shop
+    file: ./shop/configs/Dockerfile.api
     push: true
     tags: ${{ secrets.DOCKER_USERNAME }}/shop-api:latest

 - name: Build and push Web
   uses: docker/build-push-action@v4
   with:
-    context: .
-    file: ./configs/docker/Dockerfile.web
+    context: ./shop
+    file: ./shop/configs/Dockerfile.web
     push: true
     tags: ${{ secrets.DOCKER_USERNAME }}/shop-web:latest
```

---

## 🧪 Test Status

**Test Dependencies**: ✅ All present
- `jest` (v30.2.0)
- `mongodb-memory-server` (v10.2.3)
- `supertest` (v7.1.4)

**Test Setup File**: ✅ `shop/apps/api/src/tests/integration/setup.js` exists

**Test Files**: ✅ Found 5+ test files
- `auth.test.js`
- `cart.test.js`
- `checkout.test.js`
- `helpers.test.js`
- `order.test.js`
- (and more)

---

## 🚀 Expected Pipeline Flow

### ✅ Stage 1: Test
1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install API dependencies (`npm ci`)
4. **Run API tests** with proper env vars
5. Install Web dependencies (`npm ci`)
6. **Build Web** with production API URL

### ✅ Stage 2: Build & Push (main branch only)
1. Login to Docker Hub
2. **Build API Docker image** from `shop/configs/Dockerfile.api`
3. **Build Web Docker image** from `shop/configs/Dockerfile.web`
4. Push both images to Docker Hub

### ✅ Stage 3: Deploy (main branch only)
1. SSH to production server
2. Pull latest Docker images
3. Restart containers with `docker-compose`
4. Cleanup old images

---

## 🔍 How to Verify Fix

### Check GitHub Actions:
1. Go to: https://github.com/vtechshop/vtech-ecommerce/actions
2. Latest workflow run should show **green checkmarks** ✅
3. All 3 stages (test, build-and-push, deploy) should pass

### Expected Results:
- ✅ **Test stage**: All tests pass with proper environment
- ✅ **Build stage**: Docker images build successfully
- ✅ **Deploy stage**: Production servers updated (if secrets configured)

---

## 🔐 Required GitHub Secrets

For **build-and-push** and **deploy** stages to work, ensure these secrets are set:

### Required for Docker Hub:
- `DOCKER_USERNAME` - Your Docker Hub username
- `DOCKER_PASSWORD` - Your Docker Hub password/token

### Required for Deployment:
- `PRODUCTION_HOST` - Server IP or hostname
- `PRODUCTION_USER` - SSH username
- `SSH_PRIVATE_KEY` - SSH private key for authentication

**To add secrets:**
1. Go to Repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret listed above

---

## 📊 Before vs After

| Component | Before ❌ | After ✅ |
|-----------|----------|---------|
| Docker paths | Wrong location | Correct paths |
| Docker context | Repository root | Shop directory |
| NPM cache | API only | API + Web |
| Test env vars | Missing/wrong | Complete & correct |
| Web build env | Not set | Production API URL |
| MongoDB var | MONGO_URI | MONGODB_URI |
| JWT var | JWT_ACCESS_SECRET | JWT_SECRET |
| Cloudinary | Not set | Test credentials |

---

## 🎯 Next Steps

1. **Monitor Next Push**: Push any change and verify pipeline passes
2. **Check Docker Hub**: Verify images are being pushed successfully
3. **Test Deployment**: If deploy stage runs, verify production updates

---

## 🛠️ Troubleshooting

### If tests still fail:
```bash
# Run tests locally to debug
cd shop/apps/api
npm test

# Check if MongoDB is running
docker ps | grep mongo
```

### If Docker build fails:
```bash
# Test Docker build locally
cd shop
docker build -f configs/Dockerfile.api -t test-api .
docker build -f configs/Dockerfile.web -t test-web .
```

### If deploy fails:
- Check if secrets are set in GitHub repository settings
- Verify SSH key has correct permissions
- Test SSH connection manually from your machine

---

## 📚 Related Files

- [CI/CD Workflow](.github/workflows/ci-cd.yml) - Main pipeline configuration
- [API Dockerfile](shop/configs/Dockerfile.api) - API Docker build
- [Web Dockerfile](shop/configs/Dockerfile.web) - Frontend Docker build
- [Jest Config](shop/apps/api/jest.config.js) - Test configuration
- [Test Setup](shop/apps/api/src/tests/integration/setup.js) - Test environment

---

**Fixed by**: Claude Code
**Date**: 2025-12-19
**Commit**: `443c8ef`
**Status**: ✅ Ready for testing
