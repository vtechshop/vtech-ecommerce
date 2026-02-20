import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { appConfigApi, AppConfig } from '../../src/api/content';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';

const DEFAULT_VALUES = [
  { icon: 'diamond-outline' as const, title: 'Quality Products', description: 'Curated selection of high-quality products from trusted brands.' },
  { icon: 'rocket-outline' as const, title: 'Fast Delivery', description: 'Quick delivery across India with real-time tracking on every order.' },
  { icon: 'pricetag-outline' as const, title: 'Best Prices', description: 'Competitive pricing with regular promotions and exclusive discounts.' },
  { icon: 'headset-outline' as const, title: 'Customer Support', description: 'Dedicated support team ready to help you with any queries or concerns.' },
];

export default function AboutScreen() {
  const [about, setAbout] = useState<AppConfig['aboutPage']>({
    companyName: 'V-Tech Kitchen',
    tagline: 'Premium Kitchen Products',
    description: '',
    stats: [
      { label: 'Happy Customers', value: '1000+', icon: 'people' },
      { label: 'Products', value: '500+', icon: 'cube' },
      { label: 'Avg Rating', value: '4.8', icon: 'star' },
    ],
  });

  useEffect(() => {
    appConfigApi.get()
      .then((res) => {
        if (res.data.data?.aboutPage) {
          setAbout(res.data.data.aboutPage);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <ScrollView style={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.logoContainer}>
          <Ionicons name="leaf-outline" size={48} color={colors.white} />
        </View>
        <Text style={styles.heroTitle}>{about.companyName}</Text>
        <Text style={styles.heroSubtitle}>{about.tagline}</Text>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Who We Are</Text>
        <Text style={styles.paragraph}>
          V-Tech Kitchen is India's trusted destination for premium kitchen products and appliances. We bring together the best kitchen products from trusted brands and vendors to deliver an exceptional shopping experience.
        </Text>
        <Text style={styles.paragraph}>
          Founded with a passion for cooking and quality, we carefully curate every product in our collection to ensure it meets our high standards of durability, performance, and value for your kitchen.
        </Text>
      </View>

      {/* Our Values */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why Choose Us</Text>
        {DEFAULT_VALUES.map((value, index) => (
          <View key={index} style={styles.valueCard}>
            <View style={styles.valueIcon}>
              <Ionicons name={value.icon} size={24} color={colors.primary} />
            </View>
            <View style={styles.valueContent}>
              <Text style={styles.valueTitle}>{value.title}</Text>
              <Text style={styles.valueDesc}>{value.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Stats */}
      {about.stats.length > 0 && (
        <View style={styles.statsRow}>
          {about.stats.map((stat, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statNumber}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Website Link */}
      <TouchableOpacity style={styles.webLink} onPress={() => Linking.openURL('https://vtechkitchen.com/page/about')}>
        <Text style={styles.webLinkText}>Visit our website</Text>
        <Ionicons name="open-outline" size={16} color={colors.primary} />
      </TouchableOpacity>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: {
    backgroundColor: colors.primary,
    padding: spacing.xl,
    paddingTop: spacing.xl + 60,
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.white },
  heroSubtitle: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs },
  section: { padding: spacing.lg },
  sectionTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  paragraph: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 24, marginBottom: spacing.md },
  valueCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  valueIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  valueContent: { flex: 1 },
  valueTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: 2 },
  valueDesc: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  webLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  webLinkText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
});
