import { useRoadmapStore, Activity } from '../store/roadmapStore';
import { useVideoStore } from '../store/videoStore';
import { useListenStore } from '../store/listenStore';
import { useSpeakStore } from '../store/speakStore';
import { useWriteStore } from '../store/writeStore';
import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { normalizeActivityType } from './activityNormalization';

export const getNextActivity = (currentActivityId: string): Activity | null | undefined => {
  const { activities } = useRoadmapStore.getState();
  if (!activities || activities.length === 0) {
    return undefined;
  }
  const currentIndex = activities.findIndex(a => a.id === currentActivityId);
  if (currentIndex === -1) {
    return undefined;
  }
  if (currentIndex === activities.length - 1) {
    return null; // No next activity (end of sequence)
  }
  return activities[currentIndex + 1];
};

export const navigateToActivity = async (
  navigation: NativeStackNavigationProp<RootStackParamList>,
  activity: Activity,
) => {
  const normalizedType = normalizeActivityType(activity.activityType);
  if (normalizedType === 'video') {
    try {
      await useVideoStore.getState().loadVideo(activity.id, activity.title);
      navigation.navigate('Video');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load video');
    }
  } else if (normalizedType === 'listen') {
    try {
      await useListenStore.getState().loadAudio(activity.id, activity.title);
      navigation.navigate('Listen');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load audio');
    }
  } else if (normalizedType === 'speak') {
    try {
      await useSpeakStore.getState().loadSpeak(activity.id, activity.title);
      navigation.navigate('Speak');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load speak activity');
    }
  } else if (normalizedType === 'write') {
    try {
      await useWriteStore.getState().loadWrite(activity.id, activity.title);
      navigation.navigate('Write');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load write activity');
    }
  }
};

