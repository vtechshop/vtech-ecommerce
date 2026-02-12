import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { Review } from '../../types';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';

interface RatingBreakdownProps {
  reviews: Review[];
  averageRating: number;
  totalCount: number;
}

function RatingBar({ star, count, total, delay }: { star: number; count: number; total: number; delay: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const widthAnim = useSharedValue(0);

  useEffect(() => {
    widthAnim.value = withDelay(delay, withTiming(percentage, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [percentage]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${widthAnim.value}%`,
  }));

  return (
    <View style={styles.barRow}>
      <Text style={styles.starLabel}>{star}</Text>
      <Ionicons name="star" size={10} color={colors.secondary} />
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
      <Text style={styles.barCount}>{count}</Text>
    </View>
  );
}

export default function RatingBreakdown({ reviews, averageRating, totalCount }: RatingBreakdownProps) {
  if (totalCount === 0) return null;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  const sampleSize = reviews.length;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {/* Left: Overall rating */}
        <View style={styles.overallSection}>
          <Text style={styles.overallRating}>{averageRating.toFixed(1)}</Text>
          <View style={styles.overallStars}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons key={s} name={s <= Math.round(averageRating) ? 'star' : 'star-outline'} size={14} color={colors.secondary} />
            ))}
          </View>
          <Text style={styles.totalText}>{totalCount} ratings</Text>
        </View>

        {/* Right: Bar chart */}
        <View style={styles.barsSection}>
          {distribution.map((item, i) => (
            <RatingBar key={item.star} star={item.star} count={item.count} total={sampleSize} delay={i * 100} />
          ))}
        </View>
      </View>
      {sampleSize < totalCount && (
        <Text style={styles.sampleNote}>Based on {sampleSize} of {totalCount} reviews</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, ...shadows.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  overallSection: { alignItems: 'center', justifyContent: 'center', minWidth: 80 },
  overallRating: { fontSize: 36, fontWeight: fontWeight.extrabold, color: colors.text },
  overallStars: { flexDirection: 'row', marginTop: 4 },
  totalText: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 4 },
  barsSection: { flex: 1, justifyContent: 'center', gap: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  starLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text, width: 12, textAlign: 'right' },
  barTrack: { flex: 1, height: 8, backgroundColor: colors.surfaceDark, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.secondary, borderRadius: 4 },
  barCount: { fontSize: fontSize.xs, color: colors.textSecondary, width: 20, textAlign: 'right' },
  sampleNote: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
});
