import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../theme';
import { useToast } from '../ui/Toast';

interface SubscribeSaveProps {
  productId: string;
  price: number;
  title: string;
}

const FREQUENCIES = [
  { label: 'Every 1 month', value: 1 },
  { label: 'Every 2 months', value: 2 },
  { label: 'Every 3 months', value: 3 },
  { label: 'Every 6 months', value: 6 },
];

const DISCOUNT_PERCENT = 5;

export default function SubscribeSave({ productId, price, title }: SubscribeSaveProps) {
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState(1);

  const discountAmount = (price * DISCOUNT_PERCENT) / 100;
  const subscriptionPrice = price - discountAmount;

  const handleSubscribe = () => {
    showToast('info', 'Coming Soon', 'Subscribe & Save will be available soon!');
  };

  return (
    <View style={styles.container}>
      {/* Header with Toggle */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="refresh-circle" size={22} color={colors.primary} />
          <Text style={styles.headerTitle}>Subscribe & Save</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          trackColor={{ false: colors.border, true: colors.primaryLighter }}
          thumbColor={enabled ? colors.primary : colors.textSecondary}
        />
      </View>

      {/* Discount Badge */}
      <View style={styles.discountBadge}>
        <Ionicons name="pricetag" size={14} color={colors.success} />
        <Text style={styles.discountText}>
          Subscribe & Save {DISCOUNT_PERCENT}%
        </Text>
      </View>

      {enabled && (
        <>
          {/* Frequency Selector */}
          <Text style={styles.frequencyLabel}>Delivery Frequency</Text>
          <View style={styles.frequencyGrid}>
            {FREQUENCIES.map((freq) => {
              const isSelected = selectedFrequency === freq.value;
              return (
                <TouchableOpacity
                  key={freq.value}
                  style={[
                    styles.frequencyOption,
                    isSelected && styles.frequencyOptionSelected,
                  ]}
                  onPress={() => setSelectedFrequency(freq.value)}
                  activeOpacity={0.7}
                >
                  <View style={styles.radioOuter}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <Text
                    style={[
                      styles.frequencyText,
                      isSelected && styles.frequencyTextSelected,
                    ]}
                  >
                    {freq.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Price Breakdown */}
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Regular Price</Text>
              <Text style={styles.originalPrice}>
                &#8377;{price.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Discount ({DISCOUNT_PERCENT}%)</Text>
              <Text style={styles.savingsText}>
                -&#8377;{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.subscriptionLabel}>Subscription Price</Text>
              <Text style={styles.subscriptionPrice}>
                &#8377;{subscriptionPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {/* Subscribe Button */}
          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={handleSubscribe}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color={colors.white} />
            <Text style={styles.subscribeButtonText}>Subscribe</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.primaryLighter,
    borderStyle: 'dashed',
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  discountText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },

  // Frequency
  frequencyLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  frequencyGrid: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  frequencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  frequencyOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLightest,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  frequencyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  frequencyTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },

  // Price
  priceSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  priceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  originalPrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  savingsText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: fontWeight.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  subscriptionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  subscriptionPrice: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },

  // Button
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  subscribeButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
