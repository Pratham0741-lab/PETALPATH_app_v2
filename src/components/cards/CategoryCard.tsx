import React from 'react';
import { StyleSheet, View, Text, ViewStyle, StyleProp } from 'react-native';
import { colors, typography, spacing, radius } from '../../theme';
import { AppCard } from './AppCard';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '../../store/roadmapStore';

interface CategoryCardProps {
  category: Category;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onPress,
  style,
}) => {
  const getCategoryTheme = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('line')) {
      return {
        color: colors.purple,
        icon: 'git-commit-outline',
      };
    } else if (lowerTitle.includes('curve')) {
      return {
        color: colors.blue,
        icon: 'ellipse-outline',
      };
    } else if (lowerTitle.includes('shape')) {
      return {
        color: '#EC4899', // Pink
        icon: 'shapes-outline',
      };
    } else if (lowerTitle.includes('alpha') || lowerTitle.includes('letter')) {
      return {
        color: colors.green,
        icon: 'text-outline',
      };
    } else if (lowerTitle.includes('number') || lowerTitle.includes('count')) {
      return {
        color: colors.yellow,
        icon: 'keypad-outline',
      };
    }
    return {
      color: colors.purple,
      icon: 'book-outline',
    };
  };

  const { color, icon } = getCategoryTheme(category.title);

  return (
    <AppCard
      onPress={onPress}
      style={[
        styles.card,
        { borderLeftColor: color, borderLeftWidth: 6 },
        style,
      ]}
    >
      <View style={styles.container}>
        <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon as any} size={28} color={color} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>{category.title}</Text>
          {category.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {category.description}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  info: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
});
