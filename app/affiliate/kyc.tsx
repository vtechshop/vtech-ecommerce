import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TextInput, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { affiliateApi } from '../../src/api/affiliate';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import Button from '../../src/components/ui/Button';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';
import { ROLES } from '../../src/utils/constants';

const statusConfig: Record<string, { color: string; icon: string; label: string }> = {
  pending: { color: colors.warning, icon: 'time', label: 'Pending Submission' },
  submitted: { color: colors.info, icon: 'document-text', label: 'Under Review' },
  approved: { color: colors.success, icon: 'checkmark-circle', label: 'Approved' },
  rejected: { color: colors.error, icon: 'close-circle', label: 'Rejected' },
};

export default function AffiliateKYC() {
  const { isReady, user } = useAuthGuard([ROLES.AFFILIATE, ROLES.ADMIN]);
  const [kycStatus, setKycStatus] = useState<string>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankName, setBankName] = useState('');

  const loadData = async () => {
    setError(null);
    try {
      const { data } = await affiliateApi.getKYC();
      const kyc = data.data as any;
      setKycStatus(kyc?.status || 'pending');
      if (kyc?.panNumber) setPanNumber(kyc.panNumber);
      if (kyc?.aadhaarNumber) setAadhaarNumber(kyc.aadhaarNumber);
      if (kyc?.bankDetails) {
        setAccountName(kyc.bankDetails.accountName || '');
        setAccountNumber(kyc.bankDetails.accountNumber || '');
        setIfsc(kyc.bankDetails.ifsc || '');
        setBankName(kyc.bankDetails.bankName || '');
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load KYC status');
    }
    setLoading(false);
  };

  useEffect(() => { if (isReady) loadData(); }, [isReady]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleSubmitKYC = async () => {
    if (!panNumber.trim()) {
      Alert.alert('Required', 'Please enter your PAN card number');
      return;
    }
    if (!accountNumber.trim() || !ifsc.trim() || !bankName.trim()) {
      Alert.alert('Required', 'Please fill in all bank account details');
      return;
    }

    setSubmitting(true);
    try {
      await affiliateApi.updateKYC({
        panNumber: panNumber.trim(),
        aadhaarNumber: aadhaarNumber.trim() || undefined,
        bankDetails: {
          accountName: accountName.trim() || user?.name || '',
          accountNumber: accountNumber.trim(),
          ifsc: ifsc.trim().toUpperCase(),
          bankName: bankName.trim(),
        },
      });
      Alert.alert('Success', 'KYC details submitted for review');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to submit KYC details');
    }
    setSubmitting(false);
  };

  if (!isReady || loading) return <LoadingScreen />;

  const config = statusConfig[kycStatus] || statusConfig.pending;
  const canEdit = kycStatus === 'pending' || kycStatus === 'rejected';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.statusCard}>
        <View style={[styles.iconCircle, { backgroundColor: config.color + '20' }]}>
          <Ionicons name={config.icon as any} size={48} color={config.color} />
        </View>
        <Text style={styles.statusLabel}>{config.label}</Text>
        <Text style={styles.statusDesc}>
          {kycStatus === 'pending' && 'Submit your identity and bank details to receive commission payouts.'}
          {kycStatus === 'submitted' && 'Your details are being reviewed. This usually takes 1-2 business days.'}
          {kycStatus === 'approved' && 'Your identity has been verified. You can now receive payouts.'}
          {kycStatus === 'rejected' && 'Your details were rejected. Please update and re-submit.'}
        </Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {canEdit && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Identity Details</Text>

          <Text style={styles.label}>PAN Card Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="ABCDE1234F"
            value={panNumber}
            onChangeText={setPanNumber}
            autoCapitalize="characters"
            maxLength={10}
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Aadhaar Number</Text>
          <TextInput
            style={styles.input}
            placeholder="1234 5678 9012"
            value={aadhaarNumber}
            onChangeText={setAadhaarNumber}
            keyboardType="number-pad"
            maxLength={14}
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={[styles.formTitle, { marginTop: spacing.lg }]}>Bank Account Details</Text>

          <Text style={styles.label}>Account Holder Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Full name as per bank"
            value={accountName}
            onChangeText={setAccountName}
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Account Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter account number"
            value={accountNumber}
            onChangeText={setAccountNumber}
            keyboardType="number-pad"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>IFSC Code *</Text>
          <TextInput
            style={styles.input}
            placeholder="SBIN0001234"
            value={ifsc}
            onChangeText={setIfsc}
            autoCapitalize="characters"
            maxLength={11}
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Bank Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. State Bank of India"
            value={bankName}
            onChangeText={setBankName}
            placeholderTextColor={colors.textSecondary}
          />

          <Button
            title="Submit KYC Details"
            onPress={handleSubmitKYC}
            loading={submitting}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      )}

      {kycStatus === 'approved' && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Verified Details</Text>
          {panNumber ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>PAN</Text>
              <Text style={styles.detailValue}>{panNumber}</Text>
            </View>
          ) : null}
          {bankName ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bank</Text>
              <Text style={styles.detailValue}>{bankName}</Text>
            </View>
          ) : null}
          {accountNumber ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Account</Text>
              <Text style={styles.detailValue}>****{accountNumber.slice(-4)}</Text>
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  statusCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.xl, alignItems: 'center', ...shadows.sm },
  iconCircle: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  statusLabel: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.sm },
  statusDesc: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.errorLight, padding: spacing.md, borderRadius: borderRadius.lg, marginTop: spacing.md },
  errorText: { fontSize: fontSize.sm, color: colors.error, flex: 1 },
  formCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, marginTop: spacing.md, ...shadows.sm },
  formTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.sm + 4, fontSize: fontSize.md, color: colors.text, backgroundColor: colors.surface },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  detailValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
});
