import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { AppCard } from '../cards/AppCard';

interface Props {
  title: string;
  items: Array<{ id: string; name: string; type: 'curriculum' | 'module' | 'lesson' | 'reinforcement' }>;
  onItemPress?: (id: string, type: string) => void;
}

const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  curriculum: 'book-outline',
  module: 'cube-outline',
  lesson: 'bookmark-outline',
  reinforcement: 'refresh-outline',
};

export const RecommendationCard: React.FC<Props> = ({ title, items, onItemPress }) => {
  return (
    <AppCard>
      <Text style={styles.heading}>{title}</Text>
      {items.map((item) => (
        <Pressable
          key={item.id}
          style={({ pressed }) => [
            styles.item,
            pressed && styles.pressed,
          ]}
          onPress={() => onItemPress?.(item.id, item.type)}
        >
          <Ionicons
            name={typeIcons[item.type] || 'ellipse-outline'}
            size={20}
            color={colors.primary}
          />
          <Text style={styles.itemName}>{item.name}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      ))}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  heading: {
    fontSize: typography.sizes.sectionTitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  pressed: {
    opacity: 0.7,
  },
  itemName: {
    flex: 1,
    fontSize: typography.sizes.body,
    color: colors.text,
    marginLeft: spacing.sm,
  },
});

export default RecommendationCard;
