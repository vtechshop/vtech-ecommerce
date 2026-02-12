import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';

interface PincodeCheckerProps {
  deliveryEstimate: string;
}

export default function PincodeChecker({ deliveryEstimate }: PincodeCheckerProps) {
  const [pincode, setPincode] = useState('');
  const [checked, setChecked] = useState(false);

  const handleCheck = () => {
    if (pincode.length === 6) setChecked(true);
  };

  return (
    <View style={styles.card}>
      <View style={styles.inputRow}>
        <Ionicons name="location-outline" size={20} color={colors.primary} />
        <TextInput
          style={styles.input}
          value={pincode}
          onChangeText={(val) => { setPincode(val.replace(/[^0-9]/g, '')); setChecked(false); }}
          placeholder="Enter Pincode"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
          maxLength={6}
        />
        <TouchableOpacity
          style={[styles.checkBtn, pincode.length < 6 && styles.checkBtnDisabled]}
          onPress={handleCheck}
          disabled={pincode.length < 6}
        >
          <Text style={[styles.checkBtnText, pincode.length < 6 && styles.checkBtnTextDisabled]}>Check</Text>
        </TouchableOpacity>
      </View>
      {checked && pincode.length === 6 ? (
        <View style={styles.resultRow}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.resultText}>Delivery available to <Text style={styles.resultBold}>{pincode}</Text></Text>
        </View>
      ) : (
        <View style={styles.resultRow}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.hintText}>Enter pincode to check delivery availability</Text>
        </View>
      )}
      {checked && (
        <View style={styles.estimateRow}>
          <Ionicons name="car-outline" size={14} color={colors.info} />
          <Text style={styles.estimateText}>Estimated delivery by <Text style={{ fontWeight: fontWeight.bold }}>{deliveryEstimate}</Text></Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, ...shadows.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: { flex: 1, fontSize: fontSize.md, color: colors.text, paddingVertical: spacing.sm, borderBottomWidth: 1.5, borderBottomColor: colors.border },
  checkBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.lg },
  checkBtnDisabled: { backgroundColor: colors.surface },
  checkBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.white },
  checkBtnTextDisabled: { color: colors.textSecondary },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  resultText: { fontSize: fontSize.sm, color: colors.success },
  resultBold: { fontWeight: fontWeight.bold },
  hintText: { fontSize: fontSize.sm, color: colors.textSecondary },
  estimateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  estimateText: { fontSize: fontSize.xs, color: colors.info },
});
