import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Screen } from '../layout/Screen';
import { useTutorialStore } from '../../store/tutorialStore';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({ children, style }) => {
  return (
    <Screen
      safeTop
      safeBottom
      contentContainerStyle={style}
    >
      <View
        onTouchStart={() => useTutorialStore.getState().recordInteraction()}
        style={{ flex: 1 }}
      >
        {children}
      </View>
    </Screen>
  );
};
