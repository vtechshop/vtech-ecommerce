import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { usePulse } from '../../hooks/usePulse';

interface CountdownTimerProps {
  endTime: Date;
  onExpired?: () => void;
}

export default function CountdownTimer({ endTime, onExpired }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(endTime));

  useEffect(() => {
    const interval = setInterval(() => {
      const left = getTimeLeft(endTime);
      setTimeLeft(left);
      if (left.total <= 0) {
        clearInterval(interval);
        onExpired?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  if (timeLeft.total <= 0) return null;

  const isUrgent = timeLeft.total < 300000; // under 5 min
  const isCritical = timeLeft.total < 60000; // under 1 min

  return (
    <View style={styles.container}>
      <TimeBox value={timeLeft.hours} label="HRS" />
      <Text style={styles.separator}>:</Text>
      <TimeBox value={timeLeft.minutes} label="MIN" />
      <Text style={styles.separator}>:</Text>
      <AnimatedTimeBox value={timeLeft.seconds} label="SEC" pulse={isUrgent} critical={isCritical} />
    </View>
  );
}

function TimeBox({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.boxValue}>{String(value).padStart(2, '0')}</Text>
      <Text style={styles.boxLabel}>{label}</Text>
    </View>
  );
}

function AnimatedTimeBox({ value, label, pulse, critical }: {
  value: number; label: string; pulse: boolean; critical: boolean;
}) {
  const pulseStyle = usePulse({ minScale: 0.92, maxScale: 1.1, duration: 500, active: pulse });

  return (
    <Animated.View style={pulseStyle}>
      <View style={[styles.box, critical && styles.boxCritical]}>
        <Text style={styles.boxValue}>{String(value).padStart(2, '0')}</Text>
        <Text style={styles.boxLabel}>{label}</Text>
      </View>
    </Animated.View>
  );
}

function getTimeLeft(endTime: Date) {
  const total = Math.max(0, endTime.getTime() - Date.now());
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor(total / (1000 * 60 * 60));
  return { total, hours, minutes, seconds };
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  box: {
    backgroundColor: colors.text,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    minWidth: 42,
  },
  boxCritical: {
    backgroundColor: colors.error,
  },
  boxValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extrabold,
    color: colors.white,
  },
  boxLabel: {
    fontSize: 8,
    fontWeight: fontWeight.bold,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },
  separator: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
});
