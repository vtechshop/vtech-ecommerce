const { roundOffTotal } = require('../../utils/roundOff');

describe('roundOffTotal', () => {
  it('rounds down below 50 paise', () => {
    expect(roundOffTotal(23010.49)).toEqual({ total: 23010, roundOff: -0.49 });
  });
  it('rounds up from 50 paise', () => {
    expect(roundOffTotal(1179.5)).toEqual({ total: 1180, roundOff: 0.5 });
    expect(roundOffTotal(354.82)).toEqual({ total: 355, roundOff: 0.18 });
  });
  it('leaves whole rupees alone', () => {
    expect(roundOffTotal(23010)).toEqual({ total: 23010, roundOff: 0 });
  });
  it('handles float noise from GST maths', () => {
    // 99.99 × 2 × 1.18 = 235.9764 → 235.98 → 236
    expect(roundOffTotal(99.99 * 2 + 99.99 * 2 * 0.18)).toEqual({ total: 236, roundOff: 0.02 });
  });
});
