import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';

const sections = [
  {
    title: 'Return Window',
    icon: 'time-outline',
    content: 'You can return most items within 7 days of delivery. The item must be unused, in its original packaging, and with all tags attached.',
  },
  {
    title: 'Non-Returnable Items',
    icon: 'close-circle-outline',
    content: 'Certain items are not eligible for return, including: perishable goods, personalized items, intimate apparel, software with broken seals, and hazardous materials.',
  },
  {
    title: 'How to Initiate a Return',
    icon: 'arrow-undo-outline',
    content: 'Go to My Orders, select the order, and click "Return". Choose the items to return and provide a reason. Our team will review and approve your request within 24 hours.',
  },
  {
    title: 'Refund Process',
    icon: 'card-outline',
    content: 'Once we receive and inspect the returned item, we will process your refund within 5-7 business days. Refunds will be credited to your original payment method.',
  },
  {
    title: 'Shipping for Returns',
    icon: 'airplane-outline',
    content: 'Return shipping is free for defective or incorrect items. For other returns, a shipping fee of ₹99 will be deducted from your refund.',
  },
  {
    title: 'Exchanges',
    icon: 'swap-horizontal-outline',
    content: 'We currently do not offer direct exchanges. Please return the unwanted item and place a new order for the desired item.',
  },
  {
    title: 'Contact Us',
    icon: 'chatbubble-outline',
    content: 'For any return-related queries, create a support ticket from your profile or email us at vtechshop.customercare@gmail.com.',
  },
];

export default function ReturnPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Return & Refund Policy</Text>
      <Text style={styles.pageSubtitle}>We want you to be completely satisfied with your purchase.</Text>

      {sections.map((section, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name={section.icon as any} size={20} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>{section.title}</Text>
          </View>
          <Text style={styles.cardContent}>{section.content}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  pageTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  pageSubtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.lg },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  cardTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, flex: 1 },
  cardContent: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22 },
});
