import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { ChatBubble } from '../../components/ai-tutor/ChatBubble';
import { TypingIndicator } from '../../components/ai-tutor/TypingIndicator';
import { HintCard } from '../../components/ai-tutor/HintCard';
import { RewardOverlay } from '../../components/activities/RewardOverlay';
import {
  useAITutorSession,
  useSendAITutorMessage,
  useCompleteAITutorSession,
} from '../../hooks/useIntelligence';
import { useActivitySync } from '../../hooks/useActivitySync';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography, radius } from '../../theme';
import type { RewardData } from '../../components/activities/types';

type AITutorChatRouteParams = {
  AITutorChat: { sessionId: string };
};

interface MessageLike {
  id: string;
  role: 'ai' | 'child';
  content: string;
  timestamp: string;
  isOptimistic?: boolean;
}

const MemoizedChatBubble = React.memo(ChatBubble);

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export const AITutorChatScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<AITutorChatRouteParams, 'AITutorChat'>>();
  const { sessionId } = route.params;
  const { theme } = useTheme();
  const { colors } = theme;
  const { width: windowWidth } = useWindowDimensions();
  const { syncAfterActivity } = useActivitySync();

  const { data, isLoading, isError, refetch } = useAITutorSession(sessionId);
  const sendMessage = useSendAITutorMessage();
  const completeSession = useCompleteAITutorSession();

  const [inputText, setInputText] = useState('');
  const [optimisticMessages, setOptimisticMessages] = useState<MessageLike[]>([]);
  const [isWaitingAI, setIsWaitingAI] = useState(false);
  const [hintState, setHintState] = useState<{
    hints: string[];
    currentIndex: number;
    showAnswer: boolean;
    answer?: string;
  } | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [rewardData, setRewardData] = useState<RewardData | null>(null);
  const [completing, setCompleting] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const isTablet = windowWidth >= 768;

  const session = data?.data;
  const serverMessages: MessageLike[] = useMemo(
    () =>
      (session?.messages ?? []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
    [session?.messages],
  );

  const allMessages = useMemo(() => {
    const merged = [...serverMessages, ...optimisticMessages];
    merged.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    return merged;
  }, [serverMessages, optimisticMessages]);

  useEffect(() => {
    if (allMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  }, [allMessages.length]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || isWaitingAI) return;

    const optimisticId = `opt-${Date.now()}`;
    const optimistic: MessageLike = {
      id: optimisticId,
      role: 'child',
      content: text,
      timestamp: new Date().toISOString(),
      isOptimistic: true,
    };

    setOptimisticMessages((prev) => [...prev, optimistic]);
    setInputText('');
    setIsWaitingAI(true);
    setHintState(null);

    sendMessage.mutate(
      { sessionId, message: text },
      {
        onSuccess: (response) => {
          const reply = response.data?.reply;
          const updatedSession = response.data?.session;
          if (reply) {
            const aiMessage: MessageLike = {
              id: `ai-${Date.now()}`,
              role: 'ai',
              content: reply,
              timestamp: new Date().toISOString(),
            };
            setOptimisticMessages((prev) =>
              prev.filter((m) => m.id !== optimisticId),
            );
            setOptimisticMessages((prev) => [...prev, aiMessage]);
          }
          if (updatedSession?.messages) {
            refetch();
          }
          setIsWaitingAI(false);
        },
        onError: () => {
          setOptimisticMessages((prev) =>
            prev.filter((m) => m.id !== optimisticId),
          );
          setIsWaitingAI(false);
        },
      },
    );
  }, [inputText, isWaitingAI, sessionId, sendMessage, refetch]);

  const handleComplete = useCallback(() => {
    setCompleting(true);
    completeSession.mutate(sessionId, {
      onSuccess: (response) => {
        setCompleting(false);
        const masteryGained = response.data?.masteryGained ?? 0;
        setRewardData({
          xpGained: Math.round(masteryGained * 2),
          coinsEarned: Math.round(masteryGained * 1.5),
          starsEarned: masteryGained > 50 ? 3 : masteryGained > 25 ? 2 : 1,
          newBadges: [],
          masteryIncrease: masteryGained,
          unlockedLessons: [],
          levelUp: false,
        });
        setShowReward(true);
        syncAfterActivity();
      },
      onError: () => {
        setCompleting(false);
      },
    });
  }, [sessionId, completeSession, syncAfterActivity]);

  const handleDismissReward = useCallback(() => {
    setShowReward(false);
    navigation.goBack();
  }, [navigation]);

  const handleShowNextHint = useCallback(() => {
    setHintState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentIndex: Math.min(prev.currentIndex + 1, prev.hints.length - 1),
      };
    });
  }, []);

  const handleShowAnswer = useCallback(() => {
    setHintState((prev) => {
      if (!prev) return prev;
      return { ...prev, showAnswer: true };
    });
  }, []);

  const isActive = session?.status === 'active';

  const renderMessage = useCallback(
    ({ item }: { item: MessageLike }) => (
      <MemoizedChatBubble
        role={item.role}
        content={item.content}
        timestamp={
          item.timestamp
            ? new Date(item.timestamp).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })
            : undefined
        }
        isStreaming={item.isOptimistic && item.role === 'ai'}
      />
    ),
    [],
  );

  const keyExtractor = useCallback((item: MessageLike) => item.id, []);

  const renderHeader = () => {
    if (!session) return null;
    return (
      <View style={styles.listHeader}>
        {hintState && (
          <HintCard
            hints={hintState.hints}
            currentHintIndex={hintState.currentIndex}
            onShowNext={handleShowNextHint}
            onShowAnswer={handleShowAnswer}
            showAnswer={hintState.showAnswer}
            answer={hintState.answer}
          />
        )}
        {isActive && (
          <Button
            title="Complete Session"
            onPress={handleComplete}
            variant="success"
            size="sm"
            loading={completing}
            disabled={completing}
            leftIcon={<Ionicons name="checkmark-circle" size={16} color={colors.textInverse} />}
            style={styles.completeButton}
            accessibilityLabel="Complete AI tutor session"
          />
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Skeleton variant="circle" width={64} height={64} style={styles.skeletonIcon} />
          <Skeleton variant="text" width={200} height={20} style={styles.skeletonText} />
          <Skeleton variant="rect" width="100%" height={80} style={styles.skeletonText} />
          <Skeleton variant="rect" width="100%" height={80} style={styles.skeletonText} />
        </View>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState
            title="Could not load session"
            message="Failed to load the AI tutor session."
            onRetry={refetch}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (!session) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState title="Session not found" message="This session does not exist." />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.header, isTablet && styles.headerTablet]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTopic} numberOfLines={1}>
              {session.topic}
            </Text>
            <View style={styles.headerMeta}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isActive
                      ? `${colors.success}20`
                      : `${colors.textMuted}20`,
                  },
                ]}
                accessibilityLabel={
                  isActive ? 'Session active' : 'Session completed'
                }
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: isActive
                        ? colors.success
                        : colors.textMuted,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: isActive ? colors.success : colors.textMuted },
                  ]}
                >
                  {isActive ? 'Active' : 'Completed'}
                </Text>
              </View>
              <Text style={styles.durationText}>
                {formatDuration(session.duration)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.chatContainer, isTablet && styles.chatContainerTablet]}>
          <FlatList
            ref={flatListRef}
            data={allMessages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            inverted
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }}
          />

          {isWaitingAI && <TypingIndicator />}
        </View>

        <View style={[styles.inputBar, isTablet && styles.inputBarTablet]}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            multiline
            accessibilityLabel="Message input"
            accessibilityHint="Type your message to the AI tutor"
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || isWaitingAI}
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  inputText.trim() && !isWaitingAI
                    ? colors.primary
                    : colors.textMuted,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !inputText.trim() || isWaitingAI }}
          >
            <Ionicons
              name="send"
              size={20}
              color={colors.textInverse}
            />
          </Pressable>
        </View>

        <RewardOverlay
          visible={showReward}
          reward={rewardData}
          onDismiss={handleDismissReward}
        />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  skeletonIcon: {
    marginBottom: spacing.lg,
  },
  skeletonText: {
    marginBottom: spacing.md,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1E4D3',
  },
  headerTablet: {
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  headerTopic: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: '#3B342F',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  durationText: {
    fontSize: typography.sizes.xs,
    color: '#A09A95',
  },
  chatContainer: {
    flex: 1,
  },
  chatContainerTablet: {
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  listHeader: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  completeButton: {
    marginTop: spacing.md,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1E4D3',
    backgroundColor: '#FFFFFF',
  },
  inputBarTablet: {
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#FBF5EE',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.body,
    color: '#3B342F',
    marginRight: spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
