import React, { useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/layout/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FormInput } from '../../components/forms/FormInput';
import { useChildStore } from '../../store/childStore';
import { useDeviceType } from '../../hooks/useDeviceType';
import { apiClient } from '../../services/api/apiClient';
import { useApiMutation } from '../../hooks/useReactQuery';
import { queryKeys } from '../../utils/queryKeys';
import { childFormSchema } from '../../utils/validation';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import type { ApiResponse } from '../../types/api';
import type { Child, ChildFormData } from '../../types/child';
import type { OnboardingStackParamList } from '../../types/navigation';

type ChildFormValues = z.infer<typeof childFormSchema>;

export const AVATAR_ASSETS = [
  { id: 'avatar_panda', label: 'Panda', icon: '🐼', color: '#F3F4F6' },
  { id: 'avatar_bunny', label: 'Bunny', icon: '🐰', color: '#FEF3C7' },
  { id: 'avatar_cat', label: 'Cat', icon: '🐱', color: '#FCE7F3' },
  { id: 'avatar_fox', label: 'Fox', icon: '🦊', color: '#FFEDD5' },
  { id: 'avatar_tiger', label: 'Tiger', icon: '🐯', color: '#FFE4E6' },
  { id: 'avatar_bear', label: 'Bear', icon: '🐻', color: '#EED5C5' },
];

export const getAvatarEmoji = (avatarId: string): string => {
  const av = AVATAR_ASSETS.find((a) => a.id === avatarId);
  return av ? av.icon : '👶';
};

export const getAvatarBgColor = (avatarId: string): string => {
  const av = AVATAR_ASSETS.find((a) => a.id === avatarId);
  return av ? av.color : '#E5E7EB';
};

const AGE_OPTIONS = [2, 3, 4, 5, 6];

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
    formState: { errors, isSubmitting },
  } = useForm<ChildFormValues>({
    resolver: zodResolver(childFormSchema),
    defaultValues: {
      name: '',
      age: 3,
      avatar: 'avatar_panda',
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
  const selectedAvatar = formValues.avatar || 'avatar_panda';

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

  const renderFormFields = () => (
    <View style={styles.formGroup}>
      <FormInput
        name="name"
        control={control as any}
        label="Child's Name"
        placeholder="Explorer Name"
        autoCapitalize="words"
        returnKeyType="next"
      />

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Child's Age (2–6 years)</Text>
        <Controller
          control={control}
          name="age"
          render={({ field: { onChange, value } }) => (
            <View style={styles.ageButtonGroup}>
              {AGE_OPTIONS.map((num) => (
                <TouchableOpacity
                  key={num}
                  onPress={() => onChange(num)}
                  style={[
                    styles.ageButton,
                    value === num && styles.ageButtonSelected,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: value === num }}
                  accessibilityLabel={`Age ${num}`}
                >
                  <Text style={[styles.ageButtonText, value === num && styles.ageButtonTextSelected]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Choose Avatar Icon</Text>
        <Controller
          control={control}
          name="avatar"
          render={({ field: { onChange, value } }) => (
            <View style={styles.avatarGrid}>
              {AVATAR_ASSETS.map((av) => {
                const isSelected = value === av.id;
                return (
                  <TouchableOpacity
                    key={av.id}
                    onPress={() => onChange(av.id)}
                    style={[
                      styles.avatarGridItem,
                      { backgroundColor: av.color },
                      isSelected && styles.avatarGridItemSelected,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Avatar ${av.label}`}
                  >
                    <Text style={styles.gridAvatarEmoji}>{av.icon}</Text>
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.purple} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Learning Companion</Text>
        <Card onPress={handlePickMentor} style={styles.mentorCard} variant="outlined">
          {formValues.mentorId ? (
            <View style={styles.mentorRow}>
              <View style={[styles.mentorIconCircle, { backgroundColor: colors.purple }]}>
                <Ionicons name="paw" size={24} color={colors.white} />
              </View>
              <View style={styles.mentorInfo}>
                <Text style={styles.mentorName}>{mentorDisplayName}</Text>
                <Text style={styles.mentorDesc}>Companion selected</Text>
              </View>
              <Ionicons name="swap-horizontal-outline" size={20} color={colors.purple} />
            </View>
          ) : (
            <View style={styles.mentorPlaceholderRow}>
              <Ionicons name="paw-outline" size={24} color={colors.textMuted} style={{ marginRight: spacing.md }} />
              <Text style={styles.mentorPlaceholderText}>Tap to choose a learning companion</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          )}
        </Card>
      </View>
    </View>
  );

  const renderPreview = () => (
    <View style={styles.previewContainer}>
      <Text style={styles.previewTitle}>Live Preview</Text>
      <Card style={styles.previewCard} variant="elevated">
        <View style={[styles.previewAvatarCircle, { backgroundColor: getAvatarBgColor(selectedAvatar) }]}>
          <Text style={styles.previewAvatarEmoji}>{getAvatarEmoji(selectedAvatar)}</Text>
        </View>
        <Text style={styles.previewName}>{formValues.name.trim() || 'Explorer Name'}</Text>
        <Text style={styles.previewAgeGroup}>
          Age {formValues.age} • Group {formValues.age === 2 ? '2–3' : formValues.age === 3 ? '3–4' : formValues.age === 4 ? '4–5' : '5–6'} years
        </Text>
        <View style={styles.previewMentorSection}>
          <Text style={styles.previewMentorLabel}>COMPANION</Text>
          {formValues.mentorId ? (
            <View style={styles.previewMentorRow}>
              <View style={[styles.previewMentorIcon, { backgroundColor: colors.purple }]}>
                <Ionicons name="paw" size={20} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewMentorName}>{mentorDisplayName}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.previewNoMentor}>No companion selected.</Text>
          )}
          <Button
            label="Choose Companion"
            onPress={handlePickMentor}
            variant="outline"
            size="sm"
            style={styles.chooseMentorBtn}
          />
        </View>
      </Card>
      <View style={styles.splitActions}>
        <Button
          label={isLoading ? 'Saving...' : (isEditMode ? 'Update Profile' : 'Save Profile')}
          onPress={handleSubmit(onSubmit)}
          variant="primary"
          loading={isLoading}
          disabled={isLoading}
          fullWidth
        />
        <Button
          label="Cancel"
          onPress={() => navigation.goBack()}
          variant="ghost"
          fullWidth
        />
      </View>
    </View>
  );

  const renderMobile = () => (
    <Screen scroll padded keyboardAvoid>
      <View style={styles.header}>
        <Text style={styles.title}>{isEditMode ? 'Edit Profile' : 'Create Child Profile'}</Text>
        <Text style={styles.subtitle}>Personalize your child's learning journey</Text>
      </View>

      {renderFormFields()}

      <Card style={styles.mobilePreviewCard} variant="outlined">
        <View style={[styles.mobilePreviewAvatar, { backgroundColor: getAvatarBgColor(selectedAvatar) }]}>
          <Text style={styles.mobilePreviewEmoji}>{getAvatarEmoji(selectedAvatar)}</Text>
        </View>
        <Text style={styles.mobilePreviewName}>{formValues.name.trim() || 'Explorer Name'}</Text>
        <Text style={styles.mobilePreviewAge}>Age {formValues.age}</Text>
      </Card>

      <View style={styles.actionsContainer}>
        <Button
          label={isLoading ? 'Saving...' : (isEditMode ? 'Update Profile' : 'Save Profile')}
          onPress={handleSubmit(onSubmit)}
          variant="primary"
          loading={isLoading}
          disabled={isLoading}
          fullWidth
        />
        <Button
          label="Cancel"
          onPress={() => navigation.goBack()}
          variant="ghost"
          fullWidth
        />
      </View>
    </Screen>
  );

  const renderTablet = () => (
    <Screen keyboardAvoid>
      <View style={styles.splitWrapper}>
        <ScrollView style={styles.splitLeft} contentContainerStyle={styles.splitLeftContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionHeader}>{isEditMode ? 'Modify Explorer Profile' : 'New Explorer Profile'}</Text>
          {renderFormFields()}
        </ScrollView>

        <View style={styles.splitRight}>
          {renderPreview()}
        </View>
      </View>
    </Screen>
  );

  const renderLayout = () => {
    switch (deviceType) {
      case 'mobile': return renderMobile();
      case 'tablet': return renderTablet();
      case 'desktop': return renderTablet();
    }
  };

  return renderLayout();
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  formGroup: {
    gap: spacing.none,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  ageButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  ageButton: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  ageButtonSelected: {
    borderColor: colors.purple,
    borderWidth: 2,
    backgroundColor: '#F5ECFF',
  },
  ageButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  ageButtonTextSelected: {
    color: colors.purple,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  avatarGridItem: {
    width: '28%',
    aspectRatio: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  avatarGridItemSelected: {
    borderColor: colors.purple,
    borderWidth: 3,
  },
  gridAvatarEmoji: {
    fontSize: 32,
  },
  checkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.white,
    borderRadius: radius.full,
  },
  mentorCard: {
    padding: spacing.md,
  },
  mentorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mentorIconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  mentorInfo: {
    flex: 1,
  },
  mentorName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  mentorDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  mentorPlaceholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mentorPlaceholderText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  actionsContainer: {
    marginTop: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  mobilePreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  mobilePreviewAvatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobilePreviewEmoji: {
    fontSize: 24,
  },
  mobilePreviewName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    flex: 1,
  },
  mobilePreviewAge: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  splitWrapper: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  splitLeft: {
    flex: 1.2,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.background,
  },
  splitLeftContent: {
    padding: spacing.xl,
  },
  sectionHeader: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  splitRight: {
    flex: 1.8,
    padding: spacing.xl,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    width: '100%',
    maxWidth: 400,
    gap: spacing.lg,
  },
  previewTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  previewCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  previewAvatarCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  previewAvatarEmoji: {
    fontSize: 40,
  },
  previewName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  previewAgeGroup: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  previewMentorSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  previewMentorLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: typography.weights.bold,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  previewMentorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  previewMentorIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  previewMentorName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  previewNoMentor: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  chooseMentorBtn: {
    width: '100%',
  },
  splitActions: {
    gap: spacing.md,
  },
});

export default AddEditChildScreen;
