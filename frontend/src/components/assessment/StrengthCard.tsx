import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { AppCard } from '../cards/AppCard';

interface Props {
  strengths: Array<{ skillName: string; accuracy: number }>;
}

export const StrengthCard: React.FC<Props> = ({ strengths }) => {
  return (
    <AppCard>
      <Text style={styles.heading}>Strengths</Text>
      {strengths.map((item, index) => (
        <View key={index} style={styles.item}>
          <Ionicons name="checkmark-circle" size={20} color={colors.green} />
          <Text style={styles.skillName}>{item.skillName}</Text>
          <Text style={styles.accuracy}>{Math.round(item.accuracy)}%</Text>
        </View>
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
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  skillName: {
    flex: 1,
    fontSize: typography.sizes.body,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  accuracy: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: colors.green,
  },
});

export default StrengthCard;
