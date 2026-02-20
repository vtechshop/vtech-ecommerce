import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';
import { haptic } from '../../src/utils/haptics';
import { spinApi, SpinSegment } from '../../src/api/content';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WHEEL_SIZE = SCREEN_WIDTH * 0.8;

interface Segment {
  label: string;
  color: string;
  isWin: boolean;
}

const FALLBACK_SEGMENTS: Segment[] = [
  { label: '\u20B910', color: '#4F46E5', isWin: true },
  { label: '\u20B925', color: '#7C3AED', isWin: true },
  { label: '\u20B950', color: '#3B82F6', isWin: true },
  { label: '\u20B9100', color: '#10B981', isWin: true },
  { label: 'Better\nLuck', color: '#6B7280', isWin: false },
  { label: '\u20B910', color: '#F59E0B', isWin: true },
  { label: '\u20B925', color: '#EC4899', isWin: true },
  { label: 'Try\nAgain', color: '#EF4444', isWin: false },
];

function mapApiSegments(apiSegments: SpinSegment[]): Segment[] {
  return apiSegments.map((s) => ({
    label: s.type === 'no_prize' ? 'Better\nLuck' : `\u20B9${s.value}`,
    color: s.color,
    isWin: s.type !== 'no_prize',
  }));
}

export default function SpinScreen() {
  const rotation = useSharedValue(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState<Segment | null>(null);
  const [segments, setSegments] = useState<Segment[]>(FALLBACK_SEGMENTS);
  const [loading, setLoading] = useState(true);
  const spinTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  const SEGMENT_ANGLE = 360 / segments.length;

  useEffect(() => {
    spinApi.getConfig()
      .then((res) => {
        const config = res.data.data;
        if (config?.segments && config.segments.length > 0) {
          setSegments(mapApiSegments(config.segments));
        }
        if (config?.remainingSpins === 0) {
          setHasSpun(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handleSpin = useCallback(async () => {
    if (isSpinning || hasSpun) return;

    haptic.medium();
    setIsSpinning(true);

    let serverSegmentIndex: number | null = null;

    try {
      const res = await spinApi.spin();
      serverSegmentIndex = res.data.data?.segment ?? null;
    } catch {
      // Fallback to random if API fails
    }

    const targetIndex = serverSegmentIndex ?? Math.floor(Math.random() * segments.length);
    const fullRotations = 3 + Math.floor(Math.random() * 3);
    const segmentCenter = targetIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const targetAngle = fullRotations * 360 + (360 - segmentCenter);

    rotation.value = withTiming(targetAngle, {
      duration: 4000,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    spinTimerRef.current = setTimeout(() => {
      setIsSpinning(false);
      setHasSpun(true);
      setResult(segments[targetIndex]);

      if (segments[targetIndex].isWin) {
        haptic.success();
      } else {
        haptic.warning();
      }

      setShowModal(true);
    }, 4200);
  }, [isSpinning, hasSpun, rotation, segments, SEGMENT_ANGLE]);

  const renderWheel = () => {
    return (
      <View style={styles.wheelContainer}>
        {/* Pointer */}
        <View style={styles.pointer}>
          <Ionicons name="caret-down" size={36} color={colors.error} />
        </View>

        <Animated.View style={[styles.wheel, animatedStyle]}>
          {/* Wheel segments as colored sections */}
          {segments.map((segment, index) => {
            const angle = index * SEGMENT_ANGLE;
            return (
              <View
                key={index}
                style={[
                  styles.segment,
                  {
                    transform: [
                      { rotate: `${angle}deg` },
                      { translateY: -WHEEL_SIZE / 4 },
                    ],
                  },
                ]}
              >
                <View
                  style={[
                    styles.segmentInner,
                    { backgroundColor: segment.color },
                  ]}
                >
                  <Text style={styles.segmentText}>{segment.label}</Text>
                </View>
              </View>
            );
          })}

          {/* Center circle */}
          <View style={styles.centerCircle}>
            <View style={styles.centerInner} />
          </View>

          {/* Outer ring decorations */}
          {segments.map((_, index) => {
            const angle = index * SEGMENT_ANGLE;
            return (
              <View
                key={`dot-${index}`}
                style={[
                  styles.outerDot,
                  {
                    transform: [
                      { rotate: `${angle}deg` },
                      { translateY: -WHEEL_SIZE / 2 + 8 },
                    ],
                  },
                ]}
              >
                <View style={styles.dotInner} />
              </View>
            );
          })}
        </Animated.View>

        {/* Spin button overlay */}
        <TouchableOpacity
          style={[styles.spinButton, (isSpinning || hasSpun) && styles.spinButtonDisabled]}
          onPress={handleSpin}
          disabled={isSpinning || hasSpun}
          activeOpacity={0.8}
        >
          <Text style={styles.spinButtonText}>
            {isSpinning ? '...' : hasSpun ? 'DONE' : 'SPIN'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={['#F59E0B', '#F97316']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Ionicons name="gift" size={28} color={colors.white} />
          <Text style={styles.headerTitle}>Spin the wheel to win rewards!</Text>
          <Text style={styles.headerSubtitle}>One free spin every day</Text>
        </LinearGradient>

        {/* Wheel */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.white} style={{ marginTop: spacing.xl }} />
        ) : renderWheel()}

        {/* After spin message */}
        {hasSpun && (
          <View style={styles.afterSpinContainer}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.afterSpinText}>
              Come back tomorrow for another spin!
            </Text>
          </View>
        )}

        {/* Result Modal */}
        <Modal
          visible={showModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {result?.isWin ? (
                <>
                  <View style={[styles.modalIconContainer, { backgroundColor: colors.successLight }]}>
                    <Ionicons name="trophy" size={48} color={colors.success} />
                  </View>
                  <Text style={styles.modalTitle}>Congratulations!</Text>
                  <Text style={styles.modalPrize}>You won {result.label}!</Text>
                  <Text style={styles.modalSubtext}>
                    The reward has been added to your wallet.
                  </Text>
                </>
              ) : (
                <>
                  <View style={[styles.modalIconContainer, { backgroundColor: colors.warningLight }]}>
                    <Ionicons name="sad-outline" size={48} color={colors.warning} />
                  </View>
                  <Text style={styles.modalTitle}>{result?.label === 'Better\nLuck' ? 'Better Luck Next Time!' : 'Try Again!'}</Text>
                  <Text style={styles.modalSubtext}>
                    Don't worry, come back tomorrow for another chance!
                  </Text>
                </>
              )}

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    paddingTop: spacing.lg + 60,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  wheelContainer: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  pointer: {
    position: 'absolute',
    top: -16,
    zIndex: 10,
  },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    backgroundColor: colors.surfaceDark,
    borderWidth: 6,
    borderColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...shadows.xl,
  },
  segment: {
    position: 'absolute',
    width: WHEEL_SIZE * 0.35,
    height: WHEEL_SIZE * 0.35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentInner: {
    width: '100%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
  },
  centerCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
    zIndex: 5,
  },
  centerInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceDark,
    borderWidth: 3,
    borderColor: colors.primaryDark,
  },
  outerDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  spinButton: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    ...shadows.lg,
    borderWidth: 3,
    borderColor: colors.white,
  },
  spinButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  spinButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extrabold,
    color: colors.white,
    letterSpacing: 1,
  },
  afterSpinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
  },
  afterSpinText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    ...shadows.xl,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalPrize: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  modalSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  modalButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
