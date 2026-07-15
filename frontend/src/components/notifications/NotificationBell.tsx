import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useUnreadCount } from '../../hooks/useNotifications';
import { colors, radius, spacing } from '../../theme';

interface NotificationBellProps {
  color?: string;
  size?: number;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ color = colors.text, size = 24 }) => {
  const navigation = useNavigation<any>();
  const { data } = useUnreadCount();
  const count = data?.data?.unreadCount ?? 0;

  return (
    <Pressable
      onPress={() => navigation.navigate('NotificationCenter')}
      style={styles.container}
      accessibilityLabel={`Notifications, ${count} unread`}
      accessibilityRole="button"
    >
      <Ionicons name="notifications-outline" size={size} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: radius.full,
    backgroundColor: colors.coral,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF8ED',
    fontSize: 10,
    fontWeight: '700',
  },
});
