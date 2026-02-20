import React from 'react';
import { Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../../src/theme';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    content: `By downloading, installing, or using the V-Tech Kitchen mobile application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the app.`,
  },
  {
    title: '2. Account Registration',
    content: `• You must provide accurate and complete information when creating an account.
• You are responsible for maintaining the security of your account credentials.
• You must be at least 18 years old to create an account and make purchases.
• You are responsible for all activity that occurs under your account.`,
  },
  {
    title: '3. Products & Pricing',
    content: `• All product prices are listed in Indian Rupees (INR) and include applicable taxes unless stated otherwise.
• We reserve the right to change prices at any time without prior notice.
• Product availability is subject to stock levels and may change without notice.
• Product images are for illustration purposes and may differ slightly from the actual product.`,
  },
  {
    title: '4. Orders & Payment',
    content: `• Placing an order constitutes an offer to purchase. We reserve the right to accept or decline any order.
• Payment is processed securely through Razorpay payment gateway.
• Orders are confirmed only after successful payment processing.
• You will receive an order confirmation via email and in-app notification.`,
  },
  {
    title: '5. Shipping & Delivery',
    content: `• We deliver across India. Delivery times vary based on location and product availability.
• Shipping charges, if applicable, will be displayed at checkout before payment.
• Delivery estimates are approximate and not guaranteed.
• Risk of loss passes to you upon delivery to the shipping carrier.`,
  },
  {
    title: '6. Returns & Refunds',
    content: `• Products may be returned within 7 days of delivery if they are unused and in original packaging.
• Refunds will be processed to the original payment method within 5-7 business days after we receive the returned product.
• Certain products (perishable items, personalized items) are non-returnable.
• Return shipping costs may apply depending on the reason for return.`,
  },
  {
    title: '7. Vendor Marketplace',
    content: `• V-Tech Kitchen operates as a multi-vendor marketplace.
• Third-party vendors are responsible for the quality and fulfillment of their products.
• We facilitate the transaction but are not the direct seller for vendor products.
• Disputes with vendor products will be mediated by V-Tech Kitchen support.`,
  },
  {
    title: '8. Affiliate Program',
    content: `• Affiliates earn commissions on qualifying purchases made through their referral links.
• Commission rates and terms are subject to change.
• Fraudulent referral activity will result in account termination and forfeiture of earnings.
• Payouts are processed according to the affiliate program terms.`,
  },
  {
    title: '9. Intellectual Property',
    content: `All content in the V-Tech Kitchen app, including logos, text, images, and software, is the property of V-Tech Kitchen or its licensors and is protected by intellectual property laws.`,
  },
  {
    title: '10. Limitation of Liability',
    content: `V-Tech Kitchen shall not be liable for any indirect, incidental, or consequential damages arising from your use of the app or purchase of products. Our total liability is limited to the amount paid for the product in question.`,
  },
  {
    title: '11. Governing Law',
    content: `These Terms of Service are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Chennai, Tamil Nadu.`,
  },
  {
    title: '12. Contact',
    content: `For questions about these Terms of Service, contact us at:

Email: vtechshop.customercare@gmail.com
Phone: +91 99445 56683`,
  },
];

export default function TermsScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Terms of Service</Text>
      <Text style={styles.updated}>Last updated: February 2026</Text>
      <Text style={styles.intro}>
        Welcome to V-Tech Kitchen. These Terms of Service govern your use of our mobile application and services. Please read them carefully.
      </Text>

      {SECTIONS.map((section, index) => (
        <React.Fragment key={index}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionContent}>{section.content}</Text>
        </React.Fragment>
      ))}

      <TouchableOpacity style={styles.webLink} onPress={() => Linking.openURL('https://vtechkitchen.com/page/terms-of-service')}>
        <Text style={styles.webLinkText}>View full terms on website</Text>
        <Ionicons name="open-outline" size={16} color={colors.primary} />
      </TouchableOpacity>

      <Text style={styles.footer}>
        By using V-Tech Kitchen, you agree to these Terms of Service.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  updated: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  intro: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 24, marginBottom: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionContent: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22 },
  webLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  webLinkText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  footer: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingBottom: spacing.xxl,
  },
});
