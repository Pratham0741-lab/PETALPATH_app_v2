/**
 * Shared Completion Modal — PetalPath Core UI
 * Universal activity completion screen showing score, stars, completion time, and continue button.
 */

import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../theme/ThemeContext';

export interface CompletionModalProps {
  visible: boolean;
  title?: string;
  score: number;
  stars: number;
  completionTimeMs?: number;
  onContinue: () => void;
  onRetry?: () => void;
}

export const CompletionModal: React.FC<CompletionModalProps> = ({
  visible,
  title = 'Great Job!',
  score,
  stars,
  completionTimeMs,
  onContinue,
  onRetry,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const durationSeconds = completionTimeMs ? Math.round(completionTimeMs / 1000) : 0;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.starRow}>
            {[1, 2, 3].map((starIndex) => (
              <Ionicons
                key={starIndex}
                name={starIndex <= stars ? 'star' : 'star-outline'}
                size={44}
                color={starIndex <= stars ? '#F59E0B' : '#CBD5E1'}
                style={styles.starIcon}
              />
            ))}
          </View>

          {durationSeconds > 0 && (
            <View style={styles.scoreBox}>
              <Text style={styles.timeText}>Time: {durationSeconds}s</Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            {onRetry && (
              <Button
                label="Retry"
                variant="outline"
                size="md"
                onPress={onRetry}
                style={styles.btn}
              />
            )}
            <Button
              label="Continue"
              variant="primary"
              size="md"
              onPress={onContinue}
              style={styles.btn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    container: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      padding: 28,
      alignItems: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 16,
    },
    starRow: {
      flexDirection: 'row',
      marginVertical: 12,
    },
    starIcon: {
      marginHorizontal: 6,
    },
    scoreBox: {
      alignItems: 'center',
      marginVertical: 16,
    },
    scoreLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    scoreValue: {
      fontSize: 32,
      fontWeight: '800',
      color: theme.colors.primary,
      marginVertical: 4,
    },
    timeText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
      width: '100%',
      justifyContent: 'center',
    },
    btn: {
      minWidth: 120,
    },
  });
