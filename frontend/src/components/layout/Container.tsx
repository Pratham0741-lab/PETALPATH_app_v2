import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { spacing } from '../../theme';
import { useDeviceType } from '../../hooks/useDeviceType';

interface ContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  padded?: boolean;
  style?: ViewStyle;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  maxWidth = 1200,
  padded = false,
  style,
}) => {
  const deviceType = useDeviceType();
  const isCentered = deviceType === 'tablet' || deviceType === 'desktop';

  return (
    <View
      style={[
        styles.container,
        isCentered && { maxWidth, alignSelf: 'center', width: '100%' },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
});
