import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography } from '../../theme';

interface ChatBubbleProps {
  role: 'ai' | 'child';
  content: string;
  timestamp?: string;
  isStreaming?: boolean;
}

function renderMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={`t-${lastIndex}`}>{text.slice(lastIndex, match.index)}</Text>,
      );
    }

    const token = match[0];
    if (token.startsWith('***') && token.endsWith('***')) {
      parts.push(
        <Text key={`m-${match.index}`} style={{ fontWeight: '700', fontStyle: 'italic' }}>
          {token.slice(3, -3)}
        </Text>,
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <Text key={`m-${match.index}`} style={{ fontWeight: '700' }}>
          {token.slice(2, -2)}
        </Text>,
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <Text key={`m-${match.index}`} style={{ fontStyle: 'italic' }}>
          {token.slice(1, -1)}
        </Text>,
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(<Text key={`t-${lastIndex}`}>{text.slice(lastIndex)}</Text>);
  }

  return parts;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  role,
  content,
  timestamp,
  isStreaming = false,
}) => {
  const { theme } = useTheme();
  const { colors } = theme;

  const cursorOpacity = useSharedValue(1);

  useEffect(() => {
    if (isStreaming) {
      cursorOpacity.value = withRepeat(
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      cursorOpacity.value = 1;
    }
  }, [isStreaming, cursorOpacity]);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  const isAI = role === 'ai';

  const renderedContent = useMemo(() => renderMarkdown(content), [content]);

  return (
    <View
      style={[
        styles.wrapper,
        isAI ? styles.wrapperAI : styles.wrapperChild,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${isAI ? 'AI' : 'You'}: ${content}`}
    >
      {isAI && (
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="hardware-chip-outline" size={16} color={colors.primaryDark} />
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isAI
            ? { backgroundColor: colors.primaryLight, borderBottomLeftRadius: radius.xs }
            : { backgroundColor: colors.secondary, borderBottomRightRadius: radius.xs },
          isAI ? styles.bubbleAI : styles.bubbleChild,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            { color: isAI ? colors.text : colors.textInverse },
          ]}
        >
          {renderedContent}
          {isStreaming && (
            <Animated.Text style={[styles.cursor, cursorStyle]}>|</Animated.Text>
          )}
        </Text>

        {timestamp && (
          <Text
            style={[
              styles.timestamp,
              { color: isAI ? colors.textMuted : colors.textInverse },
            ]}
          >
            {timestamp}
          </Text>
        )}
      </View>

      {!isAI && (
        <View style={[styles.iconContainer, { backgroundColor: colors.secondaryLight }]}>
          <Ionicons name="person" size={16} color={colors.secondary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  wrapperAI: {
    justifyContent: 'flex-start',
  },
  wrapperChild: {
    justifyContent: 'flex-end',
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  bubbleAI: {
    borderBottomLeftRadius: radius.xs,
  },
  bubbleChild: {
    borderBottomRightRadius: radius.xs,
  },
  messageText: {
    fontSize: typography.sizes.body,
    lineHeight: typography.lineHeights.md,
    fontFamily: typography.families.rounded,
  },
  cursor: {
    fontSize: typography.sizes.body,
    fontFamily: typography.families.rounded,
  },
  timestamp: {
    fontSize: typography.sizes.caption,
    marginTop: spacing.xs,
    fontFamily: typography.families.rounded,
  },
});
