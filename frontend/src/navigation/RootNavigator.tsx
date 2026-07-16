import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useDeviceType } from '../hooks/useDeviceType';
import { colors } from '../theme';
import { useAppStore } from '../store/appStore';

// Screens
import HomeScreen from '../screens/home';
import { ParentDashboardScreen } from '../screens/dashboard/ParentDashboardScreen';
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
import StoryDetailScreen from '../screens/stories/StoryDetailScreen';
import StoryReaderScreen from '../screens/stories/StoryReaderScreen';
import StoryCompletionScreen from '../screens/stories/StoryCompletionScreen';
import { useChildStore } from '../store/childStore';
import ChildSelectionScreen from '../screens/profile/ChildSelectionScreen';
import AddEditChildScreen from '../screens/profile/AddEditChildScreen';
import MentorSelectionScreen from '../screens/mentor/MentorSelectionScreen';
import NotificationPermissionScreen from '../screens/onboarding/NotificationPermissionScreen';
import TutorialScreen from '../screens/onboarding/TutorialScreen';
import LessonOverviewScreen from '../screens/lesson';
import { LessonScreen } from '../screens/lesson/LessonScreen';
import { ModuleScreen } from '../screens/curriculum/ModuleScreen';
import { RoadmapScreen } from '../screens/journey/RoadmapScreen';
import LessonCompleteScreen from '../screens/lesson/LessonCompleteScreen';
import ModuleCompleteScreen from '../screens/lesson/ModuleCompleteScreen';
import CategoryCompleteScreen from '../screens/lesson/CategoryCompleteScreen';
import { RecommendationsScreen } from '../screens/recommendations/RecommendationsScreen';
import { QuizScreen } from '../screens/quiz';
import { GameScreen } from '../screens/game';
import { AITutorScreen, AITutorHomeScreen, AITutorChatScreen, AITutorHistoryScreen } from '../screens/ai-tutor';
import { AdaptiveProfileScreen } from '../screens/adaptive';
import { MasteryScreen } from '../screens/mastery';
import { ReinforcementQueueScreen } from '../screens/reinforcement';
import { ReadingScreen } from '../screens/reading';
import AssessmentCenterScreen from '../screens/assessment/AssessmentCenterScreen';
import AssessmentSessionScreen from '../screens/assessment/AssessmentSessionScreen';
import AssessmentResultScreen from '../screens/assessment/AssessmentResultScreen';
import { RewardsDashboardScreen } from '../screens/gamification/RewardsDashboardScreen';
import { BadgeGalleryScreen } from '../screens/gamification/badges/BadgeGalleryScreen';
import { BadgeDetailScreen } from '../screens/gamification/badges/BadgeDetailScreen';
import { AchievementsScreen } from '../screens/gamification/achievements/AchievementsScreen';
import { AchievementDetailScreen } from '../screens/gamification/achievements/AchievementDetailScreen';
import { DailyChallengesScreen } from '../screens/gamification/challenges/DailyChallengesScreen';
import { NotificationPreferencesScreen } from '../screens/gamification/notifications/NotificationPreferencesScreen';
import PlacementAssessmentIntroScreen from '../screens/placement/PlacementAssessmentIntroScreen';
import PlacementAssessmentSessionScreen from '../screens/placement/PlacementAssessmentSessionScreen';
import PlacementAssessmentQuestionScreen from '../screens/placement/PlacementAssessmentQuestionScreen';
import PlacementAssessmentLoadingScreen from '../screens/placement/PlacementAssessmentLoadingScreen';
import PlacementAssessmentResultScreen from '../screens/placement/PlacementAssessmentResultScreen';
import NotificationCenterScreen from '../screens/notifications/NotificationCenterScreen';
import CurriculumExplorerScreen from '../screens/curriculum/CurriculumExplorerScreen';
import SkillDetailScreen from '../screens/curriculum/SkillDetailScreen';
import {
  ParentDashboardScreen as ParentDashScreen,
  AnalyticsScreen,
  SkillMasteryScreen,
  CurriculumInsightsScreen,
  LearningHistoryScreen,
  WeeklyReportScreen,
  MonthlyReportScreen,
} from '../screens/parent';

// Auth Screens
import { SplashScreen } from '../screens/auth/SplashScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { ParentProfileScreen } from '../screens/auth/ParentProfileScreen';

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
      <Stack.Screen name="ParentProfile" component={ParentProfileScreen} />
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
      <Tab.Screen name="Home" component={ParentDashboardScreen} />
      <Tab.Screen name="Journey" component={RoadmapScreen} />
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

  // Show animated splash screen on launch while session is being hydrated
  if (loadingSession) {
    return <SplashScreen />;
  }

  // If user is not authenticated, restrict routing exclusively to AuthNavigator stack
  if (!token) {
    return <AuthNavigator />;
  }

  // If user has no active child profile selected, force onboarding flow
  if (!activeChild) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ParentProfile" component={ParentProfileScreen} />
        <Stack.Screen name="ChildSelection" component={ChildSelectionScreen} />
        <Stack.Screen name="AddChild" component={AddEditChildScreen} />
        <Stack.Screen name="MentorSelection" component={MentorSelectionScreen} />
        <Stack.Screen name="NotificationPermission" component={NotificationPermissionScreen} />
        <Stack.Screen name="Tutorial" component={TutorialScreen} />
      </Stack.Navigator>
    );
  }

  if (deviceType === 'mobile') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MobileTabs} />
        <Stack.Screen name="LessonOverview" component={LessonOverviewScreen} />
        <Stack.Screen name="Lesson" component={LessonScreen} />
        <Stack.Screen name="Module" component={ModuleScreen} />
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
        <Stack.Screen name="StoryDetail" component={StoryDetailScreen} />
        <Stack.Screen name="StoryReader" component={StoryReaderScreen} />
        <Stack.Screen name="StoryCompletion" component={StoryCompletionScreen} />
        <Stack.Screen name="Quiz" component={QuizScreen} />
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen name="AITutor" component={AITutorScreen} />
        <Stack.Screen name="AITutorSession" component={AITutorScreen} />
        <Stack.Screen name="AITutorHome" component={AITutorHomeScreen} />
        <Stack.Screen name="AITutorChat" component={AITutorChatScreen} />
        <Stack.Screen name="AITutorHistory" component={AITutorHistoryScreen} />
        <Stack.Screen name="AdaptiveProfile" component={AdaptiveProfileScreen} />
        <Stack.Screen name="Mastery" component={MasteryScreen} />
        <Stack.Screen name="ReinforcementQueue" component={ReinforcementQueueScreen} />
        <Stack.Screen name="Reading" component={ReadingScreen} />
        <Stack.Screen name="ParentDashboard" component={ParentDashScreen} />
        <Stack.Screen name="Analytics" component={AnalyticsScreen} />
        <Stack.Screen name="SkillMastery" component={SkillMasteryScreen} />
        <Stack.Screen name="CurriculumInsights" component={CurriculumInsightsScreen} />
        <Stack.Screen name="LearningHistory" component={LearningHistoryScreen} />
        <Stack.Screen name="WeeklyReport" component={WeeklyReportScreen} />
        <Stack.Screen name="MonthlyReport" component={MonthlyReportScreen} />
        <Stack.Screen name="ParentProfile" component={ParentProfileScreen} />
        <Stack.Screen name="ChildSelection" component={ChildSelectionScreen} />
        <Stack.Screen name="AddChild" component={AddEditChildScreen} />
        <Stack.Screen name="MentorSelection" component={MentorSelectionScreen} />
        <Stack.Screen name="NotificationPermission" component={NotificationPermissionScreen} />
        <Stack.Screen name="Tutorial" component={TutorialScreen} />
        <Stack.Screen name="Recommendations" component={RecommendationsScreen} />
        <Stack.Screen name="AssessmentCenter" component={AssessmentCenterScreen} />
        <Stack.Screen name="AssessmentSession" component={AssessmentSessionScreen} />
        <Stack.Screen name="AssessmentResult" component={AssessmentResultScreen} />
        <Stack.Screen name="RewardsDashboard" component={RewardsDashboardScreen} />
        <Stack.Screen name="BadgeGallery" component={BadgeGalleryScreen} />
        <Stack.Screen name="BadgeDetail" component={BadgeDetailScreen} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} />
        <Stack.Screen name="AchievementDetail" component={AchievementDetailScreen} />
        <Stack.Screen name="DailyChallenges" component={DailyChallengesScreen} />
        <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
        <Stack.Screen name="PlacementAssessmentIntro" component={PlacementAssessmentIntroScreen} />
        <Stack.Screen name="PlacementAssessmentSession" component={PlacementAssessmentSessionScreen} />
        <Stack.Screen name="PlacementAssessmentQuestion" component={PlacementAssessmentQuestionScreen} />
        <Stack.Screen name="PlacementAssessmentLoading" component={PlacementAssessmentLoadingScreen} />
        <Stack.Screen name="PlacementAssessmentResult" component={PlacementAssessmentResultScreen} />
        <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
        <Stack.Screen name="CurriculumExplorer" component={CurriculumExplorerScreen} />
        <Stack.Screen name="SkillDetail" component={SkillDetailScreen} />
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
          <Stack.Screen name="Home" component={ParentDashboardScreen} />
          <Stack.Screen name="LessonOverview" component={LessonOverviewScreen} />
          <Stack.Screen name="Lesson" component={LessonScreen} />
          <Stack.Screen name="Module" component={ModuleScreen} />
          <Stack.Screen name="Journey" component={RoadmapScreen} />
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
          <Stack.Screen name="StoryDetail" component={StoryDetailScreen} />
          <Stack.Screen name="StoryReader" component={StoryReaderScreen} />
          <Stack.Screen name="StoryCompletion" component={StoryCompletionScreen} />
          <Stack.Screen name="Quiz" component={QuizScreen} />
          <Stack.Screen name="Game" component={GameScreen} />
          <Stack.Screen name="AITutor" component={AITutorScreen} />
          <Stack.Screen name="AITutorSession" component={AITutorScreen} />
          <Stack.Screen name="AITutorHome" component={AITutorHomeScreen} />
          <Stack.Screen name="AITutorChat" component={AITutorChatScreen} />
          <Stack.Screen name="AITutorHistory" component={AITutorHistoryScreen} />
          <Stack.Screen name="AdaptiveProfile" component={AdaptiveProfileScreen} />
          <Stack.Screen name="Mastery" component={MasteryScreen} />
          <Stack.Screen name="ReinforcementQueue" component={ReinforcementQueueScreen} />
          <Stack.Screen name="Reading" component={ReadingScreen} />
          <Stack.Screen name="ParentDashboard" component={ParentDashScreen} />
          <Stack.Screen name="Analytics" component={AnalyticsScreen} />
          <Stack.Screen name="SkillMastery" component={SkillMasteryScreen} />
          <Stack.Screen name="CurriculumInsights" component={CurriculumInsightsScreen} />
          <Stack.Screen name="LearningHistory" component={LearningHistoryScreen} />
          <Stack.Screen name="WeeklyReport" component={WeeklyReportScreen} />
          <Stack.Screen name="MonthlyReport" component={MonthlyReportScreen} />
          <Stack.Screen name="ParentProfile" component={ParentProfileScreen} />
          <Stack.Screen name="ChildSelection" component={ChildSelectionScreen} />
          <Stack.Screen name="AddChild" component={AddEditChildScreen} />
          <Stack.Screen name="MentorSelection" component={MentorSelectionScreen} />
          <Stack.Screen name="NotificationPermission" component={NotificationPermissionScreen} />
          <Stack.Screen name="Tutorial" component={TutorialScreen} />
          <Stack.Screen name="Recommendations" component={RecommendationsScreen} />
          <Stack.Screen name="AssessmentCenter" component={AssessmentCenterScreen} />
          <Stack.Screen name="AssessmentSession" component={AssessmentSessionScreen} />
          <Stack.Screen name="AssessmentResult" component={AssessmentResultScreen} />
        <Stack.Screen name="RewardsDashboard" component={RewardsDashboardScreen} />
        <Stack.Screen name="BadgeGallery" component={BadgeGalleryScreen} />
        <Stack.Screen name="BadgeDetail" component={BadgeDetailScreen} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} />
        <Stack.Screen name="AchievementDetail" component={AchievementDetailScreen} />
        <Stack.Screen name="DailyChallenges" component={DailyChallengesScreen} />
        <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
          <Stack.Screen name="PlacementAssessmentIntro" component={PlacementAssessmentIntroScreen} />
          <Stack.Screen name="PlacementAssessmentSession" component={PlacementAssessmentSessionScreen} />
          <Stack.Screen name="PlacementAssessmentQuestion" component={PlacementAssessmentQuestionScreen} />
          <Stack.Screen name="PlacementAssessmentLoading" component={PlacementAssessmentLoadingScreen} />
          <Stack.Screen name="PlacementAssessmentResult" component={PlacementAssessmentResultScreen} />
          <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
          <Stack.Screen name="CurriculumExplorer" component={CurriculumExplorerScreen} />
          <Stack.Screen name="SkillDetail" component={SkillDetailScreen} />
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
