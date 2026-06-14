import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, typography } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '../../../store/roadmapStore';

interface CategorySectionProps {
  category: Category;
  isExpanded: boolean;
  onPressHeader: () => void;
  children?: React.ReactNode;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  isExpanded,
  onPressHeader,
  children,
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

  const { color, icon } = getCategoryDetails(category.title);

  return (
    <View style={styles.sectionContainer}>
      {/* Category Header Card */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPressHeader}
        style={[
          styles.headerCard,
          { borderLeftColor: color },
          isExpanded && styles.expandedCard,
        ]}
      >
        <View style={styles.headerRow}>
          {/* Illustrated Icon */}
          <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon as any} size={28} color={color} />
          </View>

          {/* Text Information */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>{category.title}</Text>
            <Text style={styles.description} numberOfLines={2}>
              {category.description || 'Embark on a new learning adventure!'}
            </Text>

            {/* Sub-details (Progress & Stars) */}
            <View style={styles.detailsRow}>
              <View style={styles.badge}>
                <Ionicons name="checkbox-outline" size={14} color={colors.textMuted} />
                <Text style={styles.badgeText}>
                  {category.lessonsCompleted}/{category.lessonsCount} Completed
                </Text>
              </View>
              <View style={[styles.badge, styles.starsBadge]}>
                <Ionicons name="star" size={14} color={colors.yellow} />
                <Text style={[styles.badgeText, styles.starsText]}>
                  {category.stars} Stars
                </Text>
              </View>
            </View>
          </View>

          {/* Chevron Rotate Arrow */}
          <View style={styles.arrowBox}>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={colors.textMuted}
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded Roadmap Modules Content */}
      {isExpanded && <View style={styles.expandedContent}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: spacing.md,
    width: '100%',
  },
  headerCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderLeftWidth: 6,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  expandedCard: {
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    borderColor: colors.purple + '40',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: 4,
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
    marginBottom: 6,
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
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    gap: 4,
  },
  badgeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  starsBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
  },
  starsText: {
    color: colors.yellow,
  },
  arrowBox: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: spacing.xs,
  },
  expandedContent: {
    backgroundColor: 'rgba(18, 22, 58, 0.4)',
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
});
