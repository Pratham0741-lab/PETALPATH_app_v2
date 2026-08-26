import React, { useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/layout/Screen';
import { Button } from '../../components/ui/Button';
import { useSettingsStore } from '../../store/settingsStore';
import { colors, spacing, typography, radius, shadows } from '../../theme';

interface SlideData {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
}

const SLIDES: SlideData[] = [
  {
    icon: 'map-outline',
    iconColor: colors.primary,
    iconBg: '#F5ECFF',
    title: 'Explore the Roadmap',
    description: 'Learn at your own pace through a structured learning path designed just for your child.',
  },
  {
    icon: 'game-controller-outline',
    iconColor: colors.blue,
    iconBg: '#EEF2FF',
    title: 'Interactive Lessons',
    description: 'Video, listening, speaking, and writing activities that make learning fun and engaging.',
  },
  {
    icon: 'star-outline',
    iconColor: colors.yellow,
    iconBg: '#FFF9E6',
    title: 'Earn Rewards',
    description: 'Collect stars and unlock achievements as your child progresses through each lesson.',
  },
  {
    icon: 'chatbubbles-outline',
    iconColor: colors.green,
    iconBg: '#EDF7E8',
    title: 'AI Tutor',
    description: 'Get personalized help from your AI companion who adapts to your child\'s learning style.',
  },
  {
    icon: 'analytics-outline',
    iconColor: colors.orange,
    iconBg: '#FFF3ED',
    title: 'Track Progress',
    description: 'See how far you\'ve come with detailed analytics on strengths, areas for growth, and more.',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH;

export const TutorialScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { setOnboardingComplete, setHasSeenTutorial } = useSettingsStore();

  const isLastSlide = currentIndex === SLIDES.length - 1;

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SLIDE_WIDTH);
    setCurrentIndex(index);
  }, []);

  const handleContinue = useCallback(() => {
    if (isLastSlide) {
      setHasSeenTutorial(true);
      setOnboardingComplete(true);
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  }, [isLastSlide, currentIndex, setHasSeenTutorial, setOnboardingComplete, navigation]);

  const handleSkip = useCallback(() => {
    setHasSeenTutorial(true);
    setOnboardingComplete(true);
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  }, [setHasSeenTutorial, setOnboardingComplete, navigation]);

  const renderSlide = ({ item }: { item: SlideData }) => (
    <View style={[styles.slide, { width: SLIDE_WIDTH }]}>
      <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
        <Ionicons name={item.icon} size={64} color={item.iconColor} />
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideDescription}>{item.description}</Text>
    </View>
  );

  const keyExtractor = (_item: SlideData, index: number) => String(index);

  return (
    <Screen safeBottom>
      <View style={styles.skipContainer}>
        <TouchableOpacity
          onPress={handleSkip}
          style={styles.skipButton}
          accessibilityLabel="Skip tutorial"
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      />

      <View style={styles.footer}>
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
              accessibilityLabel={index === currentIndex ? 'Current slide' : `Slide ${index + 1}`}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            label={isLastSlide ? 'Start Learning!' : 'Continue'}
            onPress={handleContinue}
            variant="primary"
            fullWidth
            size="lg"
            accessibilityLabel={isLastSlide ? 'Start learning now' : 'Continue to next slide'}
          />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  skipContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  skipButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    fontWeight: typography.weights.medium,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.huge,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
    ...shadows.md,
  },
  slideTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  slideDescription: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: typography.lineHeights.md,
    paddingHorizontal: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
    borderRadius: radius.full,
  },
  dotInactive: {
    backgroundColor: colors.border,
  },
  buttonContainer: {
    width: '100%',
  },
});

export default TutorialScreen;
