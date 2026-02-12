import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

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

  return (
    <View style={styles.container}>
      <TimeBox value={timeLeft.hours} label="HRS" />
      <Text style={styles.separator}>:</Text>
      <TimeBox value={timeLeft.minutes} label="MIN" />
      <Text style={styles.separator}>:</Text>
      <TimeBox value={timeLeft.seconds} label="SEC" />
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
