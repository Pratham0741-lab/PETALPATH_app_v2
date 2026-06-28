import React from 'react';
import { StyleSheet, View, ViewStyle, SafeAreaView, StatusBar, Platform } from 'react-native';
import { colors } from '../../theme';

import { useTutorialStore } from '../../store/tutorialStore';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({ children, style }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View 
        onTouchStart={() => useTutorialStore.getState().recordInteraction()}
        style={[styles.container, style]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    // Add top padding on Android if not handled by React Navigation header
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
