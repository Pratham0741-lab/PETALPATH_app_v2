import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppCard } from '../../components/cards/AppCard';
import { AppButton } from '../../components/buttons/AppButton';
import { useMentorStore, Mentor } from '../../store/mentorStore';
import { useDeviceType } from '../../hooks/useDeviceType';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

export const MentorSelectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const deviceType = useDeviceType();

  const { mentorList, refreshMentors, loading } = useMentorStore();
  const currentlySelectedId = route.params?.selectedMentorId || null;
  const returnScreen = route.params?.returnScreen || 'AddChild';

  useEffect(() => {
    refreshMentors();
  }, []);

  const handleSelectMentor = (mentorId: string) => {
    // Return selected mentor to previous screen
    navigation.navigate(returnScreen, { selectedMentorId: mentorId });
  };

  const renderMentorCard = (mentor: Mentor) => {
    const isSelected = currentlySelectedId === mentor.id;
    return (
      <AppCard
        key={mentor.id}
        outlined={isSelected}
        onPress={() => handleSelectMentor(mentor.id)}
        style={[
          styles.mentorCard,
          isSelected && { borderColor: mentor.color, borderWidth: 2.5 },
          deviceType !== 'mobile' && styles.largeDeviceCard,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatarCircle, { backgroundColor: mentor.color }]}>
            <Ionicons name={mentor.iconName as any} size={28} color={colors.white} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.mentorName}>{mentor.name}</Text>
            <Text style={[styles.characterType, { color: mentor.color }]}>
              {mentor.characterType.toUpperCase()}
            </Text>
          </View>
          {isSelected && (
            <View style={styles.selectedBadge}>
              <Ionicons name="checkmark-circle" size={24} color={mentor.color} />
            </View>
          )}
        </View>

        <View style={styles.detailsGroup}>
          <Text style={styles.description}>{mentor.description}</Text>
          
          <View style={styles.metadataContainer}>
            <View style={styles.metaRow}>
              <Ionicons name="sparkles-outline" size={14} color={colors.textMuted} style={styles.metaIcon} />
              <Text style={styles.metaText}>
                <Text style={styles.metaBold}>Personality: </Text>{mentor.personality}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="volume-medium-outline" size={14} color={colors.textMuted} style={styles.metaIcon} />
              <Text style={styles.metaText}>
                <Text style={styles.metaBold}>Voice Style: </Text>{mentor.voiceStyle}
              </Text>
            </View>
          </View>
        </View>

        <AppButton
          label={isSelected ? 'Selected Companion' : 'Choose Companion'}
          onPress={() => handleSelectMentor(mentor.id)}
          variant={isSelected ? 'primary' : 'secondary'}
          style={[
            styles.selectBtn,
            isSelected && { backgroundColor: mentor.color },
          ]}
        />
      </AppCard>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Choose a Companion 🐾</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.purple} style={styles.loader} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.subtitle}>
            Select a learning guide to accompany your child on their writing adventures!
          </Text>

          <View style={[
            styles.gridContainer,
            deviceType !== 'mobile' && styles.largeGridContainer,
          ]}>
            {mentorList.map(renderMentorCard)}
          </View>
        </ScrollView>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: spacing.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: typography.lineHeights.sm,
  },
  gridContainer: {
    gap: spacing.md,
  },
  largeGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  mentorCard: {
    padding: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  largeDeviceCard: {
    width: '45%',
    minWidth: 320,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    ...shadows.sm,
  },
  headerInfo: {
    flex: 1,
  },
  mentorName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  characterType: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    letterSpacing: 1,
    marginTop: 2,
  },
  selectedBadge: {
    padding: spacing.xs,
  },
  detailsGroup: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    lineHeight: typography.lineHeights.sm,
  },
  metadataContainer: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    marginRight: spacing.sm,
  },
  metaText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
  },
  metaBold: {
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
  },
  selectBtn: {
    marginTop: 'auto',
  },
});

export default MentorSelectionScreen;
