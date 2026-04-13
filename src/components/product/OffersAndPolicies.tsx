import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';

const OFFERS = [
  { icon: 'card-outline' as keyof typeof Ionicons.glyphMap, text: '10% off on HDFC Bank Cards', subtext: 'Up to ₹1,500 discount' },
  { icon: 'wallet-outline' as keyof typeof Ionicons.glyphMap, text: '5% cashback with V-Tech Wallet', subtext: 'Min order ₹499' },
  { icon: 'gift-outline' as keyof typeof Ionicons.glyphMap, text: 'Buy 2, Get 10% off', subtext: 'Use code BUNDLE10' },
];

const POLICIES = [
  { icon: 'refresh-outline' as keyof typeof Ionicons.glyphMap, label: '7 Day\nReturns' },
  { icon: 'headset-outline' as keyof typeof Ionicons.glyphMap, label: 'Customer\nSupport' },
  { icon: 'shield-checkmark-outline' as keyof typeof Ionicons.glyphMap, label: 'Secure\nPayment' },
  { icon: 'cube-outline' as keyof typeof Ionicons.glyphMap, label: 'Genuine\nProducts' },
];

export function OffersCard() {
  return (
    <View style={styles.offersCard}>
      <View style={styles.offersHeader}>
        <Ionicons name="pricetag" size={16} color={colors.success} />
        <Text style={styles.offersTitle}>Available Offers</Text>
      </View>
      {OFFERS.map((offer, i) => (
        <View key={i} style={[styles.offerRow, i < OFFERS.length - 1 && styles.offerBorder]}>
          <View style={styles.offerIcon}>
            <Ionicons name={offer.icon} size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.offerText}>{offer.text}</Text>
            <Text style={styles.offerSubtext}>{offer.subtext}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function ReturnPolicyBadges() {
  return (
    <View style={styles.policyCard}>
      {POLICIES.map((policy, i) => (
        <View key={i} style={styles.policyItem}>
          <View style={styles.policyIcon}>
            <Ionicons name={policy.icon} size={22} color={colors.primary} />
          </View>
          <Text style={styles.policyLabel}>{policy.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Offers
  offersCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, ...shadows.sm },
  offersHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  offersTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  offerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  offerBorder: { borderBottomWidth: 1, borderBottomColor: colors.surfaceDark },
  offerIcon: { width: 32, height: 32, borderRadius: borderRadius.lg, backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' },
  offerText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  offerSubtext: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },
  // Policies
  policyCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-around',
  },
  policyItem: { alignItems: 'center', flex: 1 },
  policyIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' },
  policyLabel: { fontSize: 10, fontWeight: fontWeight.semibold, color: colors.text, textAlign: 'center', marginTop: spacing.xs, lineHeight: 14 },
});
