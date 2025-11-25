# Product Recommendation System Documentation

## Overview

The recommendation system uses customer search history, product reviews, purchase patterns, and browsing behavior to provide personalized product suggestions. It helps increase sales, improve customer experience, and keep users engaged.

## Features

### 1. **Multiple Recommendation Strategies**
- **Search-Based**: Recommends products based on what customers are searching for
- **Review-Based**: Suggests products similar to items customers rated highly
- **Purchase-Based**: "Customers who bought this also bought" recommendations
- **View-Based**: Products similar to items customers viewed
- **Trending**: Popular products based on recent activity
- **Top Reviewed**: Highest-rated products with quality ratings

### 2. **Product Snippets**
Shows trending search queries with relevant products, helping customers discover what others are looking for.

### 3. **Tracking System**
- Track product views with duration and source
- Track search queries and clicked results
- Build user profiles for personalized recommendations

## Architecture

### Backend Components

#### Models

**1. SearchHistory** (`shop/apps/api/src/models/SearchHistory.js`)
Tracks all search queries with filters, results, and clicked products.

```javascript
{
  userId: ObjectId,
  sessionId: String,
  query: String,
  filters: { category, minPrice, maxPrice, brand, rating },
  resultsCount: Number,
  clickedProducts: [{ productId, clickedAt }],
  convertedToPurchase: Boolean,
  orderId: ObjectId
}
```

**2. ProductView** (`shop/apps/api/src/models/ProductView.js`)
Tracks product page views with engagement metrics.

```javascript
{
  userId: ObjectId,
  sessionId: String,
  productId: ObjectId,
  duration: Number,
  source: String, // 'search', 'category', 'recommendation', etc.
  searchQuery: String,
  addedToCart: Boolean,
  addedToWishlist: Boolean,
  purchased: Boolean
}
```

#### Service Layer

**RecommendationService** (`shop/apps/api/src/services/recommendationService.js`)

Methods:
- `getRecommendations(userId, options)` - Get personalized recommendations
- `getSearchBasedRecommendations(userId, limit)` - Based on search history
- `getReviewBasedRecommendations(userId, limit)` - Based on reviews
- `getPurchaseBasedRecommendations(userId, limit)` - Based on purchases
- `getViewBasedRecommendations(userId, limit)` - Based on views
- `getTrendingProducts(limit)` - Popular products
- `getTopReviewedProducts(limit, minRating)` - Highly-rated products
- `getSimilarProducts(productId, limit)` - Similar items
- `getFrequentlyBoughtTogether(productId, limit)` - Bundle suggestions
- `getProductSnippetsFromSearches(limit)` - Trending search snippets
- `trackProductView(viewData)` - Track product views
- `trackSearch(searchData)` - Track searches
- `trackSearchClick(searchId, productId)` - Track search clicks

#### API Endpoints

**Catalog Routes** (`shop/apps/api/src/routes/catalog.js`)

```
GET  /catalog/recommendations - Personalized recommendations (auth required)
GET  /catalog/recommendations/trending - Trending products
GET  /catalog/recommendations/top-reviewed - Top rated products
GET  /catalog/recommendations/search-snippets - Popular search snippets
GET  /catalog/products/:productId/similar - Similar products
GET  /catalog/products/:productId/bought-together - Frequently bought together
POST /catalog/track/view - Track product view
POST /catalog/track/search - Track search query
POST /catalog/track/search-click - Track clicked product from search
```

### Frontend Components

#### Components

**1. ProductRecommendations** (`shop/apps/web/src/assets/components/product/ProductRecommendations.jsx`)

Universal recommendation component with multiple types:

```jsx
<ProductRecommendations
  type="personalized"  // or 'similar', 'frequently-bought-together', 'trending', 'top-reviewed'
  productId={productId}  // required for 'similar' and 'frequently-bought-together'
  title="Custom Title"  // optional
  limit={8}  // optional, default 8
  showViewAll={true}  // optional
  viewAllLink="/search"  // optional
/>
```

**2. SearchSnippets** (`shop/apps/web/src/assets/components/product/SearchSnippets.jsx`)

Displays trending search queries with product recommendations:

```jsx
<SearchSnippets
  limit={3}  // number of snippets to show
  className="my-8"  // optional styling
/>
```

#### Hooks

**useProductTracking** (`shop/apps/web/src/assets/hooks/useProductTracking.js`)

Custom hook for tracking user interactions:

```javascript
const {
  trackProductView,
  trackSearch,
  trackSearchClick,
  isTracking
} = useProductTracking();

// Track product view
trackProductView({
  productId: '123',
  duration: 30,
  source: 'search',
  searchQuery: 'laptop'
});

// Track search
const result = await trackSearch({
  query: 'laptop',
  filters: { category: 'electronics' },
  resultsCount: 45
});
const searchId = result.searchId;

// Track search click
trackSearchClick(searchId, productId);
```

## Usage Examples

### 1. Homepage with Recommendations

```jsx
import ProductRecommendations from '@/components/product/ProductRecommendations';
import SearchSnippets from '@/components/product/SearchSnippets';

function HomePage() {
  return (
    <div>
      {/* Trending products for all users */}
      <ProductRecommendations
        type="trending"
        title="Trending Now"
        limit={8}
        showViewAll={true}
      />

      {/* Personalized recommendations for logged-in users */}
      <ProductRecommendations
        type="personalized"
        limit={12}
      />

      {/* Top rated products */}
      <ProductRecommendations
        type="top-reviewed"
        title="Customer Favorites"
        limit={8}
      />

      {/* Search snippets */}
      <SearchSnippets limit={3} />
    </div>
  );
}
```

### 2. Product Detail Page with Tracking

```jsx
import { useEffect, useState } from 'react';
import ProductRecommendations from '@/components/product/ProductRecommendations';
import useProductTracking from '@/hooks/useProductTracking';

function ProductPage({ product }) {
  const { trackProductView } = useProductTracking();
  const [viewStartTime, setViewStartTime] = useState(Date.now());

  // Track view on mount
  useEffect(() => {
    setViewStartTime(Date.now());

    return () => {
      // Track view duration on unmount
      const duration = Math.floor((Date.now() - viewStartTime) / 1000);
      trackProductView({
        productId: product._id,
        duration,
        source: 'direct'
      });
    };
  }, [product._id]);

  return (
    <div>
      {/* Product details */}
      <ProductDetails product={product} />

      {/* Similar products */}
      <ProductRecommendations
        type="similar"
        productId={product._id}
        limit={8}
      />

      {/* Frequently bought together */}
      <ProductRecommendations
        type="frequently-bought-together"
        productId={product._id}
        limit={4}
      />
    </div>
  );
}
```

### 3. Search Page with Tracking

```jsx
import { useState, useEffect } from 'react';
import useProductTracking from '@/hooks/useProductTracking';

function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchId, setSearchId] = useState(null);
  const { trackSearch, trackSearchClick } = useProductTracking();

  const handleSearch = async (query) => {
    // Perform search
    const response = await api.get(`/catalog/products?q=${query}`);
    setResults(response.data.data);

    // Track search
    const result = await trackSearch({
      query,
      filters: {},
      resultsCount: response.data.meta.total
    });
    setSearchId(result.searchId);
  };

  const handleProductClick = (productId) => {
    // Track click
    if (searchId) {
      trackSearchClick(searchId, productId);
    }
  };

  return (
    <div>
      <SearchBar onSearch={handleSearch} />
      <ProductGrid
        products={results}
        onProductClick={handleProductClick}
      />
    </div>
  );
}
```

## Recommendation Algorithm

The system uses a **weighted scoring algorithm** that combines multiple recommendation strategies:

1. **Collaborative Filtering** (Weight: 3.0)
   - "Users who bought X also bought Y"
   - Based on purchase patterns

2. **Search-Based** (Weight: 2.5)
   - Products matching user's search history
   - Keywords and categories from recent searches

3. **Content-Based** (Weight: 2.0)
   - Products similar to user's purchases
   - Category, brand, and price range matching

4. **Review-Based** (Weight: 2.0)
   - Similar to products user rated highly
   - Only recommends well-rated products (4+ stars)

5. **Trending** (Weight: 1.0)
   - Popular products with recent sales
   - Fallback strategy for new users

**Scoring Formula:**
```
Final Score = Σ(Strategy Weight × Position Score)
Position Score = (Total Items - Position) / Total Items
```

Products appearing in multiple strategies get boosted scores, then sorted by final score.

## Performance Considerations

### Caching
- Frontend queries cached for 5 minutes
- Trending products cached for 10 minutes
- Search snippets cached for 10 minutes

### Database Indexes
```javascript
// SearchHistory indexes
{ userId: 1, createdAt: -1 }
{ query: 1 }
{ 'clickedProducts.productId': 1 }

// ProductView indexes
{ userId: 1, createdAt: -1 }
{ productId: 1, createdAt: -1 }
{ userId: 1, productId: 1 }
```

### Query Optimization
- Use `.lean()` for read-only queries
- Limit aggregations to recent data (7-30 days)
- Use `Promise.allSettled()` for parallel strategies
- Pagination for large result sets

## Privacy & GDPR Compliance

### Data Collection
- Tracks anonymous sessions for guest users
- Associates data with user ID when logged in
- No personally identifiable information in tracking data

### User Rights
- Users can request data deletion
- Opt-out options available in settings
- Transparent about data usage

### Data Retention
- Search history: 90 days
- Product views: 90 days
- Aggregated analytics: Indefinite (anonymized)

## Future Enhancements

1. **Machine Learning Integration**
   - TensorFlow.js for client-side predictions
   - Collaborative filtering with matrix factorization
   - Deep learning for image similarity

2. **Real-Time Recommendations**
   - WebSocket updates for trending products
   - Live recommendations as users browse

3. **A/B Testing Framework**
   - Test different recommendation strategies
   - Measure conversion rates and engagement

4. **Advanced Personalization**
   - Time-based recommendations (morning vs. evening)
   - Location-based suggestions
   - Seasonal trends and holidays

5. **Social Proof**
   - "X customers viewed this today"
   - "Trending in your area"
   - Friend recommendations

## Troubleshooting

### No recommendations showing
- Check if user has any activity (purchases, views, searches)
- Verify products are published and in stock
- Check API endpoints are working
- Ensure frontend queries have proper authentication

### Slow performance
- Review database indexes
- Check query execution times
- Implement caching at Redis layer
- Reduce recommendation limit

### Inaccurate recommendations
- Increase minimum data threshold
- Adjust strategy weights
- Clean up test data
- Review user activity patterns

## API Response Examples

### GET /catalog/recommendations
```json
{
  "success": true,
  "data": [
    {
      "_id": "123",
      "title": "Wireless Headphones",
      "price": 99.99,
      "rating": 4.5,
      "images": ["url"],
      "categoryIds": ["cat1"],
      "recommendationScore": 8.5,
      "recommendationSources": ["search-history", "purchase-history"]
    }
  ]
}
```

### GET /catalog/recommendations/search-snippets
```json
{
  "success": true,
  "data": [
    {
      "query": "wireless headphones",
      "searchCount": 245,
      "products": [
        { "_id": "123", "title": "...", "price": 99.99 }
      ]
    }
  ]
}
```

## Testing

### Manual Testing
1. Create test user accounts
2. Generate search history
3. Add product reviews
4. Make test purchases
5. Verify recommendations appear

### Automated Testing
```javascript
// Example test
describe('Recommendation Service', () => {
  it('should return search-based recommendations', async () => {
    const userId = 'test-user-id';
    const recommendations = await recommendationService
      .getSearchBasedRecommendations(userId, 10);

    expect(recommendations).toHaveLength(10);
    expect(recommendations[0]).toHaveProperty('title');
  });
});
```

## Support

For issues or questions:
- Check the troubleshooting section
- Review API documentation
- Contact development team
