/**
 * Profile Setup — reference screen 1 (spec §34 phase 7).
 *
 * One layout for every size. The old file rendered a phone version and a
 * two-pane `flex: 1.2 / 1.8` tablet version whose only real difference was that
 * the tablet moved the live preview into a right-hand column and gave it a
 * "Choose Companion" button of its own. The preview is now a hero card at the
 * top of a single column, which is where reference screen 1 puts the avatar, so
 * both variants' content survives without a screenshot-shaped split (§27).
 *
 * The preview's duplicate "Choose Companion" button is deliberately not carried
 * across: the companion picker below is a real, tappable card that does the same
 * navigation, and two controls for one action on one screen is a worse form.
 *
 * Also gone: the `useTheme()` + `getStyles(colors)` runtime-theme indirection
 * this was the only screen using, the emoji avatars (§7), the four Ionicons, and
 * the `width: '28%'` avatar grid.
 *
 * Everything behavioural is untouched (§1): the same schema and defaults, the
 * same two seeding effects, the same create/update mutations with their exact
 * `onSuccess` bodies, the same name-trim + find-new-child + `setActiveChild`
 * sequence, and the same hand-off to `MentorSelection`.
 */

import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormInput } from '../../components/forms/FormInput';
import {
  AppShell,
  AvatarGlyph,
  Card,
  IconWell,
  PageHeader,
  PetalIcon,
  PrimaryButton,
  SecondaryButton,
} from '../../components/design';
import { useChildStore } from '../../store/childStore';
import { useDeviceType } from '../../hooks/useDeviceType';
import { apiClient } from '../../services/api/apiClient';
import { useApiMutation } from '../../hooks/useReactQuery';
import { childFormSchema } from '../../utils/validation';
import { AVATAR_ASSETS, DEFAULT_AVATAR_ID } from '../../constants/avatars';
import { cardSizes, colors, radius, spacing, typography } from '../../theme';
import type { ApiResponse } from '../../types/api';
import type { Child, ChildFormData } from '../../types/child';
import type { OnboardingStackParamList } from '../../types/navigation';
import { SCREEN_BACKGROUNDS } from '../../assets/backgrounds';

type ChildFormValues = z.infer<typeof childFormSchema>;

const AGE_OPTIONS = [2, 3, 4, 5, 6];

/** Reading-column cap per size — replaces the old two-pane split. */
const COLUMN_MAX_WIDTH: Record<string, number> = {
  mobile: 480,
  tablet: 720,
  desktop: 800,
};

/** Avatar tiles flex from this width, so the column count follows the window. */
const AVATAR_MIN_WIDTH = 84;

/** Unchanged from the old inline ternary chain. */
const ageGroupLabel = (age: number): string =>
  age === 2 ? '2–3' : age === 3 ? '3–4' : age === 4 ? '4–5' : '5–6';

export const AddEditChildScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<OnboardingStackParamList, 'AddChild'>>();
  const deviceType = useDeviceType();
  const { childrenList } = useChildStore();

  const childId = route.params?.childId;
  const isEditMode = !!childId;

  const existingChild = useMemo(() => {
    if (!isEditMode) return null;
    return childrenList.find((c) => c.id === childId) ?? null;
  }, [childId, childrenList, isEditMode]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<ChildFormValues>({
    resolver: zodResolver(childFormSchema),
    defaultValues: {
      name: '',
      age: 3,
      avatar: DEFAULT_AVATAR_ID,
      mentorId: null,
    },
  });

  useEffect(() => {
    if (existingChild) {
      setValue('name', existingChild.name);
      setValue('age', existingChild.age);
      setValue('avatar', existingChild.avatar);
      setValue('mentorId', existingChild.mentorId);
    }
  }, [existingChild, setValue]);

  useEffect(() => {
    if (route.params?.selectedMentorId !== undefined) {
      setValue('mentorId', route.params.selectedMentorId);
    }
  }, [route.params?.selectedMentorId, setValue]);

  const formValues = watch();
  const selectedAvatar = formValues.avatar || DEFAULT_AVATAR_ID;

  const createMutation = useApiMutation<Child, ChildFormData>(
    async (data) => apiClient.post<ApiResponse<Child>>('/children', data),
    {
      onSuccess: async () => {
        await useChildStore.getState().refreshChildren();
        if (deviceType === 'mobile') {
          navigation.navigate('MainTabs');
        } else {
          navigation.navigate('Home');
        }
      },
    },
  );

  const updateMutation = useApiMutation<Child, { id: string; data: Partial<ChildFormData> }>(
    async ({ id, data }) => apiClient.put<ApiResponse<Child>>(`/children/${id}`, data),
    {
      onSuccess: async () => {
        await useChildStore.getState().refreshChildren();
        navigation.goBack();
      },
    },
  );

  const onSubmit = async (values: ChildFormValues) => {
    const payload: ChildFormData = {
      name: values.name.trim(),
      age: values.age,
      avatar: values.avatar,
      mentorId: values.mentorId || null,
    };

    if (isEditMode) {
      await updateMutation.mutateAsync({ id: childId!, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
      const { childrenList: updatedList } = useChildStore.getState();
      const newChild = updatedList.find((c) => c.name === payload.name && c.age === payload.age);
      if (newChild) {
        await useChildStore.getState().setActiveChild(newChild);
      }
    }
  };

  const isLoading = isSubmitting || createMutation.isPending || updateMutation.isPending;

  const handlePickMentor = () => {
    navigation.navigate('MentorSelection', {
      selectedMentorId: formValues.mentorId,
      returnScreen: 'AddChild',
    });
  };

  const mentorDisplayName = formValues.mentorId ? (existingChild?.mentor?.name ?? 'Selected') : null;

  const previewName = formValues.name.trim() || 'Explorer Name';
  const maxWidth = COLUMN_MAX_WIDTH[deviceType] ?? COLUMN_MAX_WIDTH.mobile;

  return (
    <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.profile}
      keyboardAvoid
     
      header={
        <PageHeader
          title={isEditMode ? 'Edit Profile' : 'Create Child Profile'}
          subtitle="Personalize your child's learning journey"
        />
      }
      footer={
        <View style={styles.footer}>
          <SecondaryButton
            label="Cancel"
            onPress={() => navigation.goBack()}
            disabled={isLoading}
            style={styles.footerCancel}
          />
          <PrimaryButton
            label={isLoading ? 'Saving…' : isEditMode ? 'Update Profile' : 'Save Profile'}
            icon="check"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            style={styles.footerSave}
          />
        </View>
      }
    >
      <View style={[styles.column, { maxWidth }]}>
        {/* Live preview — what the child will see on their own profile. */}
        <Card variant="raised" padding="roomy" accent={colors.primary} rail contentStyle={styles.hero}>
          <AvatarGlyph species={selectedAvatar} size={88} ringColor={colors.primary} />
          <Text style={typography.presets.title} numberOfLines={1}>
            {previewName}
          </Text>
          <Text style={[typography.presets.caption, styles.muted]}>
            Age {formValues.age} · Group {ageGroupLabel(formValues.age)} years
          </Text>
          <View style={styles.heroCompanion}>
            <Text style={[typography.presets.eyebrow, styles.muted]}>Companion</Text>
            <Text
              style={[
                typography.presets.body,
                mentorDisplayName ? styles.heroCompanionName : styles.muted,
              ]}
              numberOfLines={1}
            >
              {mentorDisplayName ?? 'None chosen yet'}
            </Text>
          </View>
        </Card>

        <Card variant="raised" padding="normal" contentStyle={styles.formStack}>
          <View>
            <FormInput
              name="name"
              control={control as any}
              label="Child's Name"
              placeholder="Explorer Name"
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Text style={[typography.presets.subtle, styles.fieldLabel]}>
              Child&apos;s Age (2–6 years)
            </Text>
            <Controller
              control={control}
              name="age"
              render={({ field: { onChange, value } }) => (
                <View style={styles.ageRow} accessibilityRole="radiogroup">
                  {AGE_OPTIONS.map((num) => {
                    const selected = value === num;
                    return (
                      <Pressable
                        key={num}
                        onPress={() => onChange(num)}
                        style={({ pressed }) => [
                          styles.ageChip,
                          selected && styles.ageChipSelected,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Age ${num}`}
                      >
                        <Text
                          style={[
                            typography.presets.cardTitle,
                            selected ? styles.ageChipTextSelected : styles.ageChipText,
                          ]}
                        >
                          {num}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            />
          </View>

          <View>
            <Text style={[typography.presets.subtle, styles.fieldLabel]}>Choose an Avatar</Text>            <Controller
              control={control}
              name="avatar"
              render={({ field: { onChange, value } }) => (
                <View style={styles.avatarGrid} accessibilityRole="radiogroup">
                  {AVATAR_ASSETS.map((av) => {
                    const selected = (value || DEFAULT_AVATAR_ID) === av.id;
                    return (
                      <Pressable
                        key={av.id}
                        onPress={() => onChange(av.id)}
                        style={({ pressed }) => [
                          styles.avatarTile,
                          selected && styles.avatarTileSelected,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Avatar ${av.label}`}
                      >
                        <AvatarGlyph species={av.species} size={54} />
                        <Text
                          style={[
                            typography.presets.caption,
                            selected ? styles.avatarLabelSelected : styles.muted,
                          ]}
                          numberOfLines={1}
                        >
                          {av.label}
                        </Text>
                        {/* A tick as well as the outline, so the choice is not
                            signalled by colour alone (§30). */}
                        {selected ? (
                          <View style={styles.tick}>
                            <PetalIcon name="check" size={12} color={colors.white} />
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            />
          </View>

          <View>
            <Text style={[typography.presets.subtle, styles.fieldLabel]}>Learning Companion</Text>
            {/* A row rather than a nested card: inside a white card, a second
                card would stack two shadows for no extra meaning. */}
            <Pressable
              onPress={handlePickMentor}
              style={({ pressed }) => [
                styles.companionRow,
                mentorDisplayName && styles.companionRowChosen,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                mentorDisplayName
                  ? `Learning companion: ${mentorDisplayName}`
                  : 'No learning companion chosen'
              }
              accessibilityHint={
                mentorDisplayName ? 'Choose a different companion' : 'Opens the companion list'
              }
            >
              <IconWell
                icon="mentors"
                color={mentorDisplayName ? colors.purple : colors.textSecondary}
                soft={mentorDisplayName ? colors.secondaryLight : colors.background}
                size={cardSizes.iconWellSmall}
                filled={!!mentorDisplayName}
              />
              <View style={styles.companionText}>
                <Text style={typography.presets.cardTitle} numberOfLines={1}>
                  {mentorDisplayName ?? 'Choose a companion'}
                </Text>
                <Text style={[typography.presets.caption, styles.muted]} numberOfLines={1}>
                  {mentorDisplayName ? 'Tap to swap' : 'A buddy to guide the journey'}
                </Text>
              </View>
              <PetalIcon name="forward" size={20} color={colors.textMuted} />
            </Pressable>
          </View>
        </Card>
      </View>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  column: {
    width: '100%',
    alignSelf: 'center',
    paddingTop: spacing.md,
    gap: cardSizes.gap,
  },
  /* One form card, three labelled groups inside it. */
  formStack: {
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroCompanion: {
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 2,
  },
  heroCompanionName: {
    color: colors.purple,
  },
  muted: {
    color: colors.textSecondary,
  },
  /* Matches `FormInput`'s own label so every group reads as one form. */
  fieldLabel: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  ageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ageChip: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.cardInner,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  /* Purple marks selection app-wide (§3). */
  ageChipSelected: {
    borderColor: colors.purple,
    borderWidth: 2,
    backgroundColor: colors.secondaryLight,
  },
  ageChipText: {
    color: colors.text,
  },
  ageChipTextSelected: {
    color: colors.purple,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  avatarTile: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: AVATAR_MIN_WIDTH,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.cardInner,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  avatarTileSelected: {
    borderColor: colors.purple,
    borderWidth: 2,
    backgroundColor: colors.secondaryLight,
  },
  avatarLabelSelected: {
    color: colors.purple,
  },
  tick: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 20,
    height: 20,
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple,
  },
  pressed: {
    opacity: 0.75,
  },
  companionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: cardSizes.minRowHeight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.cardInner,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  /* Border only — the icon well behind it is already tinted purple, and two
     purples touching would hide the well. */
  companionRowChosen: {
    borderColor: colors.purple,
    borderWidth: 2,
  },
  companionText: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  footerCancel: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  footerSave: {
    flexGrow: 2,
    flexShrink: 1,
    flexBasis: 0,
  },
});

export default AddEditChildScreen;
