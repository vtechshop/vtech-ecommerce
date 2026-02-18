const recommendationService = require('../../services/recommendationService');

describe('Recommendation Service', () => {
  describe('combineRecommendations', () => {
    it('should combine products from multiple strategies', () => {
      const mockProduct1 = { _id: { toString: () => 'p1' }, title: 'Product 1' };
      const mockProduct2 = { _id: { toString: () => 'p2' }, title: 'Product 2' };
      const mockProduct3 = { _id: { toString: () => 'p3' }, title: 'Product 3' };

      const results = [
        { status: 'fulfilled', value: [mockProduct1, mockProduct2] }, // Collaborative (weight 3)
        { status: 'fulfilled', value: [mockProduct2, mockProduct3] }, // Content-based (weight 2)
        { status: 'fulfilled', value: [] }, // Search-based
        { status: 'fulfilled', value: [] }, // Review-based
        { status: 'fulfilled', value: [mockProduct3] }, // Trending (weight 1)
      ];

      const combined = recommendationService.combineRecommendations(results, 10);

      expect(combined.length).toBe(3);
      // Product 2 appears in both collaborative and content-based, so highest score
      expect(combined[0]._id.toString()).toBe('p2');
    });

    it('should respect limit parameter', () => {
      const products = Array.from({ length: 20 }, (_, i) => ({
        _id: { toString: () => `p${i}` },
        title: `Product ${i}`,
      }));

      const results = [
        { status: 'fulfilled', value: products },
        { status: 'fulfilled', value: [] },
        { status: 'fulfilled', value: [] },
        { status: 'fulfilled', value: [] },
        { status: 'fulfilled', value: [] },
      ];

      const combined = recommendationService.combineRecommendations(results, 5);
      expect(combined.length).toBe(5);
    });

    it('should handle rejected strategies gracefully', () => {
      const mockProduct = { _id: { toString: () => 'p1' }, title: 'Product 1' };

      const results = [
        { status: 'rejected', reason: new Error('DB error') },
        { status: 'fulfilled', value: [mockProduct] },
        { status: 'rejected', reason: new Error('Timeout') },
        { status: 'fulfilled', value: [] },
        { status: 'fulfilled', value: [] },
      ];

      const combined = recommendationService.combineRecommendations(results, 10);
      expect(combined.length).toBe(1);
      expect(combined[0].title).toBe('Product 1');
    });

    it('should handle all strategies failing', () => {
      const results = [
        { status: 'rejected', reason: new Error('Error 1') },
        { status: 'rejected', reason: new Error('Error 2') },
        { status: 'rejected', reason: new Error('Error 3') },
        { status: 'rejected', reason: new Error('Error 4') },
        { status: 'rejected', reason: new Error('Error 5') },
      ];

      const combined = recommendationService.combineRecommendations(results, 10);
      expect(combined).toEqual([]);
    });

    it('should handle empty results', () => {
      const results = [
        { status: 'fulfilled', value: [] },
        { status: 'fulfilled', value: [] },
        { status: 'fulfilled', value: [] },
        { status: 'fulfilled', value: [] },
        { status: 'fulfilled', value: [] },
      ];

      const combined = recommendationService.combineRecommendations(results, 10);
      expect(combined).toEqual([]);
    });

    it('should score based on strategy weight and position', () => {
      const productA = { _id: { toString: () => 'a' }, title: 'A' };
      const productB = { _id: { toString: () => 'b' }, title: 'B' };

      // Product A in collaborative (weight 3, position 0)
      // Product B in trending (weight 1, position 0)
      const results = [
        { status: 'fulfilled', value: [productA] }, // weight 3
        { status: 'fulfilled', value: [] },
        { status: 'fulfilled', value: [] },
        { status: 'fulfilled', value: [] },
        { status: 'fulfilled', value: [productB] }, // weight 1
      ];

      const combined = recommendationService.combineRecommendations(results, 10);
      // Product A should be first (higher weight)
      expect(combined[0]._id.toString()).toBe('a');
    });

    it('should deduplicate products across strategies', () => {
      const product = { _id: { toString: () => 'same' }, title: 'Same Product' };

      const results = [
        { status: 'fulfilled', value: [product] },
        { status: 'fulfilled', value: [product] },
        { status: 'fulfilled', value: [product] },
        { status: 'fulfilled', value: [] },
        { status: 'fulfilled', value: [] },
      ];

      const combined = recommendationService.combineRecommendations(results, 10);
      expect(combined.length).toBe(1);
    });
  });
});
