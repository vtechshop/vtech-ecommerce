import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

const STEPS = [
  { key: 'pending', label: 'Order Placed', icon: 'receipt-outline' as const },
  { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle-outline' as const },
  { key: 'processing', label: 'Processing', icon: 'cog-outline' as const },
  { key: 'shipped', label: 'Shipped', icon: 'airplane-outline' as const },
  { key: 'delivered', label: 'Delivered', icon: 'checkmark-done-outline' as const },
];

const CANCELLED_STEP = { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' as const };
const RETURNED_STEP = { key: 'returned', label: 'Returned', icon: 'arrow-undo-outline' as const };

interface StatusTimelineProps {
  status: string;
  createdAt: string;
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

        const dotColor = isError
          ? colors.error
          : isCompleted
            ? colors.success
            : colors.border;

        const lineColor = index < currentIndex ? colors.success : colors.border;

        return (
          <View key={step.key} style={styles.stepRow}>
            <View style={styles.stepIndicator}>
              <View style={[styles.dot, { backgroundColor: dotColor }, isCurrent && styles.dotActive]}>
                <Ionicons
                  name={step.icon}
                  size={16}
                  color={isCompleted ? colors.white : colors.textSecondary}
                />
              </View>
              {!isLast && <View style={[styles.line, { backgroundColor: lineColor }]} />}
            </View>
            <View style={styles.stepContent}>
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
            </View>
          </View>
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
