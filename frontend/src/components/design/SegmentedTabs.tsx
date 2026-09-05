import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../../theme';
import { PetalIcon, PetalIconName } from '../icons';

/**
 * SegmentedTabs — the one in-page switcher (spec §28).
 *
 * Two layouts, one visual language:
 *
 *  - `fit` divides the row equally inside an enclosed track. Right for two or
 *    three short labels — My Rewards' Stickers/Badges pair.
 *  - `scroll` lays the items out as pills in a horizontal scroller, so four or
 *    more of them — or long ones like "Balance & Focus" — keep their whole
 *    label at 360px instead of being squeezed or clipped (§27).
 *
 * Selection is purple in both (§3, where purple means "selected"), and is never
 * signalled by colour alone (§30): the chosen item also fills its icon, and on
 * `fit` lifts onto a white surface. Screen readers get a `tablist` of `tab`s
 * with `selected` state, so the switch is announced rather than inferred.
 */

export interface SegmentedTabItem<K extends string = string> {
  key: K;
  label: string;
  icon?: PetalIconName;
  /** Trailing counter, e.g. `"3/12"`. Spoken as "3 of 12". */
  count?: string;
}

export interface SegmentedTabsProps<K extends string = string> {
  items: SegmentedTabItem<K>[];
  selected: K;
  onSelect: (key: K) => void;
  /** Default `fit`. Use `scroll` past three items or with long labels. */
  layout?: 'fit' | 'scroll';
  /** Spoken name for the group as a whole, e.g. "Activity categories". */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedTabs<K extends string>({
  items,
  selected,
  onSelect,
  layout = 'fit',
  accessibilityLabel,
  style,
}: SegmentedTabsProps<K>) {
  const tabs = items.map((item) => (
    <Tab
      key={item.key}
      item={item}
      layout={layout}
      selected={item.key === selected}
      onPress={() => onSelect(item.key)}
    />
  ));

  if (layout === 'scroll') {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}
        style={[styles.scroller, style]}
        accessibilityRole="tablist"
        accessibilityLabel={accessibilityLabel}
      >
        {tabs}
      </ScrollView>
    );
  }

  return (
    <View
      style={[styles.track, style]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {tabs}
    </View>
  );
}

const Tab = <K extends string>({
  item,
  layout,
  selected,
  onPress,
}: {
  item: SegmentedTabItem<K>;
  layout: 'fit' | 'scroll';
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="tab"
    accessibilityState={{ selected }}
    accessibilityLabel={
      item.count ? `${item.label}, ${item.count.replace('/', ' of ')}` : item.label
    }
    style={({ pressed }) => [
      styles.tab,
      layout === 'fit' ? styles.tabFit : styles.tabPill,
      selected && (layout === 'fit' ? styles.tabFitSelected : styles.tabPillSelected),
      pressed && styles.pressed,
    ]}
  >
    {item.icon ? (
      <PetalIcon
        name={item.icon}
        size={17}
        color={selected ? colors.purple : colors.textSecondary}
        filled={selected}
      />
    ) : null}
    <Text
      style={[typography.presets.caption, styles.label, selected && styles.labelSelected]}
      numberOfLines={1}
    >
      {item.count ? `${item.label} ${item.count}` : item.label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  /* `fit`: one enclosed track, equal shares. */
  track: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
  },
  /* `scroll`: free-standing pills. `flexGrow: 0` stops the scroller from
     stretching to fill a column with `gap`. */
  scroller: {
    flexGrow: 0,
  },
  scrollRow: {
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    /* Comfortably past the 44px minimum touch target (§30). */
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  tabFit: {
    flexGrow: 1,
    flexShrink: 1,
    borderRadius: radius.button,
  },
  tabFitSelected: {
    backgroundColor: colors.surfaceTranslucent,
    ...shadows.sm,
  },
  tabPill: {
    paddingHorizontal: spacing.md,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTranslucent,
  },
  tabPillSelected: {
    borderWidth: 2,
    borderColor: colors.purple,
    backgroundColor: colors.secondaryLight,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    color: colors.textSecondary,
    flexShrink: 1,
  },
  labelSelected: {
    color: colors.purple,
  },
});

export default SegmentedTabs;
