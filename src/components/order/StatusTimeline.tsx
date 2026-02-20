import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

interface TimelineStep {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const STEPS: TimelineStep[] = [
  { key: 'pending', label: 'Order Placed', icon: 'receipt-outline' },
  { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle-outline' },
  { key: 'processing', label: 'Processing', icon: 'cog-outline' },
  { key: 'shipped', label: 'Shipped', icon: 'airplane-outline' },
  { key: 'delivered', label: 'Delivered', icon: 'checkmark-done-outline' },
];

const CANCELLED_STEP: TimelineStep = { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' };
const RETURNED_STEP: TimelineStep = { key: 'returned', label: 'Returned', icon: 'arrow-undo-outline' };

interface StatusTimelineProps {
  status: string;
  createdAt: string;
}

function AnimatedStep({
  step, index, isCompleted, isCurrent, isLast, isError, dotColor, lineColor, createdAt,
}: {
  step: TimelineStep; index: number; isCompleted: boolean; isCurrent: boolean;
  isLast: boolean; isError: boolean; dotColor: string; lineColor: string; createdAt: string;
}) {
  const dotScale = useSharedValue(0);
  const lineHeight = useSharedValue(0);
  const labelOpacity = useSharedValue(0);

  useEffect(() => {
    const delay = index * 200;
    dotScale.value = withDelay(delay, withSpring(1, { damping: 10, stiffness: 200 }));
    labelOpacity.value = withDelay(delay + 100, withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
    if (!isLast) {
      lineHeight.value = withDelay(delay + 150, withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }));
    }
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: lineHeight.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  return (
    <View style={styles.stepRow}>
      <View style={styles.stepIndicator}>
        <Animated.View style={[styles.dot, { backgroundColor: dotColor }, isCurrent && styles.dotActive, dotStyle]}>
          <Ionicons
            name={step.icon}
            size={16}
            color={isCompleted ? colors.white : colors.textSecondary}
          />
        </Animated.View>
        {!isLast && (
          <Animated.View style={[styles.line, { backgroundColor: lineColor }, lineStyle]} />
        )}
      </View>
      <Animated.View style={[styles.stepContent, labelStyle]}>
        <Text style={[
          styles.stepLabel,
          isCompleted && styles.stepLabelActive,
          isError && { color: colors.error },
        ]}>
          {step.label}
        </Text>
        {isCurrent && (
          <Text style={styles.stepDate}>
            {new Date(createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

export default function StatusTimeline({ status, createdAt }: StatusTimelineProps) {
  const isCancelled = status === 'cancelled';
  const isReturned = status === 'returned';

  let steps = [...STEPS];
  if (isCancelled) {
    const idx = steps.findIndex((s) => s.key === 'cancelled');
    if (idx === -1) steps.push(CANCELLED_STEP);
  }
  if (isReturned) {
    steps.push(RETURNED_STEP);
  }

  const currentIndex = steps.findIndex((s) => s.key === status);

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isCompleted = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === steps.length - 1;
        const isError = isCurrent && (step.key === 'cancelled' || step.key === 'returned');
        const dotColor = isError ? colors.error : isCompleted ? colors.success : colors.border;
        const lineColor = index < currentIndex ? colors.success : colors.border;

        return (
          <AnimatedStep
            key={step.key}
            step={step}
            index={index}
            isCompleted={isCompleted}
            isCurrent={isCurrent}
            isLast={isLast}
            isError={isError}
            dotColor={dotColor}
            lineColor={lineColor}
            createdAt={createdAt}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 56,
  },
  stepIndicator: {
    alignItems: 'center',
    width: 40,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotActive: {
    borderWidth: 2,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  stepContent: {
    flex: 1,
    marginLeft: spacing.md,
    paddingBottom: spacing.md,
  },
  stepLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  stepLabelActive: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  stepDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
