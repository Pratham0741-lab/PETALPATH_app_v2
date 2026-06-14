import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useDeviceType } from '../hooks/useDeviceType';
import { colors } from '../theme';
import { useAppStore } from '../store/appStore';

// Screens
import HomeScreen from '../screens/home';
import JourneyScreen from '../screens/journey';
import MentorScreen from '../screens/mentor';
import RewardsScreen from '../screens/rewards';
import ProfileScreen from '../screens/profile';
import VideoScreen from '../screens/video';
import VideoCompletedScreen from '../screens/video/VideoCompletedScreen';
import ListenScreen from '../screens/listen';
import SpeakScreen from '../screens/speak';
import WriteScreen from '../screens/write';
import ProgressScreen from '../screens/progress';
import StoriesScreen from '../screens/stories';
import { useChildStore } from '../store/childStore';
import ChildSelectionScreen from '../screens/profile/ChildSelectionScreen';
import AddEditChildScreen from '../screens/profile/AddEditChildScreen';
import MentorSelectionScreen from '../screens/mentor/MentorSelectionScreen';
import LessonOverviewScreen from '../screens/lesson';
import LessonCompleteScreen from '../screens/lesson/LessonCompleteScreen';
import ModuleCompleteScreen from '../screens/lesson/ModuleCompleteScreen';
import CategoryCompleteScreen from '../screens/lesson/CategoryCompleteScreen';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';

// Custom Navigation Components
import { BottomNavigation } from '../components/navigation/BottomNavigation';
import { SidebarNavigation } from '../components/navigation/SidebarNavigation';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack Navigator
const AuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
};

// Mobile Tab Navigator
const MobileTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNavigation {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Journey" component={JourneyScreen} />
      <Tab.Screen name="Mentor" component={MentorScreen} />
      <Tab.Screen name="Rewards" component={RewardsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export const RootNavigator = () => {
  const deviceType = useDeviceType();
  const token = useAppStore((state) => state.token);
  const activeChild = useChildStore((state) => state.activeChild);
  const loadingSession = useAppStore((state) => state.loadingSession);
  const loadSession = useAppStore((state) => state.loadSession);

  React.useEffect(() => {
    loadSession();
  }, []);

  // Show a dark loading spinner on launch while storage is being queried
  if (loadingSession) {
    return (
      <View style={[styles.largeDeviceContainer, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.purple} />
      </View>
    );
  }

  // If user is not authenticated, restrict routing exclusively to AuthNavigator stack
  if (!token) {
    return <AuthNavigator />;
  }

  // If user has no active child profile selected, force Child Selection onboarding flow
  if (!activeChild) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ChildSelection" component={ChildSelectionScreen} />
        <Stack.Screen name="AddChild" component={AddEditChildScreen} />
        <Stack.Screen name="MentorSelection" component={MentorSelectionScreen} />
      </Stack.Navigator>
    );
  }

  if (deviceType === 'mobile') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MobileTabs} />
        <Stack.Screen name="LessonOverview" component={LessonOverviewScreen} />
        <Stack.Screen name="Video" component={VideoScreen} />
        <Stack.Screen name="VideoCompleted" component={VideoCompletedScreen} />
        <Stack.Screen name="Listen" component={ListenScreen} />
        <Stack.Screen name="Speak" component={SpeakScreen} />
        <Stack.Screen name="Write" component={WriteScreen} />
        <Stack.Screen name="LessonComplete" component={LessonCompleteScreen} />
        <Stack.Screen name="ModuleComplete" component={ModuleCompleteScreen} />
        <Stack.Screen name="CategoryComplete" component={CategoryCompleteScreen} />
        <Stack.Screen name="Progress" component={ProgressScreen} />
        <Stack.Screen name="Stories" component={StoriesScreen} />
        <Stack.Screen name="ChildSelection" component={ChildSelectionScreen} />
        <Stack.Screen name="AddChild" component={AddEditChildScreen} />
        <Stack.Screen name="MentorSelection" component={MentorSelectionScreen} />
      </Stack.Navigator>
    );
  }

  // Tablet & Desktop Layout: Row structure
  return (
    <View style={styles.largeDeviceContainer}>
      <SidebarNavigation deviceType={deviceType} />
      <View style={styles.contentArea}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'fade', // Clean cross-fade transition on larger displays
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="LessonOverview" component={LessonOverviewScreen} />
          <Stack.Screen name="Journey" component={JourneyScreen} />
          <Stack.Screen name="Mentor" component={MentorScreen} />
          <Stack.Screen name="Rewards" component={RewardsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Video" component={VideoScreen} />
          <Stack.Screen name="VideoCompleted" component={VideoCompletedScreen} />
          <Stack.Screen name="Listen" component={ListenScreen} />
          <Stack.Screen name="Speak" component={SpeakScreen} />
          <Stack.Screen name="Write" component={WriteScreen} />
          <Stack.Screen name="LessonComplete" component={LessonCompleteScreen} />
          <Stack.Screen name="ModuleComplete" component={ModuleCompleteScreen} />
          <Stack.Screen name="CategoryComplete" component={CategoryCompleteScreen} />
          <Stack.Screen name="Progress" component={ProgressScreen} />
          <Stack.Screen name="Stories" component={StoriesScreen} />
          <Stack.Screen name="ChildSelection" component={ChildSelectionScreen} />
          <Stack.Screen name="AddChild" component={AddEditChildScreen} />
          <Stack.Screen name="MentorSelection" component={MentorSelectionScreen} />
        </Stack.Navigator>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  largeDeviceContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  contentArea: {
    flex: 1,
    height: '100%',
  },
});
