import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { couponsApi, Coupon as ApiCoupon } from '../../src/api/content';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';
import { useToast } from '../../src/components/ui/Toast';

interface CouponDisplay {
  code: string;
  title: string;
  description: string;
  terms: string;
  category: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

const CATEGORY_ICON_MAP: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bgColor: string }> = {
  general: { icon: 'pricetag', color: colors.primary, bgColor: colors.primaryLightest },
  first_order: { icon: 'gift', color: colors.success, bgColor: colors.successLight },
  shipping: { icon: 'car', color: colors.secondary, bgColor: colors.secondaryLighter },
  festival: { icon: 'sparkles', color: colors.accent, bgColor: '#FDF2F8' },
  bundle: { icon: 'layers', color: colors.info, bgColor: colors.infoLight },
};

const CATEGORY_LABEL_MAP: Record<string, string> = {
  general: 'All Users',
  first_order: 'New User',
  shipping: 'All Users',
  festival: 'Special',
  bundle: 'All Users',
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'New User': { bg: colors.successLight, text: colors.success },
  'All Users': { bg: colors.infoLight, text: colors.info },
  'Special': { bg: '#FDF2F8', text: colors.accent },
};

function mapApiCoupon(c: ApiCoupon): CouponDisplay {
  const mapping = CATEGORY_ICON_MAP[c.category] || CATEGORY_ICON_MAP.general;
  const title = c.type === 'percentage' ? `${c.value}% Off` : `₹${c.value} Off`;
  return {
    code: c.code,
    title,
    description: c.description,
    terms: c.terms.join('. '),
    category: CATEGORY_LABEL_MAP[c.category] || 'All Users',
    icon: mapping.icon,
    color: mapping.color,
    bgColor: mapping.bgColor,
  };
}

const FALLBACK_COUPONS: CouponDisplay[] = [];

export default function CouponsScreen() {
  const { showToast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<CouponDisplay[]>(FALLBACK_COUPONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    couponsApi.getAll()
      .then((res) => {
        if (res.data.data && res.data.data.length > 0) {
          setCoupons(res.data.data.map(mapApiCoupon));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopiedCode(code);
    showToast('success', 'Code Copied!', `${code} has been copied to clipboard.`);

    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  const categories = [...new Set(coupons.map((c) => c.category))];

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

      {loading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      )}

      {!loading && coupons.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 }}>
          <Ionicons name="pricetag-outline" size={48} color={colors.textSecondary} />
          <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.md }}>No Coupons Available</Text>
          <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }}>Check back later for exciting offers and discounts.</Text>
        </View>
      )}

      {/* Coupons by Category */}
      {categories.map((category) => {
        const categoryCoupons = coupons.filter((c) => c.category === category);
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
    paddingTop: spacing.xl + 60,
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
