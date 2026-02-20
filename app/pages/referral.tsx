import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';
import { haptic } from '../../src/utils/haptics';
import { appConfigApi } from '../../src/api/content';

interface ReferralEntry {
  id: string;
  name: string;
  date: string;
  status: 'completed' | 'pending' | 'expired';
  reward: number;
}

// Referral history will be populated from API when available

function getSteps(reward: number) {
  return [
    {
      icon: 'share-social' as const,
      title: 'Share Code',
      description: 'Share your unique referral code with friends',
      color: colors.primary,
      bgColor: colors.primaryLightest,
    },
    {
      icon: 'person-add' as const,
      title: 'Friend Signs Up',
      description: 'Your friend registers using your code',
      color: colors.info,
      bgColor: colors.infoLight,
    },
    {
      icon: 'gift' as const,
      title: `Both Earn \u20B9${reward}`,
      description: `You and your friend both get \u20B9${reward} credit!`,
      color: colors.success,
      bgColor: colors.successLight,
    },
  ];
}

export default function ReferralScreen() {
  const [copied, setCopied] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(100);

  useEffect(() => {
    appConfigApi.get()
      .then((res) => {
        const config = res.data.data?.referralConfig;
        if (config?.isActive && config.referrerReward) {
          setRewardAmount(config.referrerReward);
        }
      })
      .catch(() => {});
  }, []);

  const [referralCode, setReferralCode] = useState('LOADING...');

  useEffect(() => {
    // Try to get user's actual referral code from API
    import('../../src/api/user').then(({ userApi }) => {
      userApi.getProfile().then((res) => {
        const code = res.data.data?.referralCode;
        if (code) setReferralCode(code);
        else setReferralCode(`VTECH${res.data.data?._id?.slice(-6).toUpperCase() || '0000'}`);
      }).catch(() => {
        setReferralCode('LOGIN REQUIRED');
      });
    });
  }, []);

  const handleCopyCode = async () => {
    haptic.light();
    await Clipboard.setStringAsync(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    haptic.medium();
    try {
      await Share.share({
        message: `Join V-Tech Kitchen and get \u20B9${rewardAmount} off your first order! Use my referral code: ${referralCode}\n\nShop now: https://vtechkitchen.com`,
        title: 'Invite Friends to V-Tech Kitchen',
      });
    } catch (error) {
      // User cancelled or error
    }
  };

  const STEPS = getSteps(rewardAmount);

  const [referralHistory, setReferralHistory] = useState<ReferralEntry[]>([]);
  const totalEarned = referralHistory
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + r.reward, 0);
  const successfulReferrals = referralHistory.filter(r => r.status === 'completed').length;
  const pendingReferrals = referralHistory.filter(r => r.status === 'pending').length;

  const getStatusStyle = (status: ReferralEntry['status']) => {
    switch (status) {
      case 'completed':
        return { bg: colors.successLight, text: colors.success, label: 'Earned' };
      case 'pending':
        return { bg: colors.warningLight, text: colors.warning, label: 'Pending' };
      case 'expired':
        return { bg: colors.errorLight, text: colors.error, label: 'Expired' };
    }
  };

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <LinearGradient
          colors={['#4F46E5', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerIconContainer}>
            <Ionicons name="people" size={40} color={colors.white} />
          </View>
          <Text style={styles.headerTitle}>Invite Friends, Earn Rewards</Text>
          <Text style={styles.headerSubtitle}>
            Share your referral code and both you and your friend earn \u20B9{rewardAmount}!
          </Text>
        </LinearGradient>

        {/* Referral Code */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          <View style={styles.codeRow}>
            <View style={styles.codeBox}>
              {referralCode.split('').map((char, index) => (
                <View key={index} style={styles.codeCharBox}>
                  <Text style={styles.codeChar}>{char}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.copyButton, copied && styles.copyButtonSuccess]}
              onPress={handleCopyCode}
              activeOpacity={0.7}
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={20}
                color={copied ? colors.success : colors.primary}
              />
              <Text style={[styles.copyText, copied && styles.copyTextSuccess]}>
                {copied ? 'Copied!' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.8}>
            <LinearGradient
              colors={['#4F46E5', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shareGradient}
            >
              <Ionicons name="share-social" size={20} color={colors.white} />
              <Text style={styles.shareText}>Share with Friends</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsContainer}>
            {STEPS.map((step, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={[styles.stepIconContainer, { backgroundColor: step.bgColor }]}>
                  <Ionicons name={step.icon} size={24} color={step.color} />
                </View>
                <View style={styles.stepTextContainer}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
                {index < STEPS.length - 1 && (
                  <View style={styles.stepConnector}>
                    <View style={styles.stepConnectorLine} />
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Earnings Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Earnings</Text>
          <View style={styles.earningsCard}>
            <View style={styles.earningsRow}>
              <View style={styles.earningsItem}>
                <Text style={styles.earningsValue}>\u20B9{totalEarned}</Text>
                <Text style={styles.earningsLabel}>Total Earned</Text>
              </View>
              <View style={styles.earningsDivider} />
              <View style={styles.earningsItem}>
                <Text style={styles.earningsValue}>{successfulReferrals}</Text>
                <Text style={styles.earningsLabel}>Successful</Text>
              </View>
              <View style={styles.earningsDivider} />
              <View style={styles.earningsItem}>
                <Text style={styles.earningsValue}>{pendingReferrals}</Text>
                <Text style={styles.earningsLabel}>Pending</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Referral History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Referral History</Text>
          <View style={styles.historyCard}>
            {referralHistory.length === 0 ? (
              <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                <Ionicons name="people-outline" size={40} color={colors.border} />
                <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }}>No referrals yet. Share your code to start earning!</Text>
              </View>
            ) : referralHistory.map((referral, index) => {
              const statusInfo = getStatusStyle(referral.status);
              return (
                <View
                  key={referral.id}
                  style={[
                    styles.historyItem,
                    index < referralHistory.length - 1 && styles.historyItemBorder,
                  ]}
                >
                  <View style={styles.historyAvatar}>
                    <Text style={styles.historyAvatarText}>
                      {referral.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyName}>{referral.name}</Text>
                    <Text style={styles.historyDate}>{referral.date}</Text>
                  </View>
                  <View style={styles.historyRight}>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                      <Text style={[styles.statusText, { color: statusInfo.text }]}>
                        {statusInfo.label}
                      </Text>
                    </View>
                    {referral.status === 'completed' && (
                      <Text style={styles.rewardAmount}>+\u20B9{referral.reward}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingTop: spacing.xl + 60,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
  },
  codeCard: {
    marginHorizontal: spacing.md,
    marginTop: -spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  codeLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  codeBox: {
    flexDirection: 'row',
    gap: 4,
  },
  codeCharBox: {
    width: 32,
    height: 40,
    backgroundColor: colors.primaryLightest,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryLighter,
  },
  codeChar: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primaryLighter,
    backgroundColor: colors.primaryLightest,
  },
  copyButtonSuccess: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  copyText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  copyTextSuccess: {
    color: colors.success,
  },
  shareButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  shareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  shareText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  stepsContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  stepIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  stepConnector: {
    position: 'absolute',
    left: 21,
    top: 44,
    width: 2,
    height: spacing.md,
  },
  stepConnectorLine: {
    flex: 1,
    backgroundColor: colors.border,
    borderRadius: 1,
  },
  earningsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningsItem: {
    flex: 1,
    alignItems: 'center',
  },
  earningsValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: 2,
  },
  earningsLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  earningsDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  historyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  historyItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  historyAvatarText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  rewardAmount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
});
