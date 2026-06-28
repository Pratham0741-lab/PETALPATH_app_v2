import React from 'react';
import { StyleSheet, View, Text, StyleProp, ViewStyle } from 'react-native';
import { Mentor } from '../../constants/mentors';
import { colors, typography, spacing, radius } from '../../theme';
import { AppCard } from './AppCard';
import { Ionicons } from '@expo/vector-icons';

interface AvatarCardProps {
  mentor: Mentor;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  selected?: boolean;
}

export const AvatarCard: React.FC<AvatarCardProps> = ({ mentor, style, onPress, selected = false }) => {
  return (
    <AppCard
      onPress={onPress}
      outlined={selected}
      style={[
        styles.card,
        selected && { borderColor: mentor.color, borderWidth: 2 },
        style,
      ]}
    >
      <View style={styles.container}>
        <View style={[styles.avatarCircle, { backgroundColor: mentor.color }]}>
          <Ionicons name="paw" size={32} color={colors.background} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{mentor.name}</Text>
          <Text style={styles.species}>{mentor.species}</Text>
          <Text style={styles.funFact} numberOfLines={2}>
            {mentor.funFact}
          </Text>
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  species: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  funFact: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
