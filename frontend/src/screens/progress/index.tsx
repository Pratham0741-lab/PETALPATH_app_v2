import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { Card, Button, ProgressBar, EmotionCard } from '../../components/ui';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { useProgressStore } from '../../store/progressStore';
import { Ionicons } from '@expo/vector-icons';

type TabType = 'overview' | 'skills' | 'emotions';

export const ProgressScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);

  const {
    completionPercentage,
    completedLessonsCount,
    totalLessonsCount,
    refreshProgress,
  } = useProgressStore();

  useEffect(() => {
    refreshProgress();
  }, []);

  const emotionsList = [
    { emoji: '😊', label: 'Happy', color: '#FFF3CD' },
    { emoji: '🤩', label: 'Excited', color: '#F8D7DA' },
    { emoji: '😌', label: 'Calm', color: '#D1E7DD' },
    { emoji: '😢', label: 'Sad', color: '#CFE2FF' },
    { emoji: '😡', label: 'Frustrated', color: '#F5C2C7' },
    { emoji: '😴', label: 'Tired', color: '#E2E3E5' },
  ];

  return (
    <ScreenContainer>
      <TopBar title="My Progress" showBack />
      
      {/* Custom Tabs Navigation */}
      <View style={styles.tabBar}>
        {(['overview', 'skills', 'emotions'] as TabType[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabItem,
                isActive && styles.tabItemActive
              ]}
            >
              <Text style={[
                styles.tabLabel,
                { 
                  color: isActive ? '#FFF8ED' : colors.textSecondary,
                  fontFamily: typography.families.rounded,
                }
              ]}>
                {tab.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            
            {/* Learning Streak Card */}
            <Card style={[styles.streakCard, { backgroundColor: '#FFF5F0' }]}>
              <View style={styles.streakRow}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <View style={styles.streakText}>
                  <Text style={[styles.streakCount, { fontFamily: typography.families.rounded }]}>7 Days In a Row!</Text>
                  <Text style={[styles.streakDesc, { fontFamily: typography.families.rounded }]}>Keep up the wonderful learning streak!</Text>
                </View>
              </View>
            </Card>

            {/* Overall Progress Seedling Card */}
            <Card style={styles.overallProgressCard}>
              <Text style={[styles.overallTitle, { fontFamily: typography.families.rounded }]}>Overall Progress</Text>
              <View style={styles.seedlingRow}>
                <Text style={styles.seedlingEmoji}>🌱</Text>
                <View style={styles.seedlingText}>
                  <Text style={[styles.overallPercentText, { fontFamily: typography.families.rounded }]}>{completionPercentage}%</Text>
                  <Text style={[styles.completedRatio, { fontFamily: typography.families.rounded }]}>
                    {completedLessonsCount} of {totalLessonsCount} activities completed
                  </Text>
                </View>
              </View>
              <ProgressBar progress={completionPercentage} color={colors.green} style={styles.largeProgress} />
            </Card>

            {/* Quick Skills breakdown card */}
            <Card style={styles.breakdownCard}>
              <Text style={[styles.breakdownTitle, { fontFamily: typography.families.rounded }]}>Skills Level</Text>
              
              <View style={styles.skillItem}>
                <View style={styles.skillHeader}>
                  <Text style={[styles.skillName, { fontFamily: typography.families.rounded }]}>Math & Numbers</Text>
                  <Text style={[styles.skillValue, { fontFamily: typography.families.rounded }]}>72%</Text>
                </View>
                <ProgressBar progress={72} color={colors.blue} />
              </View>

              <View style={styles.skillItem}>
                <View style={styles.skillHeader}>
                  <Text style={[styles.skillName, { fontFamily: typography.families.rounded }]}>Language & Stories</Text>
                  <Text style={[styles.skillValue, { fontFamily: typography.families.rounded }]}>64%</Text>
                </View>
                <ProgressBar progress={64} color={colors.purple} />
              </View>

              <View style={styles.skillItem}>
                <View style={styles.skillHeader}>
                  <Text style={[styles.skillName, { fontFamily: typography.families.rounded }]}>Creativity & Drawing</Text>
                  <Text style={[styles.skillValue, { fontFamily: typography.families.rounded }]}>81%</Text>
                </View>
                <ProgressBar progress={81} color={colors.pink} />
              </View>
            </Card>

          </View>
        )}

        {/* SKILLS TAB */}
        {activeTab === 'skills' && (
          <View style={styles.tabContent}>
            <Card style={styles.detailedCard}>
              <Text style={[styles.detailedTitle, { fontFamily: typography.families.rounded }]}>My Subject Skills</Text>
              
              <View style={styles.detailItem}>
                <View style={styles.detailIconBg}>
                  <Text style={styles.detailIconEmoji}>📖</Text>
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailName, { fontFamily: typography.families.rounded }]}>Listening & Reading</Text>
                  <ProgressBar progress={68} color={colors.peach} style={styles.detailBar} />
                  <Text style={[styles.detailSubText, { fontFamily: typography.families.rounded }]}>Understands phonics and story sequences</Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <View style={styles.detailIconBg}>
                  <Text style={styles.detailIconEmoji}>🔢</Text>
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailName, { fontFamily: typography.families.rounded }]}>Counting & Math</Text>
                  <ProgressBar progress={75} color={colors.blue} style={styles.detailBar} />
                  <Text style={[styles.detailSubText, { fontFamily: typography.families.rounded }]}>Counts to 10 and identifies shapes</Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <View style={styles.detailIconBg}>
                  <Text style={styles.detailIconEmoji}>✏️</Text>
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailName, { fontFamily: typography.families.rounded }]}>Tracing & Motor Skills</Text>
                  <ProgressBar progress={84} color={colors.green} style={styles.detailBar} />
                  <Text style={[styles.detailSubText, { fontFamily: typography.families.rounded }]}>Draws straight lines and basic arcs</Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* EMOTIONS TAB */}
        {activeTab === 'emotions' && (
          <View style={styles.tabContent}>
            <Card style={styles.emotionSectionCard}>
              <Text style={[styles.emotionSectionTitle, { fontFamily: typography.families.rounded }]}>How are you feeling today?</Text>
              <Text style={[styles.emotionSectionSubtitle, { fontFamily: typography.families.rounded }]}>
                Select an emoji to share your feelings!
              </Text>
              
              <View style={styles.emotionGrid}>
                {emotionsList.map((emotion) => (
                  <EmotionCard
                    key={emotion.label}
                    emoji={emotion.emoji}
                    label={emotion.label}
                    color={emotion.color}
                    selected={selectedEmotion === emotion.label}
                    onPress={() => setSelectedEmotion(emotion.label)}
                    style={styles.emotionItemCard}
                  />
                ))}
              </View>

              {selectedEmotion && (
                <View style={[styles.emotionFeedback, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.emotionFeedbackText, { fontFamily: typography.families.rounded }]}>
                    It's wonderful to feel {selectedEmotion.toLowerCase()}! Let's do some cozy learning activities. 🌸
                  </Text>
                </View>
              )}
            </Card>
          </View>
        )}

        <Button label="Back to Journey" variant="secondary" onPress={() => navigation.goBack()} style={styles.backBtn} />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    padding: spacing.xs,
  },
  tabItem: {
    flex: 1,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md,
  },
  tabItemActive: {
    backgroundColor: colors.purple,
  },
  tabLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: 60,
    gap: spacing.md,
  },
  tabContent: {
    gap: spacing.md,
  },
  streakCard: {
    borderWidth: 1.5,
    borderColor: colors.orange,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  streakEmoji: {
    fontSize: 48,
  },
  streakText: {
    flex: 1,
    gap: 2,
  },
  streakCount: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.black,
    color: colors.orange,
  },
  streakDesc: {
    fontSize: typography.sizes.small,
    color: colors.textSecondary,
  },
  overallProgressCard: {
    gap: spacing.md,
  },
  overallTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  seedlingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  seedlingEmoji: {
    fontSize: 48,
  },
  seedlingText: {
    flex: 1,
  },
  overallPercentText: {
    fontSize: 34,
    fontWeight: typography.weights.black,
    color: colors.green,
  },
  completedRatio: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
  },
  largeProgress: {
    height: 14,
    borderRadius: radius.xs,
  },
  breakdownCard: {
    gap: spacing.md,
  },
  breakdownTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  skillItem: {
    gap: 6,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skillName: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  skillValue: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  detailedCard: {
    gap: spacing.lg,
  },
  detailedTitle: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  detailItem: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  detailIconBg: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: '#F8EEDC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  detailIconEmoji: {
    fontSize: 24,
  },
  detailContent: {
    flex: 1,
    gap: 2,
  },
  detailName: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  detailBar: {
    height: 8,
    marginVertical: 2,
  },
  detailSubText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  emotionSectionCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  emotionSectionTitle: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emotionSectionSubtitle: {
    fontSize: typography.sizes.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  emotionItemCard: {
    width: '28%',
    height: 100,
  },
  emotionFeedback: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    width: '100%',
  },
  emotionFeedbackText: {
    fontSize: typography.sizes.small,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 18,
  },
  backBtn: {
    width: '100%',
    marginTop: spacing.md,
  },
});
export default ProgressScreen;
