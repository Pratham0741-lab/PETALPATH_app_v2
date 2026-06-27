import React from 'react';
import { StyleSheet, View, Text, ViewStyle, Pressable } from 'react-native';
import { colors, typography, spacing, radius } from '../../theme';
import { StarCounter } from '../progress/StarCounter';
import { useChildStore } from '../../store/childStore';
import { enhanceMentor } from '../../constants/mentors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface TopBarProps {
  title: string;
  showBack?: boolean;
  style?: ViewStyle;
}

export const TopBar: React.FC<TopBarProps> = ({ title, showBack = false, style }) => {
  const activeChild = useChildStore((state) => state.activeChild);
  const activeMentor = activeChild?.mentor ? enhanceMentor(activeChild.mentor) : null;
  const navigation = useNavigation<any>();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftSection}>
        {showBack ? (
          <Pressable onPress={() => navigation.canGoBack() && navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
        ) : activeMentor ? (
          <View style={[styles.mentorIndicator, { backgroundColor: activeMentor.color + '20' }]}>
            <Ionicons name="paw" size={16} color={activeMentor.color} />
            <Text style={[styles.mentorName, { color: activeMentor.color }]}>{activeMentor.name.split(' ')[0]}</Text>
          </View>
        ) : null}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={styles.rightSection}>
        <StarCounter />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 70,
    backgroundColor: colors.background,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  mentorIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginRight: spacing.md,
  },
  mentorName: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    marginLeft: spacing.xs,
    fontFamily: typography.families.rounded,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
