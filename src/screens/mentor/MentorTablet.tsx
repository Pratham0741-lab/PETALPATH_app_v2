import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Text, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader, Card, Button } from '../../components/ui';
import { AvatarCard } from '../../components/cards/AvatarCard';
import { useChildStore } from '../../store/childStore';
import { useMentorStore } from '../../store/mentorStore';
import { enhanceMentor } from '../../constants/mentors';
import { spacing, colors, typography, radius, shadows } from '../../theme';

export const MentorTablet: React.FC = () => {
  const activeChild = useChildStore((state) => state.activeChild);
  const updateChild = useChildStore((state) => state.updateChild);
  const { mentorList, refreshMentors, loading } = useMentorStore();

  const [petalPoints, setPetalPoints] = useState(12);
  const [wateringMessage, setWateringMessage] = useState<string | null>(null);

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

  const handleWaterTree = () => {
    setPetalPoints(prev => prev + 2);
    setWateringMessage("You watered the tree! 💧🌸 +2 Petal Points!");
    setTimeout(() => {
      setWateringMessage(null);
    }, 3000);
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

          {/* Right column: Magical Garden Scene & Selected Buddy Details */}
          <ScrollView style={styles.sidebar} contentContainerStyle={styles.sidebarContent} showsVerticalScrollIndicator={false}>
            
            {/* MAGICAL GARDEN INTERACTIVE VIEW */}
            <Card style={styles.gardenVisualCard}>
              <View style={styles.gardenVisualHeader}>
                <Text style={[styles.petalBadgeText, { fontFamily: typography.families.rounded }]}>🌸 {petalPoints} Petals</Text>
                <Text style={styles.gardenWeather}>☀️ Sunny</Text>
              </View>

              <View style={styles.treeScene}>
                <Text style={styles.birdHouse}>🐦</Text>
                <Text style={styles.butterfly}>🦋</Text>
                <Text style={styles.treeEmoji}>🌳</Text>
                <View style={styles.mascotStand}>
                  <Text style={styles.mascotEmoji}>{activeMentor ? '🐢' : '🦊'}</Text>
                </View>
              </View>

              <Button
                label="Water Tree 💧"
                variant="success"
                onPress={handleWaterTree}
                style={styles.waterBtn}
              />
              {wateringMessage && (
                <Text style={[styles.wateringSuccess, { fontFamily: typography.families.rounded }]}>
                  {wateringMessage}
                </Text>
              )}
            </Card>

            {/* Selected Buddy Detail Box */}
            <Text style={[styles.sidebarTitle, { fontFamily: typography.families.rounded }]}>Selected Buddy</Text>
            {activeMentor ? (
              <Card style={[styles.detailBox, { borderColor: activeMentor.color }]}>
                <Text style={[styles.name, { color: activeMentor.color, fontFamily: typography.families.rounded }]}>{activeMentor.name}</Text>
                <Text style={[styles.species, { fontFamily: typography.families.rounded }]}>{activeMentor.species}</Text>
                
                <View style={styles.divider} />
                
                <Text style={[styles.sectionTitle, { color: activeMentor.color, fontFamily: typography.families.rounded }]}>Fun Fact</Text>
                <Text style={[styles.sectionText, { fontFamily: typography.families.rounded }]}>{activeMentor.funFact}</Text>
                
                <Text style={[styles.sectionTitle, { color: activeMentor.color, fontFamily: typography.families.rounded }]}>Description</Text>
                <Text style={[styles.sectionText, { fontFamily: typography.families.rounded }]}>{activeMentor.description}</Text>
              </Card>
            ) : (
              <Card style={styles.emptyDetailBox}>
                <Text style={[styles.emptyText, { fontFamily: typography.families.rounded }]}>No buddy selected yet!</Text>
              </Card>
            )}
          </ScrollView>
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  mainContent: {
    flex: 1.2,
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
    flex: 0.8,
    backgroundColor: colors.background,
  },
  sidebarContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  gardenVisualCard: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
    borderWidth: 2,
    alignItems: 'center',
  },
  gardenVisualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  petalBadgeText: {
    fontSize: typography.sizes.small,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  gardenWeather: {
    fontSize: typography.sizes.small,
    color: colors.textSecondary,
  },
  treeScene: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: spacing.sm,
  },
  treeEmoji: {
    fontSize: 90,
  },
  birdHouse: {
    fontSize: 22,
    position: 'absolute',
    left: '30%',
    top: '20%',
  },
  butterfly: {
    fontSize: 18,
    position: 'absolute',
    right: '30%',
    top: '10%',
  },
  mascotStand: {
    position: 'absolute',
    bottom: 0,
    left: '42%',
  },
  mascotEmoji: {
    fontSize: 36,
  },
  waterBtn: {
    width: '100%',
    height: 44,
  },
  wateringSuccess: {
    fontSize: 11,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 4,
  },
  sidebarTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sectionTitle,
    fontWeight: typography.weights.bold,
    marginTop: spacing.md,
  },
  detailBox: {
    borderWidth: 2,
  },
  name: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.bold,
  },
  species: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  divider: {
    height: 1.5,
    backgroundColor: colors.border,
    width: '100%',
    marginVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyDetailBox: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
export default MentorTablet;
