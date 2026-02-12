import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../theme';
import { useToast } from '../ui/Toast';

interface CustomerQAProps {
  productId: string;
}

interface QAItem {
  id: string;
  question: string;
  answer: string;
  timestamp: string;
  helpfulCount: number;
}

const SAMPLE_QAS: QAItem[] = [
  {
    id: '1',
    question: 'Is this product genuine?',
    answer: 'Yes, all products are 100% genuine with warranty.',
    timestamp: '2 weeks ago',
    helpfulCount: 24,
  },
  {
    id: '2',
    question: 'What is the return policy?',
    answer: '7-day easy returns with free pickup.',
    timestamp: '1 month ago',
    helpfulCount: 18,
  },
  {
    id: '3',
    question: 'Does it come with warranty?',
    answer: 'Yes, manufacturer warranty included.',
    timestamp: '1 month ago',
    helpfulCount: 12,
  },
];

const INITIAL_VISIBLE = 2;

export default function CustomerQA({ productId }: CustomerQAProps) {
  const { showToast } = useToast();
  const [qaItems, setQaItems] = useState<QAItem[]>(SAMPLE_QAS);
  const [showAll, setShowAll] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [helpfulIds, setHelpfulIds] = useState<Set<string>>(new Set());

  const visibleItems = showAll ? qaItems : qaItems.slice(0, INITIAL_VISIBLE);

  const handleAskQuestion = () => {
    if (!questionText.trim()) {
      showToast('warning', 'Empty Question', 'Please type your question before submitting.');
      return;
    }
    showToast('success', 'Question Submitted', 'Your question has been submitted!');
    setQuestionText('');
    setModalVisible(false);
  };

  const handleHelpful = (id: string) => {
    if (helpfulIds.has(id)) return;

    setHelpfulIds((prev) => new Set(prev).add(id));
    setQaItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, helpfulCount: item.helpfulCount + 1 } : item
      )
    );
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
          <Text style={styles.headerTitle}>Customer Questions & Answers</Text>
        </View>
        <TouchableOpacity
          style={styles.askButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.askButtonText}>Ask</Text>
        </TouchableOpacity>
      </View>

      {/* Q&A List */}
      {visibleItems.map((item) => (
        <View key={item.id} style={styles.qaItem}>
          {/* Question */}
          <View style={styles.questionRow}>
            <View style={styles.qBadge}>
              <Text style={styles.qBadgeText}>Q</Text>
            </View>
            <Text style={styles.questionText}>{item.question}</Text>
          </View>

          {/* Answer */}
          <View style={styles.answerRow}>
            <View style={styles.aBadge}>
              <Text style={styles.aBadgeText}>A</Text>
            </View>
            <View style={styles.answerContent}>
              <Text style={styles.answerText}>{item.answer}</Text>
              <View style={styles.answerMeta}>
                <Text style={styles.timestampText}>{item.timestamp}</Text>
                <TouchableOpacity
                  style={[
                    styles.helpfulButton,
                    helpfulIds.has(item.id) && styles.helpfulButtonActive,
                  ]}
                  onPress={() => handleHelpful(item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={helpfulIds.has(item.id) ? 'thumbs-up' : 'thumbs-up-outline'}
                    size={14}
                    color={helpfulIds.has(item.id) ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.helpfulText,
                      helpfulIds.has(item.id) && styles.helpfulTextActive,
                    ]}
                  >
                    Helpful ({item.helpfulCount})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      ))}

      {/* See All / Collapse Toggle */}
      {qaItems.length > INITIAL_VISIBLE && (
        <TouchableOpacity
          style={styles.seeAllButton}
          onPress={() => setShowAll(!showAll)}
          activeOpacity={0.7}
        >
          <Text style={styles.seeAllText}>
            {showAll
              ? 'Show less'
              : `See all ${qaItems.length} questions`}
          </Text>
          <Ionicons
            name={showAll ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.primary}
          />
        </TouchableOpacity>
      )}

      {/* Ask Question Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ask a Question</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setQuestionText('');
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Have a question about this product? Ask our community!
            </Text>

            <TextInput
              style={styles.questionInput}
              placeholder="Type your question here..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={questionText}
              onChangeText={setQuestionText}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setQuestionText('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  !questionText.trim() && styles.submitButtonDisabled,
                ]}
                onPress={handleAskQuestion}
                activeOpacity={0.8}
                disabled={!questionText.trim()}
              >
                <Ionicons name="send" size={16} color={colors.white} />
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.xs,
  },
  askButtonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },

  // Q&A Item
  qaItem: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  qBadge: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLightest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  questionText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    lineHeight: 20,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingLeft: spacing.xs,
  },
  aBadge: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  answerContent: {
    flex: 1,
  },
  answerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  answerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timestampText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  helpfulButtonActive: {
    backgroundColor: colors.primaryLightest,
  },
  helpfulText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  helpfulTextActive: {
    color: colors.primary,
  },

  // See All
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  seeAllText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  questionInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 100,
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    gap: spacing.sm,
  },
  submitButtonDisabled: {
    backgroundColor: colors.border,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
