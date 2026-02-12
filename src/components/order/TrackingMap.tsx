import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';

interface TrackingMapProps {
  trackingId?: string;
  trackingUrl?: string;
  provider?: string;
  status: string;
}

const STATUS_LOCATIONS: Record<string, { label: string; progress: number }> = {
  pending: { label: 'Order placed', progress: 0.1 },
  confirmed: { label: 'Order confirmed', progress: 0.2 },
  processing: { label: 'Being packed at warehouse', progress: 0.35 },
  shipped: { label: 'In transit to your city', progress: 0.6 },
  delivered: { label: 'Delivered!', progress: 1 },
};

export default function TrackingMap({ trackingId, trackingUrl, provider, status }: TrackingMapProps) {
  const location = STATUS_LOCATIONS[status] || STATUS_LOCATIONS.pending;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="navigate" size={18} color={colors.primary} />
        <Text style={styles.title}>Live Tracking</Text>
      </View>

      {/* Simulated Map */}
      <View style={styles.mapPlaceholder}>
        <View style={styles.mapRoute}>
          <View style={[styles.mapProgress, { width: `${location.progress * 100}%` }]} />
        </View>
        {/* Warehouse */}
        <View style={[styles.mapPoint, { left: '5%' }]}>
          <Ionicons name="cube" size={18} color={location.progress >= 0.2 ? colors.success : colors.textSecondary} />
        </View>
        {/* Transit */}
        <View style={[styles.mapPoint, { left: '45%' }]}>
          <Ionicons name="car" size={18} color={location.progress >= 0.5 ? colors.success : colors.textSecondary} />
        </View>
        {/* Destination */}
        <View style={[styles.mapPoint, { right: '5%' }]}>
          <Ionicons name="home" size={18} color={location.progress >= 1 ? colors.success : colors.textSecondary} />
        </View>
        {/* Moving indicator */}
        {location.progress < 1 && (
          <View style={[styles.movingDot, { left: `${location.progress * 90 + 5}%` }]}>
            <Ionicons name="location" size={22} color={colors.primary} />
          </View>
        )}
      </View>

      <Text style={styles.statusLabel}>{location.label}</Text>

      {/* Tracking Details */}
      {(trackingId || provider) && (
        <View style={styles.detailsRow}>
          {provider && (
            <View style={styles.detailBadge}>
              <Text style={styles.detailText}>Via {provider}</Text>
            </View>
          )}
          {trackingId && (
            <View style={styles.detailBadge}>
              <Text style={styles.detailText}>ID: {trackingId}</Text>
            </View>
          )}
        </View>
      )}

      {trackingUrl && (
        <TouchableOpacity
          style={styles.trackBtn}
          onPress={() => Linking.openURL(trackingUrl)}
        >
          <Ionicons name="open-outline" size={14} color={colors.primary} />
          <Text style={styles.trackBtnText}>Track on {provider || 'carrier'} website</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, ...shadows.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  mapPlaceholder: {
    height: 80,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  mapRoute: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    height: 4,
    backgroundColor: colors.surfaceDark,
    borderRadius: 2,
  },
  mapProgress: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 2,
  },
  mapPoint: { position: 'absolute', top: '50%', marginTop: -12 },
  movingDot: { position: 'absolute', top: '25%' },
  statusLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, textAlign: 'center', marginTop: spacing.sm },
  detailsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm },
  detailBadge: { backgroundColor: colors.surfaceDark, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  detailText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  trackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.primaryLighter, borderRadius: borderRadius.lg },
  trackBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
});
