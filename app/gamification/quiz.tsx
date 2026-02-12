import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';
import { haptic } from '../../src/utils/haptics';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    question: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correctIndex: 1,
  },
  {
    id: 2,
    question: 'What is the largest ocean on Earth?',
    options: ['Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Arctic Ocean'],
    correctIndex: 2,
  },
  {
    id: 3,
    question: 'Who painted the Mona Lisa?',
    options: ['Michelangelo', 'Raphael', 'Vincent van Gogh', 'Leonardo da Vinci'],
    correctIndex: 3,
  },
  {
    id: 4,
    question: 'What is the chemical symbol for Gold?',
    options: ['Go', 'Gd', 'Au', 'Ag'],
    correctIndex: 2,
  },
  {
    id: 5,
    question: 'Which country is home to the kangaroo?',
    options: ['New Zealand', 'South Africa', 'Australia', 'India'],
    correctIndex: 2,
  },
];

const TIMER_DURATION = 15;

export default function QuizScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [isFinished, setIsFinished] = useState(false);
  const [answered, setAnswered] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scorePopAnim = useRef(new Animated.Value(0)).current;

  const currentQuestion = QUESTIONS[currentIndex];

  // Timer
  useEffect(() => {
    if (isFinished || answered) return;

    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, isFinished, answered]);

  const handleTimeUp = useCallback(() => {
    haptic.warning();
    setAnswered(true);
    setTimeout(() => moveToNext(), 1500);
  }, [currentIndex]);

  const moveToNext = useCallback(() => {
    if (currentIndex >= QUESTIONS.length - 1) {
      setIsFinished(true);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setAnswered(false);
      setTimeLeft(TIMER_DURATION);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  }, [currentIndex, fadeAnim, scaleAnim]);

  const handleOptionPress = useCallback((optionIndex: number) => {
    if (answered) return;

    setSelectedOption(optionIndex);
    setAnswered(true);

    const isCorrect = optionIndex === currentQuestion.correctIndex;

    if (isCorrect) {
      haptic.success();
      setScore(prev => prev + 1);
      Animated.sequence([
        Animated.spring(scorePopAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
        Animated.timing(scorePopAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      haptic.error();
    }

    setTimeout(() => moveToNext(), 1500);
  }, [answered, currentQuestion, moveToNext, scorePopAnim]);

  const getOptionStyle = (index: number) => {
    if (!answered) return styles.option;

    if (index === currentQuestion.correctIndex) {
      return [styles.option, styles.optionCorrect];
    }
    if (index === selectedOption && index !== currentQuestion.correctIndex) {
      return [styles.option, styles.optionIncorrect];
    }
    return [styles.option, styles.optionDisabled];
  };

  const getOptionTextColor = (index: number) => {
    if (!answered) return colors.text;
    if (index === currentQuestion.correctIndex) return colors.success;
    if (index === selectedOption) return colors.error;
    return colors.textSecondary;
  };

  const getOptionIcon = (index: number): keyof typeof Ionicons.glyphMap | null => {
    if (!answered) return null;
    if (index === currentQuestion.correctIndex) return 'checkmark-circle';
    if (index === selectedOption && index !== currentQuestion.correctIndex) return 'close-circle';
    return null;
  };

  const handlePlayAgain = () => {
    haptic.medium();
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore(0);
    setTimeLeft(TIMER_DURATION);
    setIsFinished(false);
    setAnswered(false);
    scaleAnim.setValue(0);
    fadeAnim.setValue(1);
  };

  const handleShareScore = () => {
    haptic.light();
    // In a real app, would use Share API
  };

  const timerColor = timeLeft <= 5 ? colors.error : timeLeft <= 10 ? colors.warning : colors.success;
  const timerProgress = timeLeft / TIMER_DURATION;

  if (isFinished) {
    const percentage = Math.round((score / QUESTIONS.length) * 100);
    const emoji = percentage >= 80 ? 'trophy' : percentage >= 60 ? 'star' : percentage >= 40 ? 'thumbs-up' : 'refresh';
    const message =
      percentage >= 80
        ? 'Excellent! You are a quiz master!'
        : percentage >= 60
        ? 'Great job! Keep learning!'
        : percentage >= 40
        ? 'Good effort! Try again to improve.'
        : 'Keep practicing! You will get better.';

    return (
      <>
        <Stack.Screen options={{ title: 'Quiz Results' }} />
        <View style={styles.resultsContainer}>
          <Animated.View
            style={[
              styles.resultsCard,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#4F46E5', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.resultsGradient}
            >
              <View style={styles.resultsIconContainer}>
                <Ionicons name={emoji as any} size={48} color={colors.secondary} />
              </View>
              <Text style={styles.resultsScore}>{score}/{QUESTIONS.length}</Text>
              <Text style={styles.resultsPercentage}>{percentage}% correct</Text>
              <Text style={styles.resultsMessage}>{message}</Text>

              <View style={styles.coinsEarned}>
                <Ionicons name="diamond" size={18} color={colors.secondary} />
                <Text style={styles.coinsText}>+{score * 10} coins earned</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          <View style={styles.resultsActions}>
            <TouchableOpacity style={styles.playAgainButton} onPress={handlePlayAgain} activeOpacity={0.8}>
              <Ionicons name="refresh" size={20} color={colors.white} />
              <Text style={styles.playAgainText}>Play Again</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareButton} onPress={handleShareScore} activeOpacity={0.8}>
              <Ionicons name="share-social" size={20} color={colors.primary} />
              <Text style={styles.shareText}>Share Score</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Daily Quiz' }} />
      <View style={styles.container}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.questionCounter}>
              {currentIndex + 1}/{QUESTIONS.length}
            </Text>
            <Animated.View
              style={{
                transform: [
                  {
                    scale: scorePopAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.3],
                    }),
                  },
                ],
              }}
            >
              <Text style={styles.scoreLabel}>Score: {score}</Text>
            </Animated.View>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${((currentIndex + 1) / QUESTIONS.length) * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <View style={[styles.timerCircle, { borderColor: timerColor }]}>
            <Ionicons name="time-outline" size={16} color={timerColor} />
            <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}s</Text>
          </View>
          <View style={styles.timerBarBg}>
            <View
              style={[
                styles.timerBarFill,
                { width: `${timerProgress * 100}%`, backgroundColor: timerColor },
              ]}
            />
          </View>
        </View>

        {/* Question */}
        <Animated.View style={[styles.questionCard, { opacity: fadeAnim }]}>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
        </Animated.View>

        {/* Options */}
        <Animated.View style={[styles.optionsContainer, { opacity: fadeAnim }]}>
          {currentQuestion.options.map((option, index) => {
            const icon = getOptionIcon(index);
            return (
              <TouchableOpacity
                key={index}
                style={getOptionStyle(index)}
                onPress={() => handleOptionPress(index)}
                activeOpacity={0.7}
                disabled={answered}
              >
                <View style={styles.optionLetter}>
                  <Text style={styles.optionLetterText}>
                    {String.fromCharCode(65 + index)}
                  </Text>
                </View>
                <Text style={[styles.optionText, { color: getOptionTextColor(index) }]}>
                  {option}
                </Text>
                {icon && (
                  <Ionicons
                    name={icon}
                    size={22}
                    color={index === currentQuestion.correctIndex ? colors.success : colors.error}
                    style={styles.optionIcon}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  questionCounter: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  scoreLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  timerCircle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  timerText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  timerBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  questionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  questionText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    lineHeight: 28,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: spacing.sm + 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.sm,
  },
  optionCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  optionIncorrect: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  optionLetterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  optionText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  optionIcon: {
    marginLeft: spacing.sm,
  },
  // Results
  resultsContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  resultsCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.xl,
  },
  resultsGradient: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  resultsIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  resultsScore: {
    fontSize: 48,
    fontWeight: fontWeight.extrabold,
    color: colors.white,
  },
  resultsPercentage: {
    fontSize: fontSize.lg,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.sm,
  },
  resultsMessage: {
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  coinsEarned: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  coinsText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  resultsActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  playAgainButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  playAgainText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: spacing.sm,
    ...shadows.sm,
  },
  shareText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
});
