import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { TopBar } from '../../../components/navigation/TopBar';
import { Card, Button } from '../../../components/ui';
import { colors, typography, spacing, radius, shadows } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';
import catalogData from '../catalog/activities.generated.json';

interface CameraActivityItem {
  id: string;
  title: string;
  description: string;
  validatorName: string;
  category: string;
  repetitions: number;
  holdDuration: number;
  difficulty: string;
  instruction: string;
  reward: {
    stars: number;
    xp: number;
  };
}

export const CameraExplorerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter out meta entries and get valid camera activities
  const allActivities: CameraActivityItem[] = (catalogData.activities as any[]).filter(
    (act) => act.id !== 'petalpath_real_time_camera_based_activities_mvp' && act.id !== 'lesson'
  );

  const categories = [
    { id: 'all', label: 'All Activities', icon: 'sparkles' },
    { id: 'body_movements', label: 'Body Movements', icon: 'body' },
    { id: 'upper_body', label: 'Upper Body', icon: 'fitness' },
    { id: 'balance', label: 'Balance & Focus', icon: 'leaf' },
  ];

  const filteredActivities = allActivities.filter((act) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'body_movements') return act.category === 'body_movements';
    if (selectedCategory === 'upper_body') return act.validatorName.toLowerCase().includes('hand') || act.validatorName.toLowerCase().includes('head');
    if (selectedCategory === 'balance') return act.validatorName.toLowerCase().includes('balance') || act.validatorName.toLowerCase().includes('leg');
    return true;
  });

  const handleStartActivity = (act: CameraActivityItem) => {
    // Map validator or id to supported pose ActivityType
    let poseType = 'raise_hands';
    if (act.validatorName.includes('Head')) poseType = 'touch_head';
    else if (act.validatorName.includes('Shoulders') || act.validatorName.includes('Hands')) poseType = 'raise_hands';

    const targetNav = navigation.getParent() || navigation;
    targetNav.navigate('CameraActivityLesson', {
      lessonId: `les_cam_${act.id}`,
      activityId: act.id,
      activityType: poseType,
    });
  };

  const handleCalibrate = () => {
    const targetNav = navigation.getParent() || navigation;
    targetNav.navigate('Calibration');
  };

  return (
    <ScreenContainer style={styles.container}>
      <TopBar title="Camera Activities" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Section */}
        <Card style={styles.bannerCard}>
          <View style={styles.bannerRow}>
            <View style={styles.bannerIconCircle}>
              <Ionicons name="camera" size={32} color="#FFF8ED" />
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={[styles.bannerTitle, { fontFamily: typography.families.rounded }]}>
                Interactive Motion & Pose
              </Text>
              <Text style={[styles.bannerSubtitle, { fontFamily: typography.families.rounded }]}>
                Use your camera to do fun physical exercises with Penny Panda!
              </Text>
            </View>
          </View>
          <Button
            label="🎯 Calibrate Camera Position"
            variant="secondary"
            onPress={handleCalibrate}
            style={styles.calibrateBtn}
          />
        </Card>

        {/* Category Filters */}
        <View style={styles.categoryRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  style={({ pressed }) => [
                    styles.chip,
                    isSelected && styles.chipSelected,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={16}
                    color={isSelected ? '#FFF8ED' : colors.textPrimary}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                      { fontFamily: typography.families.rounded },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Activities List */}
        <Text style={[styles.sectionTitle, { fontFamily: typography.families.rounded }]}>
          Available Motion Challenges ({filteredActivities.length})
        </Text>

        <View style={styles.cardsGrid}>
          {filteredActivities.map((act) => (
            <Card key={act.id} style={styles.activityCard}>
              <View style={styles.cardHeader}>
                <View style={styles.badgeRow}>
                  <View style={styles.diffBadge}>
                    <Text style={[styles.diffText, { fontFamily: typography.families.rounded }]}>
                      {act.difficulty.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.rewardBadge}>
                    <Ionicons name="star" size={14} color={colors.yellow} />
                    <Text style={[styles.rewardText, { fontFamily: typography.families.rounded }]}>
                      +{act.reward.stars} Stars • +{act.reward.xp} XP
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={[styles.cardTitle, { fontFamily: typography.families.rounded }]}>
                {act.title}
              </Text>
              <Text style={[styles.cardInstruction, { fontFamily: typography.families.rounded }]}>
                {act.instruction}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="repeat" size={16} color={colors.purple} />
                  <Text style={[styles.metaText, { fontFamily: typography.families.rounded }]}>
                    {act.repetitions} Reps
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color={colors.purple} />
                  <Text style={[styles.metaText, { fontFamily: typography.families.rounded }]}>
                    {(act.holdDuration / 1000).toFixed(1)}s Hold
                  </Text>
                </View>
              </View>

              <Button
                label="Start Camera Activity 📷"
                variant="primary"
                onPress={() => handleStartActivity(act)}
                style={styles.startBtn}
              />
            </Card>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  bannerCard: {
    backgroundColor: '#3B342F',
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radius.card,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  bannerIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    color: '#FFF8ED',
    fontSize: typography.sizes.largeTitle,
    fontWeight: typography.weights.black,
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: '#E6DAC4',
    fontSize: typography.sizes.small,
    lineHeight: 18,
  },
  calibrateBtn: {
    height: 44,
  },
  categoryRow: {
    marginBottom: spacing.lg,
  },
  categoryScroll: {
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
  },
  chipTextSelected: {
    color: '#FFF8ED',
  },
  sectionTitle: {
    fontSize: typography.sizes.largeTitle,
    fontWeight: typography.weights.black,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  cardsGrid: {
    gap: spacing.md,
  },
  activityCard: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  diffBadge: {
    backgroundColor: 'rgba(139, 120, 216, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.chip,
  },
  diffText: {
    color: colors.purple,
    fontSize: 10,
    fontWeight: 'bold',
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(247, 215, 78, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.chip,
  },
  rewardText: {
    color: colors.brown,
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
    color: colors.textPrimary,
  },
  cardInstruction: {
    fontSize: typography.sizes.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginVertical: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: typography.sizes.small,
    color: colors.textSecondary,
    fontWeight: typography.weights.bold,
  },
  startBtn: {
    marginTop: spacing.xs,
    height: 46,
  },
});

export default CameraExplorerScreen;
