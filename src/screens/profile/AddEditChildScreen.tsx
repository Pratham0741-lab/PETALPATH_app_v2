import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppButton } from '../../components/buttons/AppButton';
import { AppCard } from '../../components/cards/AppCard';
import { useChildStore } from '../../store/childStore';
import { useMentorStore } from '../../store/mentorStore';
import { useDeviceType } from '../../hooks/useDeviceType';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { AVATAR_ASSETS, getAvatarEmoji, getAvatarBgColor } from './ChildSelectionScreen';
import { customAlert } from '../../utils/alert';

export const AddEditChildScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const deviceType = useDeviceType();

  const childId = route.params?.childId;
  const isEditMode = !!childId;

  const { addChild, updateChild, setActiveChild, childrenList, loading: storeLoading } = useChildStore();
  const { mentorList, refreshMentors, loading: mentorsLoading } = useMentorStore();

  const [name, setName] = useState('');
  const [age, setAge] = useState<number>(3);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('avatar_panda');
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null);

  useEffect(() => {
    refreshMentors();
  }, []);

  // Pre-fill profile data if in Edit Mode
  useEffect(() => {
    if (isEditMode) {
      const child = childrenList.find((c) => c.id === childId);
      if (child) {
        setName(child.name);
        setAge(child.age);
        setSelectedAvatarId(child.avatar);
        setSelectedMentorId(child.mentorId);
      }
    }
  }, [childId, childrenList, isEditMode]);

  // Monitor returned params from MentorSelection screen
  useEffect(() => {
    if (route.params?.selectedMentorId !== undefined) {
      setSelectedMentorId(route.params.selectedMentorId);
    }
  }, [route.params?.selectedMentorId]);

  const handleSave = async () => {
    if (!name.trim()) {
      customAlert('Validation Error', 'Please enter a name');
      return;
    }
    if (name.length > 30) {
      customAlert('Validation Error', 'Name cannot exceed 30 characters');
      return;
    }
    if (age < 2 || age > 6) {
      customAlert('Validation Error', 'Age must be between 2 and 6 years');
      return;
    }

    try {
      if (isEditMode) {
        await updateChild(childId, {
          name: name.trim(),
          age,
          avatar: selectedAvatarId,
          mentorId: selectedMentorId,
        });
        customAlert('Success', 'Profile updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        const newChild = await addChild({
          name: name.trim(),
          age,
          avatar: selectedAvatarId,
          mentorId: selectedMentorId,
        });
        await setActiveChild(newChild);
        customAlert('Success', 'Profile created successfully', [
          {
            text: 'OK',
            onPress: () => {
              if (deviceType === 'mobile') {
                navigation.navigate('MainTabs');
              } else {
                navigation.navigate('Home');
              }
            }
          }
        ]);
      }
    } catch (err: any) {
      customAlert('Save Failed', err.message || 'An error occurred while saving.');
    }
  };

  const handlePickMentor = () => {
    navigation.navigate('MentorSelection', {
      selectedMentorId,
      returnScreen: 'AddChild', // Route name to navigate back to
    });
  };

  const selectedMentor = mentorList.find((m) => m.id === selectedMentorId);

  const renderFormFields = () => {
    return (
      <View style={styles.formGroup}>
        {/* Name Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Child's Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Explorer Name"
            placeholderTextColor={colors.textMuted}
            style={styles.textInput}
            maxLength={30}
          />
          <Text style={styles.charCount}>{name.length}/30</Text>
        </View>

        {/* Age Selector */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Child's Age (2–6 years)</Text>
          <View style={styles.ageButtonGroup}>
            {[2, 3, 4, 5, 6].map((num) => (
              <TouchableOpacity
                key={num}
                onPress={() => setAge(num)}
                style={[
                  styles.ageButton,
                  age === num && styles.ageButtonSelected,
                ]}
              >
                <Text style={[styles.ageButtonText, age === num && styles.ageButtonTextSelected]}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Avatar Selector Grid */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Choose Avatar Icon</Text>
          <View style={styles.avatarGrid}>
            {AVATAR_ASSETS.map((av) => {
              const isSelected = selectedAvatarId === av.id;
              return (
                <TouchableOpacity
                  key={av.id}
                  onPress={() => setSelectedAvatarId(av.id)}
                  style={[
                    styles.avatarGridItem,
                    { backgroundColor: av.color },
                    isSelected && styles.avatarGridItemSelected,
                  ]}
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
        </View>
      </View>
    );
  };

  // 1. Mobile Layout (Single Column)
  const renderMobile = () => {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>{isEditMode ? 'Edit Profile' : 'Create Child Profile'}</Text>
          <Text style={styles.subtitle}>Personalize your child's learning journey</Text>
        </View>

        {renderFormFields()}

        {/* Companion Picker */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Learning Companion</Text>
          <AppCard onPress={handlePickMentor} style={styles.mentorCard} outlined={!!selectedMentor}>
            {selectedMentor ? (
              <View style={styles.mentorRow}>
                <View style={[styles.mentorIconCircle, { backgroundColor: selectedMentor.color }]}>
                  <Ionicons name={selectedMentor.iconName as any} size={24} color={colors.white} />
                </View>
                <View style={styles.mentorInfo}>
                  <Text style={styles.mentorName}>{selectedMentor.name}</Text>
                  <Text style={styles.mentorDesc}>{selectedMentor.description}</Text>
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
          </AppCard>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <AppButton
            label={storeLoading ? 'Saving...' : 'Save Profile'}
            onPress={handleSave}
            variant="primary"
            disabled={storeLoading}
          />
          <AppButton
            label="Cancel"
            onPress={() => navigation.goBack()}
            variant="secondary"
          />
        </View>
      </ScrollView>
    );
  };

  // 2. Tablet Layout (Two Column)
  const renderTablet = () => {
    return (
      <View style={styles.splitWrapper}>
        <ScrollView style={styles.splitLeft} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionHeader}>{isEditMode ? 'Modify Explorer Profile' : 'New Explorer Profile'}</Text>
          {renderFormFields()}
        </ScrollView>

        <View style={styles.splitRight}>
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Live Preview</Text>
            
            <View style={styles.previewCard}>
              <View style={[styles.previewAvatarCircle, { backgroundColor: getAvatarBgColor(selectedAvatarId) }]}>
                <Text style={styles.previewAvatarEmoji}>{getAvatarEmoji(selectedAvatarId)}</Text>
              </View>
              <Text style={styles.previewName}>{name.trim() || 'Explorer Name'}</Text>
              <Text style={styles.previewAgeGroup}>Age {age} • Group {age === 2 ? '2–3' : age === 3 ? '3–4' : age === 4 ? '4–5' : '5–6'} years</Text>

              {/* Mentor selection detail */}
              <View style={styles.previewMentorSection}>
                <Text style={styles.previewMentorLabel}>COMPANION</Text>
                {selectedMentor ? (
                  <View style={styles.previewMentorRow}>
                    <View style={[styles.previewMentorIcon, { backgroundColor: selectedMentor.color }]}>
                      <Ionicons name={selectedMentor.iconName as any} size={20} color={colors.white} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewMentorName}>{selectedMentor.name}</Text>
                      <Text style={styles.previewMentorDesc} numberOfLines={1}>{selectedMentor.description}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.previewNoMentor}>No companion selected.</Text>
                )}
                <AppButton
                  label="Choose Companion"
                  onPress={handlePickMentor}
                  variant="secondary"
                  style={styles.chooseMentorBtn}
                />
              </View>
            </View>

            <View style={styles.splitActions}>
              <AppButton
                label={storeLoading ? 'Saving...' : 'Save Profile'}
                onPress={handleSave}
                variant="primary"
                disabled={storeLoading}
              />
              <AppButton
                label="Cancel"
                onPress={() => navigation.goBack()}
                variant="secondary"
              />
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderLayout = () => {
    switch (deviceType) {
      case 'mobile': return renderMobile();
      case 'tablet': return renderTablet();
      case 'desktop': return renderTablet();
    }
  };

  return <ScreenContainer>{renderLayout()}</ScreenContainer>;
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
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
    gap: spacing.md,
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
  textInput: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
  },
  charCount: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
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
    padding: spacing.xl,
    backgroundColor: colors.background,
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
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
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
  previewMentorDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
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
