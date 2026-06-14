import React, { useEffect } from 'react';
import { StyleSheet, View, ScrollView, Text, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader } from '../../components/common/SectionHeader';
import { AvatarCard } from '../../components/cards/AvatarCard';
import { useChildStore } from '../../store/childStore';
import { useMentorStore } from '../../store/mentorStore';
import { enhanceMentor } from '../../constants/mentors';
import { spacing, colors, typography, radius, shadows } from '../../theme';

export const MentorDesktop: React.FC = () => {
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
      {loading && mentorList.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.purple} />
        </View>
      ) : (
        <View style={styles.layout}>
          {/* Left Side: Mentors Selection List */}
          <ScrollView style={styles.mainContent} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <SectionHeader title="Your Adventure Companions" subtitle="Select your buddy. Each buddy has their own custom lessons and fun facts!" />
            <View style={styles.grid}>
              {mentorList.map((mentor) => (
                <AvatarCard
                  key={mentor.id}
                  mentor={mentor}
                  selected={activeMentor?.id === mentor.id}
                  onPress={() => handleSelectMentor(mentor.id)}
                  style={styles.gridItem}
                />
              ))}
            </View>
          </ScrollView>

          {/* Right Side: Buddy Dashboard */}
          <View style={styles.sidebar}>
            <Text style={styles.sidebarTitle}>Companion Details</Text>
            {activeMentor ? (
              <View style={[styles.detailBox, { borderColor: activeMentor.color }]}>
                <View style={[styles.circle, { backgroundColor: activeMentor.color }]}>
                  <Text style={styles.circleLetter}>{activeMentor.name.charAt(0)}</Text>
                </View>
                <Text style={styles.name}>{activeMentor.name}</Text>
                <Text style={styles.species}>{activeMentor.species}</Text>
                
                <View style={styles.divider} />
                
                <Text style={styles.sectionHeader}>Fun Fact</Text>
                <Text style={styles.sectionText}>{activeMentor.funFact}</Text>
                
                <Text style={styles.sectionHeader}>Role</Text>
                <Text style={styles.sectionText}>{activeMentor.description}</Text>

                <View style={styles.divider} />
                
                <Text style={styles.sectionHeader}>Assigned Tasks</Text>
                <Text style={styles.taskText}>✓ Guides roadmap path</Text>
                <Text style={styles.taskText}>✓ Provides encouraging reminders</Text>
                <Text style={styles.taskText}>✓ Gives feedback on pronunciation</Text>
              </View>
            ) : (
              <View style={styles.emptyDetailBox}>
                <Text style={styles.emptyText}>No companion selected. Tap a buddy to choose one!</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
    borderRightWidth: 1.5,
    borderRightColor: colors.border,
  },
  scrollContainer: {
    paddingBottom: spacing.xxl,
  },
  grid: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  gridItem: {
    width: '48%',
  },
  sidebar: {
    width: 320,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  sidebarTitle: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  detailBox: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    ...shadows.sm,
  },
  circle: {
    width: 90,
    height: 90,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  circleLetter: {
    color: colors.background,
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.black,
  },
  name: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  species: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  divider: {
    height: 1.5,
    backgroundColor: colors.border,
    width: '100%',
    marginVertical: spacing.md,
  },
  sectionHeader: {
    color: colors.purple,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  sectionText: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    lineHeight: typography.lineHeights.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  taskText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyDetailBox: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    ...shadows.sm,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
});
