import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { NotificationBell } from '../notifications/NotificationBell';
import { getAvatarEmoji, getAvatarBgColor } from '../../screens/profile/ChildSelectionScreen';

interface DashboardHeaderProps {
  greeting: string;
  parentName: string;
  childName: string;
  childAvatar: string;
  onChildSwitch?: () => void;
  onNotificationPress?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  greeting,
  parentName,
  childName,
  childAvatar,
  onChildSwitch,
}) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 400;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.greetingSection}>
          <Text style={styles.greeting} accessibilityRole="header">
            {greeting}, {parentName}
          </Text>
          <Text style={styles.subtitle}>
            Here's how {childName}'s learning is going.
          </Text>
        </View>
        <NotificationBell />
      </View>

      <View style={styles.childRow}>
        <View style={[styles.avatarCircle, { backgroundColor: getAvatarBgColor(childAvatar) }]}>
          <Text style={styles.avatarEmoji}>{getAvatarEmoji(childAvatar)}</Text>
        </View>
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{childName}</Text>
          {onChildSwitch && (
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={onChildSwitch}
              accessibilityLabel="Switch child profile"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="swap-horizontal" size={isCompact ? 14 : 16} color={colors.purple} />
              <Text style={[styles.switchText, isCompact && { fontSize: typography.sizes.xs }]}>
                Switch
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingSection: {
    flex: 1,
    marginRight: spacing.md,
  },
  greeting: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  childInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  childName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchText: {
    color: colors.purple,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    marginLeft: spacing.xs,
  },
});

export default DashboardHeader;
