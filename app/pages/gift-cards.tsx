import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';

const PREDEFINED_AMOUNTS = [250, 500, 1000, 2000, 5000];
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 2 - spacing.sm * 2) / 3;

export default function GiftCardsScreen() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [balanceCode, setBalanceCode] = useState('');

  const activeAmount = customAmount ? parseInt(customAmount, 10) : selectedAmount;

  const handleSelectAmount = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setCustomAmount(cleaned);
    if (cleaned) {
      setSelectedAmount(null);
    }
  };

  const handleBuyGiftCard = () => {
    Alert.alert('Coming Soon', 'Gift cards will be available soon!');
  };

  const handleCheckBalance = () => {
    if (!balanceCode.trim()) {
      Alert.alert('Error', 'Please enter a gift card code.');
      return;
    }
    Alert.alert('Coming Soon', 'Gift card balance check will be available soon!');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <Ionicons name="gift" size={32} color={colors.white} />
        </View>
        <Text style={styles.headerTitle}>V-Tech Gift Cards</Text>
        <Text style={styles.headerSubtitle}>
          The perfect gift for your loved ones
        </Text>
      </View>

      {/* Gift Card Preview */}
      {activeAmount && activeAmount > 0 ? (
        <View style={styles.previewContainer}>
          <LinearGradient
            colors={['#4F46E5', '#7C3AED', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.giftCardPreview}
          >
            <View style={styles.previewHeader}>
              <Ionicons name="gift" size={24} color="rgba(255,255,255,0.9)" />
              <Text style={styles.previewBrand}>V-Tech Gift Card</Text>
            </View>
            <View style={styles.previewAmountContainer}>
              <Text style={styles.previewCurrency}>&#8377;</Text>
              <Text style={styles.previewAmount}>{activeAmount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.previewFooter}>
              <Text style={styles.previewRecipient}>
                {recipientName || 'Recipient Name'}
              </Text>
              <Text style={styles.previewCode}>XXXX-XXXX-XXXX</Text>
            </View>
            {/* Decorative circles */}
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
          </LinearGradient>
        </View>
      ) : null}

      {/* Select Amount */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Amount</Text>
        <View style={styles.amountsGrid}>
          {PREDEFINED_AMOUNTS.map((amount) => {
            const isSelected = selectedAmount === amount && !customAmount;
            return (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.amountCard,
                  isSelected && styles.amountCardSelected,
                ]}
                onPress={() => handleSelectAmount(amount)}
                activeOpacity={0.7}
              >
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  </View>
                )}
                <Text style={styles.amountCurrency}>&#8377;</Text>
                <Text
                  style={[
                    styles.amountText,
                    isSelected && styles.amountTextSelected,
                  ]}
                >
                  {amount.toLocaleString('en-IN')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom Amount */}
        <View style={styles.customAmountContainer}>
          <Text style={styles.inputLabel}>Or enter custom amount</Text>
          <View style={styles.customAmountInputWrapper}>
            <Text style={styles.currencyPrefix}>&#8377;</Text>
            <TextInput
              style={styles.customAmountInput}
              placeholder="Enter amount"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={customAmount}
              onChangeText={handleCustomAmountChange}
            />
          </View>
        </View>
      </View>

      {/* Recipient Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recipient Details</Text>

        <Text style={styles.inputLabel}>Recipient Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter recipient's name"
          placeholderTextColor={colors.textSecondary}
          value={recipientName}
          onChangeText={setRecipientName}
        />

        <Text style={styles.inputLabel}>Recipient Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter recipient's email"
          placeholderTextColor={colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          value={recipientEmail}
          onChangeText={setRecipientEmail}
        />

        <Text style={styles.inputLabel}>
          Message <Text style={styles.optionalTag}>(Optional)</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.messageInput]}
          placeholder="Write a personal message..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          value={message}
          onChangeText={setMessage}
        />
      </View>

      {/* Buy Button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[
            styles.buyButton,
            (!activeAmount || activeAmount <= 0) && styles.buyButtonDisabled,
          ]}
          onPress={handleBuyGiftCard}
          activeOpacity={0.8}
          disabled={!activeAmount || activeAmount <= 0}
        >
          <Ionicons name="gift" size={20} color={colors.white} />
          <Text style={styles.buyButtonText}>Buy Gift Card</Text>
          {activeAmount && activeAmount > 0 ? (
            <Text style={styles.buyButtonAmount}>
              &#8377;{activeAmount.toLocaleString('en-IN')}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Balance Check */}
      <View style={styles.balanceSection}>
        <View style={styles.balanceHeader}>
          <Ionicons name="wallet-outline" size={22} color={colors.primary} />
          <Text style={styles.balanceSectionTitle}>Check Gift Card Balance</Text>
        </View>
        <Text style={styles.balanceDescription}>
          Enter your gift card code to check the remaining balance.
        </Text>
        <View style={styles.balanceInputRow}>
          <TextInput
            style={styles.balanceInput}
            placeholder="Enter card code (e.g. XXXX-XXXX-XXXX)"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="characters"
            value={balanceCode}
            onChangeText={setBalanceCode}
          />
          <TouchableOpacity
            style={styles.checkBalanceButton}
            onPress={handleCheckBalance}
            activeOpacity={0.8}
          >
            <Text style={styles.checkBalanceText}>Check Balance</Text>
          </TouchableOpacity>
        </View>
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
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  headerIconContainer: {
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
  },

  // Gift Card Preview
  previewContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  giftCardPreview: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    height: 190,
    justifyContent: 'space-between',
    overflow: 'hidden',
    ...shadows.lg,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewBrand: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: 'rgba(255,255,255,0.9)',
  },
  previewAmountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  previewCurrency: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginRight: 4,
  },
  previewAmount: {
    fontSize: 42,
    fontWeight: fontWeight.extrabold,
    color: colors.white,
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewRecipient: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: fontWeight.medium,
  },
  previewCode: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: fontWeight.medium,
    letterSpacing: 1,
  },
  decorCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Section
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Amounts Grid
  amountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amountCard: {
    width: CARD_WIDTH,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  amountCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLightest,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  amountCurrency: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  amountText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: 2,
  },
  amountTextSelected: {
    color: colors.primary,
  },

  // Custom Amount
  customAmountContainer: {
    marginTop: spacing.md,
  },
  customAmountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencyPrefix: {
    paddingLeft: spacing.md,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  customAmountInput: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },

  // Inputs
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  optionalTag: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.regular,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  messageInput: {
    minHeight: 80,
    paddingTop: spacing.md,
  },

  // Buy Button
  buyButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.md,
  },
  buyButtonDisabled: {
    backgroundColor: colors.border,
  },
  buyButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  buyButtonAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: 'rgba(255,255,255,0.8)',
  },

  // Balance Check
  balanceSection: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  balanceSectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  balanceDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  balanceInputRow: {
    gap: spacing.sm,
  },
  balanceInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  checkBalanceButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  checkBalanceText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
