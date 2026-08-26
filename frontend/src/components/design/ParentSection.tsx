import React from 'react';
import { Pressable, StyleProp, StyleSheet, Switch, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography, cardSizes, progressSizes } from '../../theme';
import { PetalIcon, PetalIconName } from '../icons';
import { Card } from './Card';
import { SecondaryButton } from './Buttons';
import { ProgressIndicator } from './ProgressIndicator';

/**
 * ParentSection (spec §26, §28).
 *
 * The grown-up half of the app. Same tokens, same surfaces, same spacing as
 * the child-facing screens — but calmer: no illustrations, tighter type, data
 * before decoration. Destructive actions get their own component so they are
 * always unmistakably red and always ask twice.
 */

// ---------------------------------------------------------------------------
// ParentSection
// ---------------------------------------------------------------------------

export interface ParentSectionProps {
  title: string;
  subtitle?: string;
  icon?: PetalIconName;
  /** Right-aligned control in the section header, e.g. a period switcher. */
  right?: React.ReactNode;
  /** Wraps the children in a Card. Set false when the children are cards. */
  boxed?: boolean;
  children?: React.ReactNode;
  /** Small print under the section. */
  footnote?: string;
  style?: StyleProp<ViewStyle>;
}

export const ParentSection: React.FC<ParentSectionProps> = ({
  title,
  subtitle,
  icon,
  right,
  boxed = true,
  children,
  footnote,
  style,
}) => {
  const header = (
    <View style={styles.sectionHeader}>
      {icon ? (
        <View style={styles.sectionIcon}>
          <PetalIcon name={icon} size={18} color={colors.primary} />
        </View>
      ) : null}
      <View style={styles.flex}>
        <Text style={[typography.presets.section, styles.sectionTitle]} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text style={[typography.presets.subtle, styles.muted]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );

  return (
    <View style={[styles.section, style]}>
      {header}
      {boxed ? (
        <Card variant="raised" padding="normal">
          {children}
        </Card>
      ) : (
        children
      )}
      {footnote ? (
        <Text style={[typography.presets.caption, styles.footnote]}>{footnote}</Text>
      ) : null}
    </View>
  );
};

// ---------------------------------------------------------------------------
// ParentRow
// ---------------------------------------------------------------------------

export interface ParentRowProps {
  label: string;
  /** Explanatory line under the label. */
  description?: string;
  /** Right-hand readout, e.g. "12 lessons". */
  value?: string;
  icon?: PetalIconName;
  iconColor?: string;
  /** Renders a Switch on the right. Mutually exclusive with `value`/`right`. */
  toggle?: { value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean };
  right?: React.ReactNode;
  onPress?: () => void;
  /** Hairline separator above the row — use on every row but the first. */
  divided?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ParentRow: React.FC<ParentRowProps> = ({
  label,
  description,
  value,
  icon,
  iconColor = colors.textSecondary,
  toggle,
  right,
  onPress,
  divided = false,
  style,
}) => {
  const body = (
    <View style={styles.rowInner}>
      {icon ? <PetalIcon name={icon} size={20} color={iconColor} /> : null}
      <View style={styles.flex}>
        <Text style={[typography.presets.body, styles.rowLabel]}>{label}</Text>
        {description ? (
          <Text style={[typography.presets.caption, styles.muted]}>{description}</Text>
        ) : null}
      </View>

      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onValueChange}
          disabled={toggle.disabled}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
          accessibilityLabel={label}
        />
      ) : null}
      {value ? (
        <Text style={[typography.presets.body, styles.rowValue]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {right}
      {onPress && !toggle ? (
        <PetalIcon name="forward" size={18} color={colors.textMuted} />
      ) : null}
    </View>
  );

  if (!onPress || toggle) {
    return <View style={[divided && styles.divided, style]}>{body}</View>;
  }

  return (
    <View style={[divided && styles.divided, style]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={description}
        style={({ pressed }) => (pressed ? styles.pressed : undefined)}
      >
        {body}
      </Pressable>
    </View>
  );
};

// ---------------------------------------------------------------------------
// ParentStatGrid
// ---------------------------------------------------------------------------

export interface ParentStat {
  label: string;
  value: string;
  icon?: PetalIconName;
  color?: string;
  /** Optional 0-100 bar under the value. */
  progress?: number;
}

export const ParentStatGrid: React.FC<{
  stats: ParentStat[];
  /**
   * Smallest a tile may get before the row wraps. The 140 default assumes the
   * grid sits at screen level; drop it to ~120 when the grid is nested inside a
   * card, where there is roughly 36px less room to share.
   */
  minTileWidth?: number;
  style?: StyleProp<ViewStyle>;
}> = ({ stats, minTileWidth = 140, style }) => (
  <View style={[styles.grid, style]}>
    {stats.map((s) => (
      <Card
        key={s.label}
        variant="flat"
        padding="compact"
        style={[styles.gridItem, { flexBasis: minTileWidth }]}
      >
        <View style={styles.gridTop}>
          {s.icon ? <PetalIcon name={s.icon} size={16} color={s.color ?? colors.primary} /> : null}
          <Text style={[typography.presets.caption, styles.muted]} numberOfLines={1}>
            {s.label}
          </Text>
        </View>
        <Text style={[typography.presets.stat, styles.gridValue]} numberOfLines={1}>
          {s.value}
        </Text>
        {typeof s.progress === 'number' ? (
          <ProgressIndicator
            value={s.progress}
            height={progressSizes.barHeightThin}
            color={s.color ?? colors.primary}
            style={styles.gridProgress}
            accessibilityLabel={`${s.label} progress`}
          />
        ) : null}
      </Card>
    ))}
  </View>
);

// ---------------------------------------------------------------------------
// DestructiveAction
// ---------------------------------------------------------------------------

export interface DestructiveActionProps {
  title: string;
  /** Spell out exactly what is lost — this is the last stop before data goes. */
  description: string;
  buttonLabel: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Red-bordered card for anything irreversible (spec §26). Kept visually
 * separate from ordinary settings so it can never be mistaken for one.
 */
export const DestructiveAction: React.FC<DestructiveActionProps> = ({
  title,
  description,
  buttonLabel,
  onPress,
  loading = false,
  disabled = false,
  style,
}) => (
  <View style={[styles.danger, style]}>
    <View style={styles.dangerHead}>
      <View style={styles.dangerIcon}>
        <PetalIcon name="warning" size={18} color={colors.error} />
      </View>
      <View style={styles.flex}>
        <Text style={[typography.presets.cardTitle, { color: colors.error }]}>{title}</Text>
        <Text style={[typography.presets.caption, styles.muted]}>{description}</Text>
      </View>
    </View>

    <SecondaryButton
      label={buttonLabel}
      tone="danger"
      icon="trash"
      size="sm"
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      style={styles.dangerButton}
      accessibilityHint="This cannot be undone"
    />
  </View>
);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    minWidth: 0,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: colors.text,
  },
  muted: {
    color: colors.textSecondary,
    marginTop: 1,
  },
  footnote: {
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  // ------------------------------------------------------------------- rows
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    paddingVertical: spacing.xs,
  },
  rowLabel: {
    color: colors.text,
  },
  rowValue: {
    color: colors.text,
    fontWeight: '900',
    /*
     * `flexShrink` defaults to 0 in RN, so without this the right-hand readout
     * refuses to give up any width in the row and pushes itself past the card
     * edge instead — the label column beside it is `flex: 1, minWidth: 0`, but
     * that only lets the *label* yield. Paired with `numberOfLines={1}` so a long
     * value ellipsizes inside the row rather than reflowing it.
     */
    flexShrink: 1,
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },

  // ------------------------------------------------------------------- grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: cardSizes.gap,
  },
  gridItem: {
    // Two per row at 360px, three from ~600px up — no hardcoded widths (§27).
    // `flexBasis` comes from the `minTileWidth` prop.
    flexGrow: 1,
  },
  gridTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  gridValue: {
    color: colors.text,
    marginTop: spacing.xs,
  },
  gridProgress: {
    marginTop: spacing.sm,
  },

  // ----------------------------------------------------------- destructive
  danger: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.error,
    padding: cardSizes.padding,
    marginBottom: cardSizes.gap,
  },
  dangerHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  dangerIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButton: {
    marginTop: spacing.lg,
  },
});

export default ParentSection;
