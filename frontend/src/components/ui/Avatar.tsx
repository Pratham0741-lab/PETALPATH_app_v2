import React from 'react';
import {
  StyleSheet,
  View,
  Image,
  Text,
  Pressable,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { avatarSizes } from '../../theme/avatarSizes';

type AvatarSize = keyof typeof avatarSizes;

interface AvatarProps {
  source?: ImageSourcePropType;
  name?: string;
  size?: AvatarSize;
  onPress?: () => void;
  showBadge?: boolean;
  badgeColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const getInitials = (name?: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 'md',
  onPress,
  showBadge = false,
  badgeColor = colors.success,
  style,
  accessibilityLabel,
}) => {
  const dimension = avatarSizes[size];
  const borderRadius = dimension / 2;
  const fontSize = dimension * 0.38;
  const badgeSize = dimension * 0.3;

  const content = (
    <View style={[{ width: dimension, height: dimension, borderRadius }]}>
      {source ? (
        <Image
          source={source}
          style={[
            styles.image,
            { width: dimension, height: dimension, borderRadius },
          ]}
          accessibilityRole="image"
          accessibilityLabel={accessibilityLabel ?? name ?? 'Avatar'}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: dimension,
              height: dimension,
              borderRadius,
            },
          ]}
        >
          <Text
            style={[
              styles.initials,
              { fontSize, fontFamily: typography.families.rounded },
            ]}
          >
            {getInitials(name)}
          </Text>
        </View>
      )}
      {showBadge && (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: badgeColor,
            },
          ]}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? name ?? 'Avatar'}
        style={style}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={style}>{content}</View>;
};

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  initials: {
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: colors.white,
  },
});

export default Avatar;
