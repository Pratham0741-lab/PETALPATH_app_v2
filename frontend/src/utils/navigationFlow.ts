import { useRoadmapStore, Activity } from '../store/roadmapStore';
import { useVideoStore } from '../store/videoStore';
import { useListenStore } from '../store/listenStore';
import { useSpeakStore } from '../store/speakStore';
import { useWriteStore } from '../store/writeStore';
import { Alert } from 'react-native';

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

export const navigateToActivity = async (navigation: any, activity: Activity) => {
  if (activity.activityType === 'video') {
    try {
      await useVideoStore.getState().loadVideo(activity.id);
      navigation.navigate('Video');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load video');
    }
  } else if (activity.activityType === 'listen') {
    try {
      await useListenStore.getState().loadAudio(activity.id, activity.title);
      navigation.navigate('Listen');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load audio');
    }
  } else if (activity.activityType === 'speak') {
    try {
      await useSpeakStore.getState().loadSpeak(activity.id, activity.title);
      navigation.navigate('Speak');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load speak activity');
    }
  } else if (activity.activityType === 'write') {
    try {
      await useWriteStore.getState().loadWrite(activity.id, activity.title);
      navigation.navigate('Write');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load write activity');
    }
  }
};
