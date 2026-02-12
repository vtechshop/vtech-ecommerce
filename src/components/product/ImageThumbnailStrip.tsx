import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';

interface ImageThumbnailStripProps {
  images: string[];
  activeIndex: number;
  onThumbnailPress: (index: number) => void;
  videoUrl?: string;
  onVideoPress?: () => void;
}

export default function ImageThumbnailStrip({ images, activeIndex, onThumbnailPress, videoUrl, onVideoPress }: ImageThumbnailStripProps) {
  if (images.length <= 1 && !videoUrl) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {images.map((uri, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.thumb, activeIndex === index && styles.thumbActive]}
          onPress={() => onThumbnailPress(index)}
          activeOpacity={0.7}
        >
          <Image source={{ uri }} style={styles.thumbImage} contentFit="cover" />
        </TouchableOpacity>
      ))}
      {videoUrl && (
        <TouchableOpacity style={styles.videoThumb} onPress={onVideoPress} activeOpacity={0.7}>
          <View style={styles.videoOverlay}>
            <Ionicons name="play-circle" size={24} color={colors.white} />
            <Text style={styles.videoLabel}>Video</Text>
          </View>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: spacing.sm },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  thumbActive: { borderColor: colors.primary },
  thumbImage: { width: '100%', height: '100%' },
  videoThumb: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.text,
  },
  videoOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  videoLabel: { fontSize: 9, fontWeight: fontWeight.bold, color: colors.white, marginTop: 2 },
});
