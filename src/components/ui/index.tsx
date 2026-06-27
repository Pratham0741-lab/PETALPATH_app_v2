import React from 'react';
import { StyleSheet, View, Text, Pressable, TextInput, Image, ViewStyle, TextStyle, ImageStyle, Platform } from 'react-native';
import { colors, radius, typography, spacing, shadows } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

// ---------------------------------------------------------
// CARD COMPONENT
// ---------------------------------------------------------
export const Card: React.FC<{ children?: React.ReactNode; style?: any }> = ({ children, style }) => (
  <View style={[styles.card, style]}>
    {children}
  </View>
);

// ---------------------------------------------------------
// BUTTON COMPONENT
// ---------------------------------------------------------
export const Button: React.FC<{
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'reward' | 'danger';
  onPress?: () => void;
  style?: any;
  textStyle?: TextStyle;
  disabled?: boolean;
}> = ({ label, variant = 'primary', onPress, style, textStyle, disabled = false }) => {
  const getColors = () => {
    if (disabled) {
      return { bg: colors.border, fg: colors.textSecondary };
    }
    switch (variant) {
      case 'primary': return { bg: colors.purple, fg: '#FFF8ED' };
      case 'secondary': return { bg: colors.blue, fg: '#FFF8ED' };
      case 'success': return { bg: colors.green, fg: '#FFF8ED' };
      case 'reward': return { bg: colors.yellow, fg: colors.brown };
      case 'danger': return { bg: colors.coral, fg: '#FFF8ED' };
    }
  };
  const { bg, fg } = getColors();

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        { transform: [{ scale: pressed && !disabled ? 0.95 : 1 }] },
        style
      ]}
    >
      <Text style={[styles.buttonLabel, { color: fg, fontFamily: typography.families.rounded }, textStyle]}>
        {label}
      </Text>
    </Pressable>
  );
};

// ---------------------------------------------------------
// CHIP COMPONENT
// ---------------------------------------------------------
export const Chip: React.FC<{
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: any;
}> = ({ label, active = false, onPress, style }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.chip,
      { backgroundColor: active ? colors.blue : colors.card, borderColor: active ? colors.blue : colors.border },
      { transform: [{ scale: pressed ? 0.95 : 1 }] },
      style
    ]}
  >
    <Text style={[styles.chipText, { color: active ? '#FFF8ED' : colors.textPrimary, fontFamily: typography.families.rounded }]}>
      {label}
    </Text>
  </Pressable>
);

// ---------------------------------------------------------
// AVATAR COMPONENT
// ---------------------------------------------------------
export const Avatar: React.FC<{
  source?: string;
  size?: number;
  style?: any;
}> = ({ source, size = 56, style }) => (
  <View style={[styles.avatarContainer, { width: size, height: size, borderRadius: size / 2 }]}>
    {source ? (
      <Image source={{ uri: source }} style={[{ width: size, height: size, borderRadius: size / 2 }, style]} />
    ) : (
      <Ionicons name="person" size={size * 0.5} color={colors.textSecondary} />
    )}
  </View>
);

// ---------------------------------------------------------
// PROGRESS BAR COMPONENT
// ---------------------------------------------------------
export const ProgressBar: React.FC<{
  progress: number; // 0 to 100
  color?: string;
  style?: any;
}> = ({ progress, color = colors.blue, style }) => (
  <View style={[styles.progressTrack, style]}>
    <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, progress))}%`, backgroundColor: color }]} />
  </View>
);

// ---------------------------------------------------------
// BADGE COMPONENT
// ---------------------------------------------------------
export const Badge: React.FC<{
  label: string;
  color?: string;
  style?: any;
}> = ({ label, color = colors.purple, style }) => (
  <View style={[styles.badge, { backgroundColor: color }, style]}>
    <Text style={[styles.badgeText, { fontFamily: typography.families.rounded }]}>{label}</Text>
  </View>
);

// ---------------------------------------------------------
// STAT CARD COMPONENT
// ---------------------------------------------------------
export const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  iconColor?: string;
  style?: any;
}> = ({ title, value, icon, iconColor = colors.purple, style }) => (
  <Card style={[styles.statCard, style]}>
    <View style={[styles.statIconContainer, { backgroundColor: `${iconColor}20` }]}>
      <Ionicons name={icon as any} size={24} color={iconColor} />
    </View>
    <View style={styles.statContent}>
      <Text style={[styles.statValue, { fontFamily: typography.families.rounded }]}>{value}</Text>
      <Text style={[styles.statTitle, { fontFamily: typography.families.rounded }]}>{title}</Text>
    </View>
  </Card>
);

// ---------------------------------------------------------
// ILLUSTRATION CARD COMPONENT
// ---------------------------------------------------------
export const IllustrationCard: React.FC<{
  source?: string;
  title: string;
  subtitle?: string;
  style?: any;
}> = ({ source, title, subtitle, style }) => (
  <Card style={[styles.illustrationCard, style]}>
    <View style={styles.illPhotoContainer}>
      {source ? (
        <Image source={{ uri: source }} style={styles.illImage} />
      ) : (
        <View style={[styles.illImage, { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
        </View>
      )}
    </View>
    <Text style={[styles.illTitle, { fontFamily: typography.families.rounded }]}>{title}</Text>
    {subtitle && <Text style={[styles.illSubtitle, { fontFamily: typography.families.rounded }]}>{subtitle}</Text>}
  </Card>
);

// ---------------------------------------------------------
// SECTION HEADER COMPONENT
// ---------------------------------------------------------
export const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  style?: any;
}> = ({ title, subtitle, style }) => (
  <View style={[styles.sectionHeader, style]}>
    <Text style={[styles.sectionTitle, { fontFamily: typography.families.rounded }]}>{title}</Text>
    {subtitle && <Text style={[styles.sectionSubtitle, { fontFamily: typography.families.rounded }]}>{subtitle}</Text>}
  </View>
);

// ---------------------------------------------------------
// SEARCH BAR COMPONENT
// ---------------------------------------------------------
export const SearchBar: React.FC<{
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: any;
}> = ({ value, onChangeText, placeholder = 'Search...', style }) => (
  <View style={[styles.searchBar, style]}>
    <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      style={[styles.searchInput, { fontFamily: typography.families.rounded }]}
    />
  </View>
);

// ---------------------------------------------------------
// EMOTION CARD COMPONENT
// ---------------------------------------------------------
export const EmotionCard: React.FC<{
  emoji: string;
  label: string;
  color?: string;
  selected?: boolean;
  onPress?: () => void;
  style?: any;
}> = ({ emoji, label, color = colors.peach, selected = false, onPress, style }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.emotionCard,
      { backgroundColor: color, borderColor: selected ? colors.purple : colors.border, borderWidth: selected ? 3 : 1.5 },
      { transform: [{ scale: pressed ? 0.95 : 1 }] },
      style
    ]}
  >
    <Text style={styles.emotionEmoji}>{emoji}</Text>
    <Text style={[styles.emotionLabel, { fontFamily: typography.families.rounded }]}>{label}</Text>
  </Pressable>
);

// styles matching spacing and typography design specifications
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.md,
  },
  button: {
    height: 56,
    borderRadius: radius.button,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    ...shadows.sm,
  },
  buttonLabel: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  chip: {
    height: 40,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  progressTrack: {
    height: radius.progress,
    borderRadius: radius.progress,
    backgroundColor: colors.border,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.progress,
  },
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.chip,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#FFF8ED',
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  statTitle: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  illustrationCard: {
    borderRadius: radius.illustrationCard,
    padding: spacing.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  illPhotoContainer: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: radius.card,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  illImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  illTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  illSubtitle: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.sectionTitle,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: typography.sizes.body,
    color: colors.textPrimary,
    padding: 0, // Reset default padding in Android/web
  },
  emotionCard: {
    width: 90,
    height: 110,
    borderRadius: radius.input,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sm,
    ...shadows.sm,
  },
  emotionEmoji: {
    fontSize: 40,
    marginBottom: spacing.xs,
  },
  emotionLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
