import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../../theme';
import { ProgressBar } from '../../../components/ui';

interface XPBarProps {
  progress: number;
  height?: number;
  showLabel?: boolean;
  color?: string;
}

const XPBar: React.FC<XPBarProps> = ({ progress, height, showLabel, color }) => {
  return (
    <View style={styles.wrapper}>
      <ProgressBar
        progress={progress}
        height={height}
        color={color ?? colors.primary}
        showPercentage={showLabel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
});

export default XPBar;
