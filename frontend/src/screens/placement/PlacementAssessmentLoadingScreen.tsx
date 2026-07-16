import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { usePlacementResult } from '../../hooks/usePlacement';
import { colors, spacing, typography } from '../../theme';

type LoadingRouteParams = {
  PlacementAssessmentLoading: {
    attemptId: string;
  };
};

export const PlacementAssessmentLoadingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<LoadingRouteParams, 'PlacementAssessmentLoading'>>();
  const { attemptId } = route.params;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { data, isSuccess } = usePlacementResult(attemptId);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  useEffect(() => {
    if (isSuccess && data?.data) {
      const timer = setTimeout(() => {
        navigation.replace('PlacementAssessmentResult', { attemptId });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, data, attemptId, navigation]);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Animated.View style={[styles.iconWrap, { opacity: pulseAnim, transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="analytics" size={48} color={colors.purple} />
        </Animated.View>
        <LoadingSpinner label="Analyzing your responses…" />
        <Text style={styles.subtitle}>Calculating the best starting level for your child</Text>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${colors.purple}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});

export default PlacementAssessmentLoadingScreen;
