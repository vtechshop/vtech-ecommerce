import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  author: string;
  category: string;
}

const BLOG_POSTS: BlogPost[] = [
  {
    id: '1',
    title: '10 Must-Have Kitchen Gadgets for 2025',
    excerpt: 'Discover the essential kitchen gadgets that will transform your cooking experience and make meal prep a breeze.',
    image: '',
    date: 'Jan 15, 2025',
    author: 'V-Tech Team',
    category: 'Kitchen Tips',
  },
  {
    id: '2',
    title: 'How to Choose the Right Cookware',
    excerpt: 'A comprehensive guide to selecting the perfect cookware for your kitchen based on your cooking style and needs.',
    image: '',
    date: 'Jan 10, 2025',
    author: 'V-Tech Team',
    category: 'Buying Guide',
  },
  {
    id: '3',
    title: 'Maintaining Your Kitchen Appliances',
    excerpt: 'Simple tips and tricks to extend the life of your kitchen appliances and keep them running efficiently.',
    image: '',
    date: 'Jan 5, 2025',
    author: 'V-Tech Team',
    category: 'Maintenance',
  },
  {
    id: '4',
    title: 'Top 5 Healthy Cooking Techniques',
    excerpt: 'Learn about cooking techniques that help retain nutrients and make your meals healthier without sacrificing taste.',
    image: '',
    date: 'Dec 28, 2024',
    author: 'V-Tech Team',
    category: 'Health & Cooking',
  },
];

export default function BlogScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Future: fetch blog posts from API
    setTimeout(() => setRefreshing(false), 1000);
  };

  const openWebBlog = () => {
    Linking.openURL('https://vtechkitchen.com/blog');
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>V-Tech Kitchen Blog</Text>
        <Text style={styles.headerSubtitle}>Tips, guides, and news from the kitchen world</Text>
      </View>

      {BLOG_POSTS.map((post) => (
        <TouchableOpacity key={post.id} style={styles.card} onPress={openWebBlog} activeOpacity={0.7}>
          <View style={styles.imagePlaceholder}>
            <Ionicons name="newspaper-outline" size={40} color={colors.textSecondary} />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{post.category}</Text>
            </View>
            <Text style={styles.cardTitle}>{post.title}</Text>
            <Text style={styles.cardExcerpt} numberOfLines={2}>{post.excerpt}</Text>
            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>{post.author}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{post.date}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.webLink} onPress={openWebBlog}>
        <Text style={styles.webLinkText}>View more on vtechkitchen.com</Text>
        <Ionicons name="open-outline" size={16} color={colors.primary} />
      </TouchableOpacity>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.primary,
  },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.white },
  headerSubtitle: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs },
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imagePlaceholder: {
    height: 150,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { padding: spacing.md },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  categoryText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600' },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  cardExcerpt: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  metaText: { fontSize: fontSize.xs, color: colors.textSecondary },
  metaDot: { fontSize: fontSize.xs, color: colors.textSecondary, marginHorizontal: spacing.xs },
  webLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  webLinkText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
});
