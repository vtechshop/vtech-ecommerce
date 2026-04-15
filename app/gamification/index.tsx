import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';
import { haptic } from '../../src/utils/haptics';
import { userApi } from '../../src/api/user';

interface GameCard {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  reward: string;
  gradient: readonly [string, string, ...string[]];
  route?: string;
}

const GAME_CARDS: GameCard[] = [
  {
    id: 'quiz',
    title: 'Daily Quiz',
    description: 'Answer 5 questions and win coins! New quiz every day.',
    icon: 'help-circle',
    reward: 'Win up to 50 coins',
    gradient: ['#4F46E5', '#7C3AED'],
    route: '/gamification/quiz',
  },
  {
    id: 'spin',
    title: 'Spin & Win',
    description: 'Spin the wheel for a chance to win exciting rewards!',
    icon: 'sync-circle',
    reward: 'Win up to \u20B9100',
    gradient: ['#F59E0B', '#F97316'],
    route: '/gamification/spin',
  },
];

export default function GamificationScreen() {
  const router = useRouter();
  const [coins, setCoins] = useState<number | null>(null);
  const [streakDays, setStreakDays] = useState(0);

  useEffect(() => {
    userApi.getLoyaltyAccount()
      .then((res) => {
        const data = res.data.data as any;
        if (data?.balance != null) setCoins(data.balance);
        if (data?.streakDays != null) setStreakDays(data.streakDays);
      })
      .catch(() => {});
  }, []);

  const handleCardPress = (card: GameCard) => {
    haptic.medium();
    if (card.route) {
      router.push(card.route as any);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Banner */}
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <View style={styles.bannerContent}>
          <View style={styles.bannerIcon}>
            <Ionicons name="trophy" size={28} color={colors.secondary} />
          </View>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Complete daily challenges!</Text>
            <Text style={styles.bannerSubtitle}>Earn V-Tech coins and redeem for discounts</Text>
          </View>
        </View>
        <View style={styles.coinBadge}>
          <Ionicons name="diamond" size={16} color={colors.secondary} />
          <Text style={styles.coinText}>{coins != null ? `${coins} coins` : '-- coins'}</Text>
        </View>
      </LinearGradient>

      {/* Game Cards */}
      <View style={styles.cardsContainer}>
        {GAME_CARDS.map((card) => (
          <TouchableOpacity
            key={card.id}
            activeOpacity={0.85}
            onPress={() => handleCardPress(card)}
          >
            <LinearGradient
              colors={card.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardIconContainer}>
                  <Ionicons name={card.icon} size={32} color={colors.white} />
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
              </View>

              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardDescription}>{card.description}</Text>

              <View style={styles.rewardContainer}>
                <Ionicons name="diamond" size={14} color={colors.secondary} />
                <Text style={styles.rewardText}>{card.reward}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      {/* Daily Streak */}
      <View style={styles.streakCard}>
        <View style={styles.streakHeader}>
          <Ionicons name="flame" size={24} color={colors.error} />
          <Text style={styles.streakTitle}>Daily Streak</Text>
        </View>
        <View style={styles.streakDays}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
            <View key={day} style={styles.streakDayItem}>
              <View
                style={[
                  styles.streakDot,
                  index < streakDays && styles.streakDotCompleted,
                  index === streakDays && styles.streakDotCurrent,
                ]}
              >
                {index < streakDays && <Ionicons name="checkmark" size={12} color={colors.white} />}
              </View>
              <Text style={[styles.streakDayText, index === streakDays && styles.streakDayTextCurrent]}>
                {day}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.streakInfo}>
          {streakDays > 0 ? `${streakDays}-day streak! Keep going for bonus rewards.` : 'Start your streak today!'}
        </Text>
      </View>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  banner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
    gap: 6,
  },
  coinText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  cardsContainer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    minHeight: 160,
    ...shadows.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardIconContainer: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  rewardText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
streakCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  streakTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  streakDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  streakDayItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  streakDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  streakDotCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  streakDotCurrent: {
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  streakDayText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  streakDayTextCurrent: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  streakInfo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
