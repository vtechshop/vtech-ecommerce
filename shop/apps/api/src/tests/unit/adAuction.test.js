// FILE: apps/api/src/tests/unit/adAuction.test.js
describe('Ad Auction Logic', () => {
  test('should rank ads by bid × quality score', () => {
    const ads = [
      { id: 1, bid: 1.0, qualityScore: 5 },
      { id: 2, bid: 0.8, qualityScore: 8 },
      { id: 3, bid: 1.2, qualityScore: 4 },
    ];
    
    const ranked = ads
      .map(ad => ({ ...ad, score: ad.bid * ad.qualityScore }))
      .sort((a, b) => b.score - a.score);
    
    expect(ranked[0].id).toBe(2); // 0.8 * 8 = 6.4
    expect(ranked[1].id).toBe(1); // 1.0 * 5 = 5.0
    expect(ranked[2].id).toBe(3); // 1.2 * 4 = 4.8
  });
});