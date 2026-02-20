import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, SectionList, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withSpring } from 'react-native-reanimated';
import { productsApi } from '../../src/api/products';
import { Category } from '../../src/types';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CategorySection {
  title: string;
  parentCategory: Category;
  data: Category[];
  isExpanded: boolean;
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  const rotation = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    rotation.value = withTiming(expanded ? 1 : 0, { duration: 200 });
  }, [expanded]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 90}deg` }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
    </Animated.View>
  );
}

function AnimatedCategoryCard({ cat, onPress }: { cat: Category; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[styles.card, animStyle]}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
    >
      {cat.image ? (
        <Image source={{ uri: cat.image }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Ionicons name="grid" size={24} color={colors.primary} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{cat.name}</Text>
      </View>
      <View style={styles.chevronCircle}>
        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
      </View>
    </AnimatedPressable>
  );
}

function AnimatedSectionHeader({ sec, childCount, onToggle, onViewAll }: {
  sec: CategorySection; childCount: number; onToggle: () => void; onViewAll: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[styles.sectionHeader, animStyle]}
      onPress={onToggle}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
    >
      <View style={styles.sectionHeaderLeft}>
        {sec.parentCategory.image ? (
          <Image source={{ uri: sec.parentCategory.image }} style={styles.sectionImage} />
        ) : (
          <View style={[styles.sectionImage, styles.sectionImagePlaceholder]}>
            <Ionicons name="grid" size={20} color={colors.white} />
          </View>
        )}
        <View>
          <Text style={styles.sectionTitle}>{sec.title}</Text>
          <Text style={styles.sectionCount}>{childCount} sub-categor{childCount === 1 ? 'y' : 'ies'}</Text>
        </View>
      </View>
      <View style={styles.sectionHeaderRight}>
        <TouchableOpacity
          style={styles.viewAllBtn}
          onPress={onViewAll}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
        <View style={styles.chevronCircle}>
          <ChevronIcon expanded={sec.isExpanded} />
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const loadCategories = async () => {
    setError(null);
    try {
      const res = await productsApi.getCategories();
      setCategories(res.data.data || []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load categories');
    }
    setLoading(false);
  };

  useEffect(() => { loadCategories(); }, []);

  const toggleSection = useCallback((parentId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  }, []);

  const { sections, standaloneCategories } = useMemo(() => {
    const parentCats = categories.filter(c => !c.parent);
    const childMap = new Map<string, Category[]>();

    categories.forEach(c => {
      if (c.parent) {
        const existing = childMap.get(c.parent) || [];
        existing.push(c);
        childMap.set(c.parent, existing);
      }
    });

    const sects: CategorySection[] = [];
    const standalone: Category[] = [];

    parentCats.forEach(parent => {
      const children = childMap.get(parent._id);
      if (children && children.length > 0) {
        const isExpanded = expandedSections.has(parent._id);
        sects.push({
          title: parent.name,
          parentCategory: parent,
          data: isExpanded ? children : [],
          isExpanded,
        });
      } else {
        standalone.push(parent);
      }
    });

    return { sections: sects, standaloneCategories: standalone };
  }, [categories, expandedSections]);

  const navigateToCategory = (cat: Category) => {
    router.push({ pathname: '/product/list' as any, params: { category: cat._id, title: cat.name } });
  };

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <View style={styles.empty}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => { setLoading(true); loadCategories(); }} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // If no parent/child hierarchy found, fall back to flat list
  if (sections.length === 0) {
    return (
      <SectionList
        style={styles.container}
        sections={[{ title: '', parentCategory: {} as Category, data: categories, isExpanded: true }]}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md }}
        renderSectionHeader={() => null}
        renderItem={({ item }) => (
          <AnimatedCategoryCard cat={item} onPress={() => navigateToCategory(item)} />
        )}
      />
    );
  }

  return (
    <SectionList
      style={styles.container}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
      sections={sections}
      keyExtractor={(item) => item._id}
      ListHeaderComponent={
        standaloneCategories.length > 0 ? (
          <View style={styles.standaloneSection}>
            {standaloneCategories.map(cat => (
              <AnimatedCategoryCard key={cat._id} cat={cat} onPress={() => navigateToCategory(cat)} />
            ))}
          </View>
        ) : null
      }
      renderSectionHeader={({ section }) => {
        const sec = section as CategorySection;
        const childCount = categories.filter(c => c.parent === sec.parentCategory._id).length;

        return (
          <AnimatedSectionHeader
            sec={sec}
            childCount={childCount}
            onToggle={() => toggleSection(sec.parentCategory._id)}
            onViewAll={() => navigateToCategory(sec.parentCategory)}
          />
        );
      }}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.subCard} onPress={() => navigateToCategory(item)}>
          <View style={styles.subConnector}>
            <View style={styles.connectorLine} />
          </View>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.subImage} />
          ) : (
            <View style={[styles.subImage, styles.subPlaceholder]}>
              <Ionicons name="ellipse" size={8} color={colors.primary} />
            </View>
          )}
          <Text style={styles.subName}>{item.name}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
      renderSectionFooter={({ section }) => {
        const sec = section as CategorySection;
        if (!sec.isExpanded) return null;
        return <View style={styles.sectionFooterSpace} />;
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // Flat list card (fallback + standalone)
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  image: { width: 50, height: 50, borderRadius: borderRadius.lg },
  placeholder: { backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: spacing.md },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLightest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Standalone section
  standaloneSection: { marginBottom: spacing.sm },
  // Section header (parent category with children)
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  sectionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionImage: { width: 40, height: 40, borderRadius: borderRadius.lg },
  sectionImagePlaceholder: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  sectionCount: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },
  viewAllBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primaryLightest,
    borderRadius: borderRadius.full,
  },
  viewAllText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },
  // Sub-category items
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingLeft: spacing.xl,
    backgroundColor: colors.surface,
    marginLeft: spacing.lg,
    marginRight: spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: colors.primaryLighter,
  },
  subConnector: { width: 16, marginRight: spacing.sm },
  connectorLine: {
    width: 12,
    height: 1,
    backgroundColor: colors.primaryLighter,
  },
  subImage: { width: 36, height: 36, borderRadius: borderRadius.md },
  subPlaceholder: { backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' },
  subName: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text, marginLeft: spacing.sm },
  sectionFooterSpace: { height: spacing.sm },
  // Error / empty
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  errorText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' as const },
  retryBtn: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.lg },
  retryText: { color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.md },
});
