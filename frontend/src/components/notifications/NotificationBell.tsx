/**
 * NotificationBell — bell + unread badge, opens the notification centre.
 *
 * Redesign notes (§7, §30): the Ionicons bell is the `notifications` glyph, and
 * the badge sits on `colors.error` with white text rather than `coral`, which
 * did not clear contrast for a two-digit count at 10px. The count is also
 * bigger (11px, black weight) and the whole control now has a 44px touch
 * target — it used to be a 24px icon with 4px of padding, well under the
 * minimum, which made it a genuinely hard thing for a child to hit.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { colors, radius, typography, MIN_TOUCH_TARGET } from '../../theme';
import { PetalIcon } from '../icons';
import { useUnreadCount } from '../../hooks/useNotifications';

interface NotificationBellProps {
  color?: string;
  size?: number;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  color = colors.text,
  size = 24,
}) => {
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const { data } = useUnreadCount();
  const count = data?.data?.unreadCount ?? 0;

  return (
    <Pressable
      onPress={() => navigation.navigate('NotificationCenter')}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      accessibilityLabel={
        count > 0
          ? `Notifications, ${count} unread`
          : 'Notifications, none unread'
      }
      accessibilityRole="button"
      testID="notification-bell"
    >
      <PetalIcon name="notifications" size={size} color={color} filled={count > 0} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  badge: {
    position: 'absolute',
    // Sits on the icon's top-right corner, not the padded box's.
    top: 4,
    right: 2,
    minWidth: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: typography.families.rounded,
    color: colors.white,
    fontSize: 11,
    fontWeight: typography.weights.black,
  },
});

export default NotificationBell;
