import { useRoadmapStore, Activity } from '../store/roadmapStore';
import { useVideoStore } from '../store/videoStore';
import { useListenStore } from '../store/listenStore';
import { useSpeakStore } from '../store/speakStore';
import { useWriteStore } from '../store/writeStore';
import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { normalizeActivityType } from './activityNormalization';

export const getNextActivity = (currentActivityId: string): Activity | null => {
  const { activities, selectedLesson } = useRoadmapStore.getState();
  
  // Use loaded activities or fallback to selectedLesson activities
  let actList = activities;
  if ((!actList || actList.length === 0) && selectedLesson?.activities) {
    actList = selectedLesson.activities;
  }

  // Filter out any identify activities
  if (actList) {
    actList = actList.filter(a => (a.activityType as string) !== 'identify' && !a.title?.toLowerCase().includes('identify'));
  }

  if (!actList || actList.length === 0) {
    return null;
  }

  // 1. Try finding by exact activityId
  let currentIndex = actList.findIndex(a => a.id === currentActivityId);

  // 2. Fallback: match by normalized activity type if currentActivityId is generic (e.g. 'video', 'placeholder-video-id')
  if (currentIndex === -1) {
    if (currentActivityId === 'placeholder-video-id' || currentActivityId === 'video' || currentActivityId.includes('video')) {
      currentIndex = actList.findIndex(a => normalizeActivityType(a.activityType) === 'video');
    } else if (currentActivityId === 'placeholder-audio-id' || currentActivityId === 'listen' || currentActivityId.includes('listen')) {
      currentIndex = actList.findIndex(a => normalizeActivityType(a.activityType) === 'listen');
    } else if (currentActivityId === 'placeholder-speak-id' || currentActivityId === 'speak' || currentActivityId.includes('speak')) {
      currentIndex = actList.findIndex(a => normalizeActivityType(a.activityType) === 'speak');
    } else if (currentActivityId === 'placeholder-write-id' || currentActivityId === 'write' || currentActivityId.includes('write')) {
      currentIndex = actList.findIndex(a => normalizeActivityType(a.activityType) === 'write');
    } else if (currentActivityId === 'placeholder-drag-id' || currentActivityId === 'drag' || currentActivityId.includes('drag')) {
      currentIndex = actList.findIndex(a => normalizeActivityType(a.activityType) === 'drag_drop');
    }
  }

  // 3. Fallback: if still -1, take the first activity after index 0 if multiple exist, or return null
  if (currentIndex === -1) {
    return actList.length > 1 ? actList[1] : null;
  }

  // 4. Check if it's the last activity in the lesson sequence
  if (currentIndex >= actList.length - 1) {
    return null; // No next activity (end of sequence for this lesson)
  }

  return actList[currentIndex + 1];
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
  } else if (normalizedType === 'drag_drop') {
    try {
      navigation.navigate('Game', {
        activityId: activity.id,
        dragDropSpec: (activity as any).dragDropSpec,
        title: activity.title,
      });
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load drag and drop activity');
    }
  }
};

