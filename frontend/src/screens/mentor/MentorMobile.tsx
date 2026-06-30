import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, ActivityIndicator, Pressable } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { SectionHeader, Card, Button, ProgressBar } from '../../components/ui';
import { useChildStore } from '../../store/childStore';
import { useMentorStore } from '../../store/mentorStore';
import { useRewardsStore } from '../../store/rewardsStore';
import { enhanceMentor } from '../../constants/mentors';
import { spacing, colors, typography, radius, shadows } from '../../theme';
import { AvatarCard } from '../../components/cards/AvatarCard';

export const MentorMobile: React.FC = () => {
  const activeChild = useChildStore((state) => state.activeChild);
  const updateChild = useChildStore((state) => state.updateChild);
  const { mentorList, refreshMentors, loading } = useMentorStore();
  const { totalStars } = useRewardsStore();

  const [petalPoints, setPetalPoints] = useState(totalStars === 0 ? 0 : 12);
  const [wateringMessage, setWateringMessage] = useState<string | null>(null);

  useEffect(() => {
    refreshMentors();
  }, []);

  useEffect(() => {
    setPetalPoints(totalStars === 0 ? 0 : 12);
  }, [totalStars]);

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

  const handleWaterTree = () => {
    setPetalPoints(prev => prev + 2);
    setWateringMessage("Splish splash! You watered the tree! 💧🌸 +2 Petal Points!");
    setTimeout(() => {
      setWateringMessage(null);
    }, 3000);
  };

  return (
    <ScreenContainer>
      <TopBar title="Magical Garden" />
      {loading && mentorList.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.purple} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* MAGICAL GARDEN INTERACTIVE VIEW */}
          <Card style={styles.gardenVisualCard}>
            <View style={styles.gardenVisualHeader}>
              <View style={styles.petalPointsBadge}>
                <Text style={styles.petalBadgeText}>🌸 {petalPoints} Petal Points</Text>
              </View>
              <Text style={styles.gardenWeather}>☀️ Sunny Day</Text>
            </View>

            {/* Tree & Character Scene */}
            <View style={styles.treeScene}>
              <Text style={styles.birdHouse}>🐦</Text>
              <Text style={styles.butterfly}>🦋</Text>
              <Text style={styles.treeEmoji}>🌳</Text>
              <View style={styles.mascotStand}>
                <Text style={styles.mascotEmoji}>{activeMentor ? '🐢' : '🦊'}</Text>
              </View>
            </View>

            {/* Water Tree CTA */}
            <View style={styles.wateringActionSection}>
              <Button
                label="Water the Tree 💧"
                variant="success"
                onPress={handleWaterTree}
                style={styles.waterBtn}
              />
              {wateringMessage && (
                <Text style={[styles.wateringSuccess, { fontFamily: typography.families.rounded }]}>
                  {wateringMessage}
                </Text>
              )}
            </View>
          </Card>

          {/* GARDEN TASKS / BUDDY CHOOSER */}
          <View style={styles.buddyChooserSection}>
            <SectionHeader
              title="Choose Your Learning Buddy"
              subtitle="Select a friendly buddy to help you read, write, and grow!"
            />
            
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
              <Card style={[styles.activeFactCard, { borderColor: activeMentor.color }]}>
                <Text style={[styles.factTitle, { color: activeMentor.color, fontFamily: typography.families.rounded }]}>
                  Fun Fact from {activeMentor.name.split(' ')[0]}!
                </Text>
                <Text style={[styles.factText, { fontFamily: typography.families.rounded }]}>
                  {activeMentor.funFact}
                </Text>
              </Card>
            )}
          </View>

        </ScrollView>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 100,
  },
  gardenVisualCard: {
    margin: spacing.lg,
    backgroundColor: '#E8F5E9', // Light green garden backdrop
    borderColor: '#C8E6C9',
    borderWidth: 2,
    alignItems: 'center',
    padding: spacing.md,
  },
  gardenVisualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  petalPointsBadge: {
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  petalBadgeText: {
    fontSize: typography.sizes.small,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  gardenWeather: {
    fontSize: typography.sizes.small,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  treeScene: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: spacing.md,
  },
  treeEmoji: {
    fontSize: 120,
    zIndex: 1,
  },
  birdHouse: {
    fontSize: 28,
    position: 'absolute',
    left: '25%',
    top: '30%',
    zIndex: 2,
  },
  butterfly: {
    fontSize: 24,
    position: 'absolute',
    right: '25%',
    top: '20%',
    zIndex: 2,
  },
  mascotStand: {
    position: 'absolute',
    bottom: 5,
    left: '42%',
    zIndex: 2,
  },
  mascotEmoji: {
    fontSize: 44,
  },
  wateringActionSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  waterBtn: {
    width: '80%',
    height: 48,
  },
  wateringSuccess: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buddyChooserSection: {
    marginTop: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  card: {
    marginBottom: spacing.xs,
  },
  activeFactCard: {
    margin: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
  },
  factTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  factText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    lineHeight: 18,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
export default MentorMobile;
