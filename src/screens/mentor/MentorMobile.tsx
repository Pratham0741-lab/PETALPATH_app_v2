import React, { useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { SectionHeader } from '../../components/common/SectionHeader';
import { AvatarCard } from '../../components/cards/AvatarCard';
import { useChildStore } from '../../store/childStore';
import { useMentorStore } from '../../store/mentorStore';
import { enhanceMentor } from '../../constants/mentors';
import { spacing, colors, typography, radius } from '../../theme';

export const MentorMobile: React.FC = () => {
  const activeChild = useChildStore((state) => state.activeChild);
  const updateChild = useChildStore((state) => state.updateChild);
  const { mentorList, refreshMentors, loading } = useMentorStore();

  useEffect(() => {
    refreshMentors();
  }, []);

  const activeMentor = activeChild?.mentor ? enhanceMentor(activeChild.mentor) : null;

  const handleSelectMentor = async (mentorId: string) => {
    if (activeChild) {
      try {
        await updateChild(activeChild.id, { mentorId });
      } catch (err) {
        console.error('Failed to update companion mentor', err);
      }
    }
  };

  return (
    <ScreenContainer>
      <TopBar title="My Buddy" />
      {loading && mentorList.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.purple} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <SectionHeader title="Choose Your Learning Buddy" subtitle="Select a friendly buddy to help you read, write, and play!" />
          <View style={styles.list}>
            {mentorList.map((mentor) => (
              <AvatarCard
                key={mentor.id}
                mentor={mentor}
                selected={activeMentor?.id === mentor.id}
                onPress={() => handleSelectMentor(mentor.id)}
                style={styles.card}
              />
            ))}
          </View>

          {activeMentor && (
            <View style={[styles.activeDetails, { borderColor: activeMentor.color }]}>
              <Text style={[styles.detailsTitle, { color: activeMentor.color }]}>Fun Fact from {activeMentor.name.split(' ')[0]}!</Text>
              <Text style={styles.detailsText}>{activeMentor.funFact}</Text>
            </View>
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: spacing.xxl,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    marginBottom: spacing.sm,
  },
  activeDetails: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  detailsTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  detailsText: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    lineHeight: typography.lineHeights.sm,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
