import React from 'react';
import { Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    content: `We collect the following types of information when you use V-Tech Kitchen:

• Personal Information: Name, email address, phone number, and shipping address when you create an account or place an order.
• Payment Information: Payment details are processed securely through Razorpay. We do not store your card details.
• Usage Data: We collect information about how you interact with our app, including pages viewed, products browsed, and search queries.
• Device Information: Device type, operating system, and app version for improving your experience.`,
  },
  {
    title: '2. How We Use Your Information',
    content: `We use the collected information to:

• Process and deliver your orders
• Manage your account and provide customer support
• Send order updates and delivery notifications
• Personalize your shopping experience with product recommendations
• Improve our app and services
• Send promotional offers (with your consent)
• Prevent fraud and ensure security`,
  },
  {
    title: '3. Information Sharing',
    content: `We may share your information with:

• Delivery Partners: Shipping address and contact details for order delivery.
• Payment Processors: Razorpay for secure payment processing.
• Vendors: Order details for fulfillment by third-party sellers on our platform.
• Legal Requirements: When required by law or to protect our rights.

We do not sell your personal information to third parties.`,
  },
  {
    title: '4. Data Security',
    content: `We implement appropriate security measures to protect your personal information, including:

• Encrypted data transmission (SSL/TLS)
• Secure token-based authentication
• Regular security audits
• Restricted access to personal data`,
  },
  {
    title: '5. Your Rights',
    content: `You have the right to:

• Access your personal information
• Update or correct your data
• Delete your account and associated data
• Opt out of marketing communications
• Request data portability

To exercise these rights, contact us at support@vtechkitchen.com.`,
  },
  {
    title: '6. Cookies & Tracking',
    content: `Our app uses analytics to understand usage patterns and improve our services. You can manage notification preferences in your account settings.`,
  },
  {
    title: '7. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or via email. Continued use of the app after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '8. Contact Us',
    content: `If you have questions about this Privacy Policy, contact us at:

Email: support@vtechkitchen.com
Phone: +91 98765 43210`,
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.updated}>Last updated: January 2025</Text>
      <Text style={styles.intro}>
        V-Tech Kitchen ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application and services.
      </Text>

      {SECTIONS.map((section, index) => (
        <React.Fragment key={index}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionContent}>{section.content}</Text>
        </React.Fragment>
      ))}

      <TouchableOpacity style={styles.webLink} onPress={() => Linking.openURL('https://vtechkitchen.com/page/privacy-policy')}>
        <Text style={styles.webLinkText}>View full policy on website</Text>
        <Ionicons name="open-outline" size={16} color={colors.primary} />
      </TouchableOpacity>

      <Text style={styles.footer}>
        By using V-Tech Kitchen, you agree to this Privacy Policy.
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
