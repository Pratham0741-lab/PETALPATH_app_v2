import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, typography } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '../../../store/roadmapStore';

interface CategoryHeaderProps {
  category: Category;
  index: number;
  onPress?: () => void;
}

export const CategoryHeader: React.FC<CategoryHeaderProps> = ({
  category,
  index,
  onPress,
}) => {
  const getCategoryDetails = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('prewriting')) {
      return { color: '#EC4899', icon: 'pencil' }; // Pink
    } else if (lower.includes('shape')) {
      return { color: '#3B82F6', icon: 'shapes' }; // Blue
    } else if (lower.includes('alpha') || lower.includes('letter')) {
      return { color: '#10B981', icon: 'text' }; // Green
    } else if (lower.includes('num')) {
      return { color: '#F97316', icon: 'keypad' }; // Orange
    } else if (lower.includes('word')) {
      return { color: '#8A5CF6', icon: 'book' }; // Purple
    }
    return { color: '#06B6D4', icon: 'reader' }; // Cyan (Reading Readiness)
  };

  const { color } = getCategoryDetails(category.title);

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      style={styles.headerCard}
    >
      {/* Sequence Number Circle */}
      <View style={[styles.numberCircle, { backgroundColor: color }]}>
        <Text style={styles.numberText}>{index}</Text>
      </View>

      {/* Info Details */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>{category.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {category.description || 'Fun bedtime activities!'}
        </Text>

        <View style={styles.detailsRow}>
          <View style={styles.badge}>
            <Ionicons name="checkbox-outline" size={12} color={colors.textMuted} />
            <Text style={styles.badgeText}>
              {category.lessonsCompleted}/{category.lessonsCount} Completed
            </Text>
          </View>
          <View style={[styles.badge, styles.starsBadge]}>
            <Ionicons name="star" size={12} color={colors.yellow} />
            <Text style={[styles.badgeText, styles.starsText]}>
              {category.stars} Stars
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  numberCircle: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  numberText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: 2,
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    lineHeight: 16,
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E234D',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    gap: 3,
  },
  badgeText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  starsBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
  },
  starsText: {
    color: colors.yellow,
  },
});
