import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import { Skeleton } from '../ui/Skeleton';
import { getAvatarEmoji, getAvatarBgColor } from '../../screens/profile/ChildSelectionScreen';

interface ChildItem {
  id: string;
  name: string;
  avatar: string;
}

interface ChildSwitcherProps {
  children: ChildItem[];
  activeChildId: string | null;
  loading?: boolean;
  onSwitch: (childId: string) => void;
}

export const ChildSwitcher: React.FC<ChildSwitcherProps> = ({
  children: childrenList,
  activeChildId,
  loading = false,
  onSwitch,
}) => {
  if (loading) {
    return (
      <View style={styles.skeletonRow}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.skeletonItem}>
            <Skeleton variant="circle" width={48} height={48} />
            <Skeleton width={40} height={10} style={{ marginTop: spacing.xs }} />
          </View>
        ))}
      </View>
    );
  }

  if (childrenList.length === 0) {
    return null;
  }

  if (childrenList.length === 1) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      accessibilityLabel="Child profile switcher"
    >
      {childrenList.map((child) => {
        const isActive = child.id === activeChildId;
        return (
          <TouchableOpacity
            key={child.id}
            style={[styles.item, isActive && styles.itemActive]}
            onPress={() => onSwitch(child.id)}
            accessibilityRole="button"
            accessibilityLabel={`${child.name}${isActive ? ', active' : ''}`}
            accessibilityState={{ selected: isActive }}
          >
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: getAvatarBgColor(child.avatar) },
                isActive && styles.avatarCircleActive,
              ]}
            >
              <Text style={styles.avatarEmoji}>{getAvatarEmoji(child.avatar)}</Text>
            </View>
            <Text
              style={[styles.name, isActive && styles.nameActive]}
              numberOfLines={1}
            >
              {child.name}
            </Text>
            {isActive && <View style={styles.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  skeletonItem: {
    alignItems: 'center',
    width: 64,
  },
  item: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    minWidth: 64,
  },
  itemActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.transparent,
  },
  avatarCircleActive: {
    borderColor: colors.purple,
  },
  avatarEmoji: {
    fontSize: 22,
  },
  name: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
    maxWidth: 64,
  },
  nameActive: {
    color: colors.text,
    fontWeight: typography.weights.bold,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.purple,
    marginTop: spacing.xs,
  },
});

export default ChildSwitcher;
