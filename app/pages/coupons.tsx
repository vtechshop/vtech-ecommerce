import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';
import { useToast } from '../../src/components/ui/Toast';

type CouponCategory = 'New User' | 'All Users' | 'Special';

interface Coupon {
  code: string;
  title: string;
  description: string;
  terms: string;
  category: CouponCategory;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

const COUPONS: Coupon[] = [
  {
    code: 'SAVE10',
    title: '10% Off',
    description: 'Get 10% off on your next purchase. Valid on all products above ₹500.',
    terms: 'Min. order ₹500. Max discount ₹200. Valid once per user.',
    category: 'All Users',
    icon: 'pricetag',
    color: colors.primary,
    bgColor: colors.primaryLightest,
  },
  {
    code: 'FIRST50',
    title: '₹50 Off First Order',
    description: 'Flat ₹50 off on your very first order. Welcome to V-Tech!',
    terms: 'Valid for new users only. No minimum order value.',
    category: 'New User',
    icon: 'gift',
    color: colors.success,
    bgColor: colors.successLight,
  },
  {
    code: 'BUNDLE20',
    title: '20% Off on 3+ Items',
    description: 'Buy 3 or more items and get 20% off the entire order.',
    terms: 'Add 3+ items to cart. Max discount ₹500. Cannot be combined.',
    category: 'All Users',
    icon: 'layers',
    color: colors.info,
    bgColor: colors.infoLight,
  },
  {
    code: 'FREESHIP',
    title: 'Free Shipping',
    description: 'Enjoy free shipping on any order. No minimum purchase required.',
    terms: 'Valid on standard delivery. Not valid for express shipping.',
    category: 'All Users',
    icon: 'car',
    color: colors.secondary,
    bgColor: colors.secondaryLighter,
  },
  {
    code: 'FESTIVE15',
    title: '15% Off Festival Sale',
    description: 'Celebrate with 15% off during our special festival sale event.',
    terms: 'Valid during festival period only. Max discount ₹300.',
    category: 'Special',
    icon: 'sparkles',
    color: colors.accent,
    bgColor: '#FDF2F8',
  },
];

const CATEGORY_COLORS: Record<CouponCategory, { bg: string; text: string }> = {
  'New User': { bg: colors.successLight, text: colors.success },
  'All Users': { bg: colors.infoLight, text: colors.info },
  'Special': { bg: '#FDF2F8', text: colors.accent },
};

export default function CouponsScreen() {
  const { showToast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    setCopiedCode(code);
    showToast('success', 'Code Copied!', `${code} has been copied to clipboard.`);

    // Reset the copied state after 2 seconds
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  const categories = ['All Users', 'New User', 'Special'] as CouponCategory[];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Banner */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="ticket" size={32} color={colors.white} />
        </View>
        <Text style={styles.headerTitle}>Your Coupons</Text>
        <Text style={styles.headerSubtitle}>
          Apply these codes at checkout to save big!
        </Text>
      </View>

      {/* Coupons by Category */}
      {categories.map((category) => {
        const categoryCoupons = COUPONS.filter((c) => c.category === category);
        if (categoryCoupons.length === 0) return null;

        return (
          <View key={category} style={styles.section}>
            <View style={styles.categoryHeader}>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: CATEGORY_COLORS[category].bg },
                ]}
              >
                <Text
                  style={[
                    styles.categoryBadgeText,
                    { color: CATEGORY_COLORS[category].text },
                  ]}
                >
                  {category}
                </Text>
              </View>
            </View>

            {categoryCoupons.map((coupon) => {
              const isCopied = copiedCode === coupon.code;

              return (
                <View key={coupon.code} style={styles.couponCard}>
                  {/* Left accent strip */}
                  <View
                    style={[styles.couponAccent, { backgroundColor: coupon.color }]}
                  />

                  <View style={styles.couponBody}>
                    {/* Top Row: Icon + Info */}
                    <View style={styles.couponTop}>
                      <View
                        style={[styles.couponIcon, { backgroundColor: coupon.bgColor }]}
                      >
                        <Ionicons name={coupon.icon} size={22} color={coupon.color} />
                      </View>
                      <View style={styles.couponInfo}>
                        <Text style={styles.couponTitle}>{coupon.title}</Text>
                        <Text style={styles.couponDesc}>{coupon.description}</Text>
                      </View>
                    </View>

                    {/* Code Box */}
                    <View style={styles.codeRow}>
                      <View style={styles.codeBox}>
                        <Text style={styles.codeText}>{coupon.code}</Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.copyBtn,
                          isCopied && styles.copyBtnCopied,
                        ]}
                        onPress={() => handleCopy(coupon.code)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isCopied ? 'checkmark' : 'copy-outline'}
                          size={16}
                          color={isCopied ? colors.white : colors.primary}
                        />
                        <Text
                          style={[
                            styles.copyBtnText,
                            isCopied && styles.copyBtnTextCopied,
                          ]}
                        >
                          {isCopied ? 'Copied!' : 'Copy Code'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Terms */}
                    <View style={styles.termsRow}>
                      <Ionicons
                        name="information-circle-outline"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.termsText}>{coupon.terms}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}

      {/* Bottom Tip */}
      <View style={styles.tipCard}>
        <Ionicons name="bulb-outline" size={20} color={colors.secondary} />
        <Text style={styles.tipText}>
          Tip: You can apply a coupon code during checkout in the payment step.
        </Text>
      </View>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.xl,
    alignItems: 'center',
    paddingBottom: spacing.xl + spacing.sm,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
  },
  categoryBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  couponCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    ...shadows.sm,
  },
  couponAccent: {
    width: 4,
  },
  couponBody: {
    flex: 1,
    padding: spacing.md,
  },
  couponTop: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  couponIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  couponInfo: {
    flex: 1,
  },
  couponTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 2,
  },
  couponDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  codeBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  codeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    letterSpacing: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLightest,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  copyBtnCopied: {
    backgroundColor: colors.success,
  },
  copyBtnText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  copyBtnTextCopied: {
    color: colors.white,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  termsText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondaryLighter,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
});
