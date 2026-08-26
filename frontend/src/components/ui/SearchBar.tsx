import React from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { PetalIcon } from '../icons';
import { colors, radius, spacing, typography } from '../../theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  onSubmit,
  onClear,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.icon}>
        <PetalIcon name="search" size={20} color={colors.textSecondary} />
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        accessibilityLabel={placeholder}
      />
      {value.length > 0 && (
        <Pressable
          onPress={onClear ?? (() => onChangeText(''))}
          hitSlop={10}
          style={styles.clear}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <PetalIcon name="close" size={18} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  icon: {
    marginRight: spacing.sm,
  },
  clear: {
    padding: spacing.xs,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: typography.sizes.body,
    color: colors.textPrimary,
    fontFamily: typography.families.rounded,
    padding: 0,
  },
});

export default SearchBar;
