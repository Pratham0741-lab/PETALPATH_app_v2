import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  StyleSheet,
  StatusBar,
  RefreshControlProps,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  safeTop?: boolean;
  safeBottom?: boolean;
  keyboardAvoid?: boolean;
  backgroundColor?: string;
  contentContainerStyle?: ViewStyle;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  edges?: Edge[];
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  scroll = false,
  padded = false,
  safeTop = true,
  safeBottom = true,
  keyboardAvoid = false,
  backgroundColor = colors.background,
  contentContainerStyle,
  refreshControl,
  edges,
}) => {
  const resolvedEdges = (
    edges ??
    (safeTop && safeBottom ? ['top', 'bottom'] as const :
     safeTop ? ['top'] as const :
     safeBottom ? ['bottom'] as const :
     [])
  ) as ('top' | 'bottom')[];

  const innerContent = (
    <View
      style={[
        styles.content,
        { backgroundColor },
        contentContainerStyle,
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      {scroll ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={padded ? styles.padded : undefined}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.staticContent, padded && styles.padded]}>
          {children}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={resolvedEdges} style={[styles.safeArea, { backgroundColor }]}>
      {keyboardAvoid ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {innerContent}
        </KeyboardAvoidingView>
      ) : (
        innerContent
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  staticContent: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
});
