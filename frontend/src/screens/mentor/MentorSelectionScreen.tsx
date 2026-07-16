import React, { useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/layout/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useDeviceType } from '../../hooks/useDeviceType';
import { useApiQuery } from '../../hooks/useReactQuery';
import { queryKeys } from '../../utils/queryKeys';
import { apiClient } from '../../services/api/apiClient';
import { enhanceMentor } from '../../constants/mentors';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import type { ApiResponse } from '../../types/api';
import type { OnboardingStackParamList } from '../../types/navigation';

interface MentorData {
  id: string;
  name: string;
  characterType: string;
  personality: string;
  voiceStyle: string;
  description: string;
  imagePath: string;
}

interface EnhancedMentor extends MentorData {
  color: string;
  iconName: string;
  species: string;
  funFact: string;
}

export const MentorSelectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<OnboardingStackParamList, 'MentorSelection'>>();
  const deviceType = useDeviceType();

  const currentlySelectedId = route.params?.selectedMentorId || null;
  const returnScreen = route.params?.returnScreen || 'AddChild';

  const {
    data: mentorsResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useApiQuery(
    queryKeys.mentors.all,
    () => apiClient.get<ApiResponse<MentorData[]>>('/mentors'),
  );

  const mentorList: EnhancedMentor[] = (mentorsResponse?.data ?? []).map((m) => enhanceMentor(m)).filter(Boolean) as EnhancedMentor[];

  const pulseAnims = useRef<Map<string, Animated.Value>>(new Map()).current;

  const getPulseAnim = useCallback((id: string) => {
    if (!pulseAnims.has(id)) {
      pulseAnims.set(id, new Animated.Value(1));
    }
    return pulseAnims.get(id)!;
  }, [pulseAnims]);

  const handleSelectMentor = useCallback((mentorId: string) => {
    if (mentorId === currentlySelectedId) {
      navigation.navigate(returnScreen, { selectedMentorId: mentorId });
      return;
    }

    const anim = getPulseAnim(mentorId);
    anim.setValue(1);
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1.03, duration: 150, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start(() => {
      navigation.navigate(returnScreen, { selectedMentorId: mentorId });
    });
  }, [currentlySelectedId, getPulseAnim, navigation, returnScreen]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderSkeleton = () => (
    <View style={[
      styles.mentorCard,
      styles.skeletonCard,
      deviceType !== 'mobile' && styles.largeDeviceCard,
    ]}>
      <View style={styles.cardHeader}>
        <Skeleton variant="circle" width={56} height={56} />
        <View style={styles.headerInfo}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} style={{ marginTop: spacing.xs }} />
        </View>
      </View>
      <Skeleton width="100%" height={14} style={{ marginBottom: spacing.sm }} />
      <Skeleton width="90%" height={14} style={{ marginBottom: spacing.sm }} />
      <Skeleton variant="rect" width="100%" height={60} />
    </View>
  );

  const renderMentorCard = (mentor: EnhancedMentor) => {
    const isSelected = currentlySelectedId === mentor.id;
    const pulseAnim = getPulseAnim(mentor.id);

    return (
      <Animated.View
        key={mentor.id}
        style={[
          { transform: [{ scale: pulseAnim }] },
          deviceType !== 'mobile' && styles.largeDeviceCard,
        ]}
      >
        <Card
          onPress={() => handleSelectMentor(mentor.id)}
          variant={isSelected ? 'elevated' : 'outlined'}
          style={[
            styles.mentorCard,
            isSelected && { borderColor: mentor.color, borderWidth: 2.5 },
          ]}
          accessibilityLabel={`${mentor.name}, ${mentor.characterType}`}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.avatarCircle, { backgroundColor: mentor.color }]}>
              <Ionicons name={(mentor.iconName as any) ?? 'paw'} size={28} color={colors.white} />
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

          <Button
            label={isSelected ? 'Selected Companion' : 'Choose Companion'}
            onPress={() => handleSelectMentor(mentor.id)}
            variant={isSelected ? 'primary' : 'outline'}
            style={[
              styles.selectBtn,
              isSelected && { backgroundColor: mentor.color, borderColor: mentor.color },
            ]}
          />
        </Card>
      </Animated.View>
    );
  };

  return (
    <Screen
      scroll
      safeBottom
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          colors={[colors.purple]}
          tintColor={colors.purple}
        />
      }
    >
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Choose a Companion 🐾</Text>
      </View>

      {isLoading ? (
        <View style={styles.scrollContainer}>
          <Text style={styles.subtitle}>
            Select a learning guide to accompany your child on their writing adventures!
          </Text>
          <View style={[
            styles.gridContainer,
            deviceType !== 'mobile' && styles.largeGridContainer,
          ]}>
            {[1, 2, 3].map((i) => (
              <React.Fragment key={i}>{renderSkeleton()}</React.Fragment>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.scrollContainer}>
          <Text style={styles.subtitle}>
            Select a learning guide to accompany your child on their writing adventures!
          </Text>

          <View style={[
            styles.gridContainer,
            deviceType !== 'mobile' && styles.largeGridContainer,
          ]}>
            {mentorList.map(renderMentorCard)}
          </View>
        </View>
      )}
    </Screen>
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
  skeletonCard: {
    padding: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
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
