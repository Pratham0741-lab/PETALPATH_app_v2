import React, { useEffect } from 'react';
import { StyleSheet, View, ScrollView, Text, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader } from '../../components/common/SectionHeader';
import { AvatarCard } from '../../components/cards/AvatarCard';
import { useChildStore } from '../../store/childStore';
import { useMentorStore } from '../../store/mentorStore';
import { enhanceMentor } from '../../constants/mentors';
import { spacing, colors, typography, radius } from '../../theme';

export const MentorTablet: React.FC = () => {
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
          {/* Left column: Mentors selection list */}
          <ScrollView style={styles.mainContent} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <SectionHeader title="Meet the Learning Buddies" subtitle="Tap on a buddy to choose them as your companion." />
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

          {/* Right column: Selected Mentor Detail Box */}
          <View style={styles.sidebar}>
            <Text style={styles.sidebarTitle}>Selected Buddy</Text>
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
    gap: spacing.md,
  },
  gridItem: {
    width: '48%',
  },
  sidebar: {
    width: 280,
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
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  circleLetter: {
    color: colors.background,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
  },
  name: {
    color: colors.text,
    fontSize: typography.sizes.lg,
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
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
});
