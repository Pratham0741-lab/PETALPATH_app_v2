import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { Card, Button } from '../../components/ui';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export const StoriesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [currentPage, setCurrentPage] = useState(1);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const storyPages = [
    {
      page: 1,
      emoji: '🦊🌳',
      text: "Once upon a time in the whispering woods, Benny the Fox found a magical golden leaf that glowed under the moonlight.",
    },
    {
      page: 2,
      emoji: '🦉💫',
      text: "He carried the leaf to Oliver the Wise Owl, who lived in the hollow of a tall magical oak tree.",
    },
    {
      page: 3,
      emoji: '🐢🌸',
      text: "Together with Toby the Turtle, they planted the golden leaf in the center of the garden, causing a beautiful flower tree to bloom!",
    },
  ];

  const totalPages = storyPages.length;
  const currentStory = storyPages[currentPage - 1];

  const handleNextPage = () => {
    setIsPlayingAudio(false);
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    setIsPlayingAudio(false);
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handlePlayAudio = () => {
    setIsPlayingAudio(prev => !prev);
  };

  return (
    <ScreenContainer>
      <TopBar title="Forest Stories" showBack />
      <View style={styles.content}>
        
        {/* Story Illustration Card */}
        <Card style={styles.illustrationCard}>
          <View style={styles.imageBackdrop}>
            <Text style={styles.storyEmoji}>{currentStory.emoji}</Text>
          </View>
          
          <Text style={[styles.storyText, { fontFamily: typography.families.rounded }]}>
            {currentStory.text}
          </Text>

          {/* Audio Button */}
          <Pressable
            onPress={handlePlayAudio}
            style={({ pressed }) => [
              styles.audioButton,
              isPlayingAudio && styles.audioPlaying,
              { transform: [{ scale: pressed ? 0.95 : 1 }] }
            ]}
          >
            <Ionicons name={isPlayingAudio ? 'volume-high' : 'volume-mute'} size={24} color="#FFF8ED" />
            <Text style={[styles.audioText, { fontFamily: typography.families.rounded }]}>
              {isPlayingAudio ? 'Speaking...' : 'Listen Story'}
            </Text>
          </Pressable>
        </Card>

        {/* Page Indicators */}
        <View style={styles.pageIndicatorContainer}>
          {storyPages.map((p) => (
            <View
              key={p.page}
              style={[
                styles.dot,
                currentPage === p.page && styles.activeDot
              ]}
            />
          ))}
        </View>

        {/* Soft Controls */}
        <View style={styles.controlsRow}>
          <Button
            label="Back"
            variant="secondary"
            disabled={currentPage === 1}
            onPress={handlePrevPage}
            style={[styles.navBtn, currentPage === 1 && styles.disabledBtn]}
          />
          <Button
            label={currentPage === totalPages ? 'Finish' : 'Next'}
            variant="primary"
            onPress={currentPage === totalPages ? () => navigation.goBack() : handleNextPage}
            style={styles.navBtn}
          />
        </View>

      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  illustrationCard: {
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  imageBackdrop: {
    width: '100%',
    height: 180,
    backgroundColor: '#F5EEDC', // cozy secondary backer
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  storyEmoji: {
    fontSize: 72,
  },
  storyText: {
    fontSize: typography.sizes.body,
    lineHeight: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: typography.weights.medium,
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blue,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
    gap: spacing.xs,
    ...shadows.sm,
  },
  audioPlaying: {
    backgroundColor: colors.green,
  },
  audioText: {
    color: '#FFF8ED',
    fontSize: typography.sizes.small,
    fontWeight: 'bold',
  },
  pageIndicatorContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  activeDot: {
    backgroundColor: colors.purple,
    width: 24,
  },
  controlsRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 500,
    gap: spacing.md,
  },
  navBtn: {
    flex: 1,
  },
  disabledBtn: {
    opacity: 0.4,
  },
});
export default StoriesScreen;
