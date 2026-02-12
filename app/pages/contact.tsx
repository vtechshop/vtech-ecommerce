import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { userApi } from '../../src/api/user';
import Button from '../../src/components/ui/Button';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';

const CONTACT_OPTIONS = [
  {
    icon: 'mail-outline' as const,
    title: 'Email Us',
    detail: 'support@vtechkitchen.com',
    onPress: () => Linking.openURL('mailto:support@vtechkitchen.com'),
  },
  {
    icon: 'call-outline' as const,
    title: 'Call Us',
    detail: '+91 98765 43210',
    onPress: () => Linking.openURL('tel:+919876543210'),
  },
  {
    icon: 'logo-whatsapp' as const,
    title: 'WhatsApp',
    detail: '+91 98765 43210',
    onPress: () => Linking.openURL('https://wa.me/919876543210'),
  },
  {
    icon: 'globe-outline' as const,
    title: 'Website',
    detail: 'vtechkitchen.com',
    onPress: () => Linking.openURL('https://vtechkitchen.com/page/contact'),
  },
];

export default function ContactScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setSending(true);
    try {
      await userApi.createTicket({
        subject: `Contact Form: ${name.trim()}`,
        message: `From: ${name.trim()} (${email.trim()})\n\n${message.trim()}`,
        category: 'general',
      });
      Alert.alert('Message Sent', 'Thank you for reaching out! We will get back to you within 24 hours.');
      setName('');
      setEmail('');
      setMessage('');
    } catch (e: any) {
      // Fallback: open email client if API fails (e.g., not logged in)
      const subject = encodeURIComponent(`Contact: ${name.trim()}`);
      const body = encodeURIComponent(`Name: ${name.trim()}\nEmail: ${email.trim()}\n\n${message.trim()}`);
      const mailUrl = `mailto:support@vtechkitchen.com?subject=${subject}&body=${body}`;
      Alert.alert(
        'Sending via Email',
        'We\'ll open your email app to send this message.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Email', onPress: () => Linking.openURL(mailUrl) },
        ]
      );
    }
    setSending(false);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contact Us</Text>
        <Text style={styles.headerSubtitle}>We'd love to hear from you</Text>
      </View>

      <View style={styles.optionsGrid}>
        {CONTACT_OPTIONS.map((option, index) => (
          <TouchableOpacity key={index} style={styles.optionCard} onPress={option.onPress} activeOpacity={0.7}>
            <View style={styles.optionIcon}>
              <Ionicons name={option.icon} size={24} color={colors.primary} />
            </View>
            <Text style={styles.optionTitle}>{option.title}</Text>
            <Text style={styles.optionDetail}>{option.detail}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formTitle}>Send us a Message</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="How can we help you?"
          placeholderTextColor={colors.textSecondary}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Button title="Send Message" onPress={handleSend} loading={sending} style={{ marginTop: spacing.md }} />
      </View>

      <View style={styles.hoursSection}>
        <Ionicons name="time-outline" size={20} color={colors.text} />
        <View style={{ marginLeft: spacing.sm }}>
          <Text style={styles.hoursTitle}>Business Hours</Text>
          <Text style={styles.hoursText}>Monday - Saturday: 9:00 AM - 6:00 PM</Text>
          <Text style={styles.hoursText}>Sunday: Closed</Text>
        </View>
      </View>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, padding: spacing.lg },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.white },
  headerSubtitle: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: spacing.sm },
  optionCard: {
    width: '48%',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    flexGrow: 1,
    flexBasis: '45%',
  },
  optionIcon: {
    width: 48, height: 48, borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  optionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  optionDetail: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
  formSection: { padding: spacing.lg },
  formTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.md, padding: spacing.md, fontSize: fontSize.md,
    color: colors.text, marginBottom: spacing.md,
  },
  textArea: { height: 100 },
  hoursSection: {
    flexDirection: 'row', padding: spacing.lg, marginHorizontal: spacing.md,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
  },
  hoursTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: 4 },
  hoursText: { fontSize: fontSize.sm, color: colors.textSecondary },
});
