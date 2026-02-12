import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { userApi } from '../../../src/api/user';
import { useAppSelector } from '../../../src/store';
import LoadingScreen from '../../../src/components/ui/LoadingScreen';
import Button from '../../../src/components/ui/Button';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../../src/theme';

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAppSelector((s) => s.auth);
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const loadData = async () => {
    setError(null);
    try {
      const { data } = await userApi.getTicketById(id);
      setTicket(data.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load ticket');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await userApi.replyToTicket(id, reply.trim());
      setReply('');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to send reply');
    }
    setSending(false);
  };

  if (loading) return <LoadingScreen />;

  if (error || !ticket) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
        <Text style={styles.errorTitle}>{error || 'Ticket not found'}</Text>
        <Button title="Retry" onPress={() => { setLoading(true); loadData(); }} variant="outline" style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  // Handle both field naming conventions from backend
  const messages = ticket.replies || ticket.messages || [];

  // Build messages list with original message first
  const allMessages = [
    {
      _id: 'original',
      message: ticket.message || ticket.description || ticket.content || '',
      userId: ticket.userId || ticket.user,
      createdAt: ticket.createdAt,
    },
    ...messages,
  ];

  const status = ticket.status || 'open';
  const isClosed = status === 'closed' || status === 'resolved';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketSubject}>{ticket.subject || 'Support Ticket'}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isClosed ? colors.success : colors.warning }]} />
          <Text style={styles.ticketStatus}>{status}</Text>
        </View>
      </View>

      <FlatList
        data={allMessages}
        keyExtractor={(item, i) => item._id || String(i)}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => {
          // Determine if this message is from the current user
          const senderId = item.userId?._id || item.userId || item.user?._id || item.user;
          const isMe = senderId === user?._id || item.sender === 'customer' || item.role === 'customer';
          const msgText = item.message || item.content || item.text || item.body || '';
          const msgDate = item.createdAt || item.timestamp;

          return (
            <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
              {!isMe && (
                <Text style={styles.senderLabel}>
                  {item.sender === 'admin' ? 'Support' : item.senderName || 'Support Agent'}
                </Text>
              )}
              <Text style={[styles.messageText, isMe && styles.myMessageText]}>{msgText}</Text>
              {msgDate && (
                <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
                  {new Date(msgDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                </Text>
              )}
            </View>
          );
        }}
      />

      {!isClosed && (
        <View style={styles.inputBar}>
          <TextInput
            style={styles.replyInput}
            placeholder="Type your reply..."
            value={reply}
            onChangeText={setReply}
            multiline
            placeholderTextColor={colors.textSecondary}
          />
          <Button title="Send" onPress={handleReply} loading={sending} size="sm" disabled={!reply.trim()} />
        </View>
      )}

      {isClosed && (
        <View style={styles.closedBar}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.closedText}>This ticket has been {status}</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  errorTitle: { fontSize: fontSize.lg, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
  ticketHeader: { backgroundColor: colors.white, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  ticketSubject: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  ticketStatus: { fontSize: fontSize.sm, color: colors.textSecondary, textTransform: 'capitalize' },
  messageList: { padding: spacing.md, paddingBottom: spacing.xxl },
  messageBubble: { maxWidth: '80%', padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.md },
  myMessage: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: borderRadius.sm },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: colors.white, borderBottomLeftRadius: borderRadius.sm, ...shadows.sm },
  senderLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary, marginBottom: spacing.xs },
  messageText: { fontSize: fontSize.md, color: colors.text, lineHeight: 20 },
  myMessageText: { color: colors.white },
  messageTime: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs, alignSelf: 'flex-end' },
  myMessageTime: { color: 'rgba(255,255,255,0.7)' },
  inputBar: { flexDirection: 'row', padding: spacing.md, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'flex-end', gap: spacing.sm },
  replyInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.sm + 4, fontSize: fontSize.md, color: colors.text, maxHeight: 100 },
  closedBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.successLight },
  closedText: { fontSize: fontSize.sm, color: colors.success, fontWeight: fontWeight.semibold, textTransform: 'capitalize' },
});
