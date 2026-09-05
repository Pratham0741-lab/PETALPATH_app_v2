/**
 * Who is learning today? — the child picker (spec §34 phase 7).
 *
 * One layout for every size. This screen used to be a phone list plus a
 * `flex: 1.2 / 1.8` tablet master/detail, and the two disagreed about what a row
 * meant: tapping a child *activated* them on a phone, but only *highlighted*
 * them on a tablet, where a separate pane held "Select Profile", "Edit" and
 * "Delete". A row cannot mean two things, so tapping one starts learning as that
 * child everywhere (the phone rule, and the reason this screen exists), and the
 * pane's other two actions moved onto each row as explicit labelled buttons.
 *
 * That also closes a gap rather than trading one: **deleting a profile was
 * impossible on a phone**, because the only delete button lived in the tablet
 * pane. It is now available on every size, in red, behind the same confirm
 * dialog (§26).
 *
 * The pane's companion detail — the mentor's name *and* description, which the
 * compact rows have no room for — is kept as a card under the list, showing the
 * active child. That needs no extra selection state, so `selectedChildId` and
 * its auto-select effect are gone.
 *
 * Behaviour is otherwise untouched (§1): the same `/children` query, the same
 * `switchChild` call inside the same try/catch, the same three `customAlert`
 * flows with their exact wording, the same `MainTabs` vs `Home` split by device,
 * and the same pull-to-refresh pair.
 *
 * `AVATAR_ASSETS` and its two helpers used to be *defined* here and re-exported
 * by accident of history — `components/dashboard/*` imported them from this
 * screen. They now live in `constants/avatars`, which is also where
 * `AddEditChildScreen` had a byte-identical second copy of them.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Animated, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import {
  AppShell,
  AvatarGlyph,
  Card,
  PageHeader,
  PetalIcon,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from '../../components/design';
import { useChildStore, type Child } from '../../store/childStore';
import { useChildSwitch } from '../../hooks/useChildSwitch';
import { useDeviceType } from '../../hooks/useDeviceType';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useApiQuery } from '../../hooks/useReactQuery';
import { queryKeys } from '../../utils/queryKeys';
import { apiClient } from '../../services/api/apiClient';
import { cardSizes, colors, radius, spacing, typography } from '../../theme';
import type { ApiResponse } from '../../types/api';
import { customAlert } from '../../utils/alert';
import { SCREEN_BACKGROUNDS } from '../../assets/backgrounds';

/** Reading-column cap per size — replaces the old two-pane split (§27). */
const COLUMN_MAX_WIDTH: Record<string, number> = {
  mobile: 520,
  tablet: 760,
  desktop: 820,
};

export const ChildSelectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const deviceType = useDeviceType();
  const reduceMotion = useReducedMotion();
  const { activeChild, removeChild, refreshChildren } = useChildStore();
  const { switchChild } = useChildSwitch();
  const [switchAnim] = useState(() => new Animated.Value(1));

  const {
    data: childrenResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useApiQuery(
    queryKeys.children.all,
    () => apiClient.get<ApiResponse<Child[]>>('/children'),
  );

  const childrenList = childrenResponse?.data ?? [];

  /* The detail card follows the active child, so there is no second source of
     truth for "which child am I looking at". */
  const shownChild = useMemo(
    () => childrenList.find((c) => c.id === activeChild?.id) ?? null,
    [childrenList, activeChild?.id],
  );

  const handleSelectChild = useCallback(async (child: Child) => {
    if (!reduceMotion) {
      Animated.sequence([
        Animated.timing(switchAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(switchAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }

    try {
      await switchChild(child.id);
    } catch {
      // selection failure is non-blocking — child is still set locally
    }

    customAlert('Active Child Set', `Welcome back, ${child.name}!`, [
      {
        text: 'OK',
        onPress: () => {
          if (deviceType === 'mobile') {
            navigation.navigate('MainTabs');
          } else {
            navigation.navigate('Home');
          }
        },
      },
    ]);
  }, [deviceType, navigation, switchChild, switchAnim, reduceMotion]);

  const handleDeleteChild = useCallback((id: string, name: string) => {
    customAlert(
      'Delete Profile',
      `Are you sure you want to delete ${name}'s profile?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeChild(id);
              /* The list on screen comes from the `/children` query, not the
                 store, so without this the deleted row stayed until the next
                 pull-to-refresh. */
              await refetch();
              customAlert('Success', 'Profile deleted successfully');
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Failed to delete child';
              customAlert('Error', message);
            }
          },
        },
      ],
    );
  }, [removeChild, refetch]);

  const onRefresh = useCallback(() => {
    refreshChildren();
    refetch();
  }, [refreshChildren, refetch]);

  const maxWidth = COLUMN_MAX_WIDTH[deviceType] ?? COLUMN_MAX_WIDTH.mobile;

  const header = (
    <PageHeader
      title="Who is learning today?"
      subtitle="Choose a profile to pick up the journey"
      /* Nothing to go back to when this is the entry screen — a chevron that
         does nothing would be a fake control (§33). */
      showBack={navigation.canGoBack()}
    />
  );

  if (isLoading) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.childSelect} header={header} >
        <View style={[styles.column, { maxWidth }]}>
          {[0, 1, 2].map((i) => (
            <Card key={i} variant="flat" padding="compact">
              <View style={styles.row}>
                <Skeleton variant="circle" width={48} height={48} />
                <View style={styles.rowText}>
                  <Skeleton width="60%" height={16} />
                  <Skeleton width="40%" height={12} style={styles.skeletonSecondLine} />
                </View>
              </View>
            </Card>
          ))}
        </View>
      </AppShell>
    );
  }

  if (childrenList.length === 0) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.childSelect} header={header}  scroll={false}>
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="profile"
            title="No Child Profiles Yet"
            message="Create a profile for your child to start their learning journey!"
          />
          <PrimaryButton
            label="Add Your First Child"
            icon="plus"
            onPress={() => navigation.navigate('AddChild')}
            style={styles.emptyButton}
          />
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell
      petals="none"
      backgroundImage={SCREEN_BACKGROUNDS.childSelect}
      header={header}
      
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={[styles.column, { maxWidth }]}>
        {childrenList.map((child) => (
          <ChildRow
            key={child.id}
            child={child}
            active={activeChild?.id === child.id}
            onActivate={() => handleSelectChild(child)}
            onEdit={() => navigation.navigate('AddChild', { childId: child.id })}
            onDelete={() => handleDeleteChild(child.id, child.name)}
          />
        ))}

        <SecondaryButton
          label="Add Another Child"
          icon="plus"
          onPress={() => navigation.navigate('AddChild')}
        />

        {shownChild ? (
          <Animated.View style={{ transform: [{ scale: switchAnim }] }}>
            <Card variant="raised" padding="roomy" accent={colors.primary} rail contentStyle={styles.detail}>
              <AvatarGlyph species={shownChild.avatar} size={88} ringColor={colors.primary} />
              <Text style={typography.presets.title} numberOfLines={1}>
                {shownChild.name}
              </Text>
              <Text style={[typography.presets.caption, styles.muted]}>
                {shownChild.ageGroup} · {shownChild.age} years old
              </Text>

              <View style={styles.companionBlock}>
                <Text style={[typography.presets.eyebrow, styles.muted]}>Active companion</Text>
                {shownChild.mentor ? (
                  <>
                    <Text style={[typography.presets.cardTitle, styles.companionName]}>
                      {shownChild.mentor.name}
                    </Text>
                    <Text style={[typography.presets.body, styles.muted]}>
                      {shownChild.mentor.description}
                    </Text>
                  </>
                ) : (
                  <Text style={[typography.presets.body, styles.muted]}>
                    No companion selected yet.
                  </Text>
                )}
              </View>

              <PrimaryButton
                label="Start Learning"
                iconRight="forward"
                size="lg"
                onPress={() => handleSelectChild(shownChild)}
              />
            </Card>
          </Animated.View>
        ) : null}
      </View>
    </AppShell>
  );
};

// ---------------------------------------------------------------------------
// One child, one row
// ---------------------------------------------------------------------------

const ChildRow: React.FC<{
  child: Child;
  active: boolean;
  onActivate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ child, active, onActivate, onEdit, onDelete }) => (
  <Card
    variant={active ? 'selected' : 'raised'}
    accent={colors.primary}
    padding="compact"
    onPress={onActivate}
    contentStyle={styles.rowCard}
    accessibilityLabel={`${child.name}, ${child.ageGroup}.${active ? ' Active profile.' : ''}`}
    accessibilityHint="Starts learning as this child"
  >
    <View style={styles.row}>
      <AvatarGlyph
        species={child.avatar}
        size={48}
        ringColor={active ? colors.primary : undefined}
        style={styles.avatar}
      />
      <View style={styles.rowText}>
        <Text style={typography.presets.cardTitle} numberOfLines={1}>
          {child.name}
        </Text>
        <Text style={[typography.presets.caption, styles.muted]} numberOfLines={1}>
          {child.ageGroup} · {child.mentor?.name || 'No companion yet'}
        </Text>
      </View>
      {/* Spelled out, not just a coloured border (§30). */}
      {active ? <StatusBadge status="current" label="Active" size="sm" /> : null}
      <PetalIcon name="forward" size={20} color={colors.textMuted} />
    </View>

    {/* The tablet pane's other two actions, on the row they belong to. */}
    <View style={styles.rowActions}>
      <SecondaryButton
        label="Edit"
        icon="pencil"
        size="sm"
        tone="purple"
        onPress={onEdit}
        accessibilityLabel={`Edit ${child.name}'s profile`}
        style={styles.rowAction}
      />
      <SecondaryButton
        label="Delete"
        icon="trash"
        size="sm"
        tone="danger"
        onPress={onDelete}
        accessibilityLabel={`Delete ${child.name}'s profile`}
        accessibilityHint="Asks you to confirm first"
        style={styles.rowAction}
      />
    </View>
  </Card>
);

const styles = StyleSheet.create({
  column: {
    width: '100%',
    alignSelf: 'center',
    paddingTop: spacing.md,
    gap: cardSizes.gap,
  },
  rowCard: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    flexShrink: 0,
  },
  rowText: {
    flex: 1,
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  rowAction: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  skeletonSecondLine: {
    marginTop: spacing.xs,
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  emptyButton: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 280,
  },
  detail: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  muted: {
    color: colors.textSecondary,
  },
  companionBlock: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.cardInner,
    /* Nested inside a card, so it uses the softer of the two panel fills. */
    backgroundColor: colors.surfaceTranslucentSoft,
  },
  companionName: {
    color: colors.primaryDark,
  },
});

export default ChildSelectionScreen;
