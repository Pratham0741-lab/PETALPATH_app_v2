import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { useActivitySync } from '../../hooks/useActivitySync';
import { useSubmitQuiz } from '../../hooks/useActivityProgress';
import { activityApi } from '../../services/api/activityApi';
import type { QuizData, QuizQuestion, RewardData } from '../../components/activities/types';
import { spacing, typography, radius, iconSizes } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';

type QuizRouteParams = { Quiz: { activityId: string } };
type Phase = 'loading' | 'error' | 'empty' | 'ready' | 'playing' | 'submitting' | 'submit-error' | 'results';
type QuestionResult = { question: QuizQuestion; userAnswer: string; isCorrect: boolean };
interface SubmitResponse { score: number; stars: number; totalQuestions: number; correctCount: number; reward?: RewardData; }

function serializeAnswer(q: QuizQuestion, raw: string | string[] | Record<string, string>): string {
  if (q.questionType === 'multiple_choice') return (raw as string[]).sort().join(',');
  if (q.questionType === 'ordering') return (raw as string[]).join(',');
  if (q.questionType === 'matching') return JSON.stringify(raw);
  return raw as string;
}

function gradeQuestion(q: QuizQuestion, ans: string): boolean {
  if (!q.correctAnswer) return false;
  if (q.questionType === 'single_choice') return ans === q.correctAnswer;
  if (q.questionType === 'multiple_choice') return ans.split(',').sort().join(',') === q.correctAnswer.split(',').sort().join(',');
  if (q.questionType === 'fill_blank') return ans.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
  if (q.questionType === 'ordering') { const a = ans.split(','), c = q.correctAnswer.split(','); return a.length === c.length && a.every((v, i) => v === c[i]); }
  if (q.questionType === 'matching') { try { return JSON.stringify(JSON.parse(ans)) === JSON.stringify(JSON.parse(q.correctAnswer)); } catch { return false; } }
  return false;
}

function formatTime(s: number): string { const m = Math.floor(s / 60); return `${m}:${(s % 60).toString().padStart(2, '0')}`; }

function answerLabel(q: QuizQuestion, ans: string): string {
  if (!ans) return '(no answer)';
  if (q.questionType === 'matching') { try { return Object.entries(JSON.parse(ans)).map(([k, v]) => `${k} → ${v}`).join(', '); } catch { return ans; } }
  if (q.questionType === 'ordering') return ans.split(',').join(' → ');
  if (q.questionType === 'multiple_choice') { const opts = q.options ?? []; return ans.split(',').map(v => opts.find(o => o.value === v)?.label ?? v).join(', '); }
  return ans;
}

export const QuizScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<QuizRouteParams, 'Quiz'>>();
  const { activityId } = route.params;
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { syncAfterActivity } = useActivitySync();
  const submitMutation = useSubmitQuiz();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDesktop = windowWidth >= 768;

  const [phase, setPhase] = useState<Phase>('loading');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [matchingSelected, setMatchingSelected] = useState<string | null>(null);

  const { data: response, isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: ['quiz', activityId],
    queryFn: () => activityApi.getQuiz(activityId),
  });

  const quizData = response?.data ?? null;
  const questions = useMemo(() => (quizData?.questions ?? []).slice().sort((a, b) => a.order - b.order), [quizData?.questions]);
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  useEffect(() => { setMatchingSelected(null); }, [currentIndex]);

  useEffect(() => {
    if (isLoading) setPhase('loading');
    else if (isError) setPhase('error');
    else if (!quizData || totalQuestions === 0) setPhase('empty');
    else setPhase('ready');
  }, [isLoading, isError, quizData, totalQuestions]);

  useEffect(() => {
    if (timeLimit !== null && timeLimit > 0 && phase === 'playing') {
      setTimeRemaining(timeLimit);
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) { clearInterval(timerRef.current!); timerRef.current = null; handleSubmit(); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [timeLimit, phase]);

  const handleStart = useCallback(() => {
    const tl = (quizData as QuizData & { timeLimit?: number }).timeLimit;
    if (tl && tl > 0) setTimeLimit(tl);
    setPhase('playing');
  }, [quizData]);

  const handleAnswer = useCallback((questionId: string, raw: string | string[] | Record<string, string>) => {
    const q = questions.find(x => x.id === questionId);
    if (q) setAnswers(prev => ({ ...prev, [questionId]: serializeAnswer(q, raw) }));
  }, [questions]);

  const handleNext = useCallback(() => setCurrentIndex(i => Math.min(i + 1, totalQuestions - 1)), [totalQuestions]);
  const handlePrev = useCallback(() => setCurrentIndex(i => Math.max(i - 1, 0)), []);

  const handleSubmit = useCallback(async () => {
    if (totalQuestions === 0) return;
    setPhase('submitting');
    setSubmitError(null);
    const results = questions.map(q => ({ question: q, userAnswer: answers[q.id] ?? '', isCorrect: gradeQuestion(q, answers[q.id] ?? '') }));
    setQuestionResults(results);
    try {
      const res = await submitMutation.mutateAsync({ activityId, answers: questions.map(q => ({ questionId: q.id, answer: answers[q.id] ?? '' })) });
      if (res.success && res.data) setSubmitResult(res.data as SubmitResponse);
      else setSubmitResult({ score: results.filter(r => r.isCorrect).length, stars: 0, totalQuestions, correctCount: results.filter(r => r.isCorrect).length });
      setPhase('results');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit quiz.');
      setPhase('submit-error');
    }
  }, [questions, answers, activityId, submitMutation, totalQuestions]);

  const handleContinue = useCallback(() => { syncAfterActivity(); navigation.goBack(); }, [syncAfterActivity, navigation]);

  const isAnswered = useCallback((qid: string): boolean => {
    const ans = answers[qid];
    if (!ans) return false;
    if (answers[qid] === '{}' || answers[qid] === '') return false;
    return true;
  }, [answers]);

  const allAnswered = questions.every(q => isAnswered(q.id));
  const answered = currentQuestion ? isAnswered(currentQuestion.id) : false;

  const renderTimer = () => {
    if (timeRemaining === null || timeLimit === null) return null;
    const pct = (timeRemaining / timeLimit) * 100;
    const isLow = timeRemaining <= 30;
    return (
      <View style={[st.timer, { backgroundColor: isLow ? theme.colors.errorLight + '30' : theme.colors.surfaceSecondary }]} accessibilityLabel={`Time remaining: ${formatTime(timeRemaining)}`} accessibilityRole="timer">
        <Ionicons name="time-outline" size={iconSizes.sm} color={isLow ? theme.colors.error : theme.colors.textSecondary} />
        <Text style={[st.timerText, { color: isLow ? theme.colors.error : theme.colors.textSecondary }]}>{formatTime(timeRemaining)}</Text>
        <View style={[st.timerBar, { backgroundColor: theme.colors.border }]}>
          <View style={[st.timerFill, { width: `${pct}%`, backgroundColor: isLow ? theme.colors.error : theme.colors.primary }]} />
        </View>
      </View>
    );
  };

  const renderQuestionInput = (q: QuizQuestion) => {
    const currentAnswer = answers[q.id] ?? '';
    const c = theme.colors;

    if (q.questionType === 'single_choice') {
      return (
        <View style={st.inlineGap}>
          {(q.options ?? []).map(opt => {
            const sel = currentAnswer === opt.value;
            return (
              <Pressable key={opt.value} onPress={() => handleAnswer(q.id, opt.value)} accessibilityRole="radio" accessibilityState={{ selected: sel }} accessibilityLabel={opt.label}
                style={({ pressed }) => [st.optionRow, { borderColor: sel ? c.primary : c.border, backgroundColor: sel ? c.primary + '10' : c.surface, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
                <View style={[st.radio, { borderColor: sel ? c.primary : c.border }]}>{sel && <View style={[st.radioInner, { backgroundColor: c.primary }]} />}</View>
                <Text style={{ color: sel ? c.textPrimary : c.text, fontFamily: typography.families.rounded, fontSize: typography.sizes.body, flex: 1 }}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      );
    }

    if (q.questionType === 'multiple_choice') {
      const selSet = new Set(currentAnswer ? currentAnswer.split(',') : []);
      return (
        <View style={st.inlineGap}>
          {(q.options ?? []).map(opt => {
            const isSel = selSet.has(opt.value);
            return (
              <Pressable key={opt.value} onPress={() => { const next = new Set(selSet); next.has(opt.value) ? next.delete(opt.value) : next.add(opt.value); handleAnswer(q.id, Array.from(next)); }}
                accessibilityRole="checkbox" accessibilityState={{ checked: isSel }} accessibilityLabel={opt.label}
                style={({ pressed }) => [st.chip, { borderColor: isSel ? c.primary : c.border, backgroundColor: isSel ? c.primary + '18' : c.surface, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
                <Ionicons name={isSel ? 'checkmark-circle' : 'ellipse-outline'} size={iconSizes.sm} color={isSel ? c.primary : c.textMuted} />
                <Text style={{ color: isSel ? c.textPrimary : c.text, fontFamily: typography.families.rounded, fontSize: typography.sizes.body }}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      );
    }

    if (q.questionType === 'fill_blank') {
      return (
        <TextInput style={[st.textInput, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]} value={currentAnswer}
          onChangeText={val => handleAnswer(q.id, val)} placeholder="Type your answer here..." placeholderTextColor={c.textMuted}
          multiline numberOfLines={3} textAlignVertical="top" accessibilityLabel="Answer input" accessibilityRole="text" />
      );
    }

    if (q.questionType === 'ordering') {
      const options = q.options ?? [];
      const ordered = currentAnswer ? currentAnswer.split(',') : [];
      const remaining = options.filter(o => !ordered.includes(o.value));
      const toggle = (val: string) => {
        const next = ordered.includes(val) ? ordered.filter(v => v !== val) : [...ordered, val];
        handleAnswer(q.id, next);
      };
      return (
        <View style={st.inlineGap}>
          {ordered.length > 0 && (
            <View>
              <Text style={[st.orderingLabel, { color: c.textSecondary }]}>Your order:</Text>
              {ordered.map((val, idx) => {
                const item = options.find(o => o.value === val);
                return (
                  <Pressable key={val} onPress={() => toggle(val)} accessibilityRole="button" accessibilityLabel={`${idx + 1}: ${item?.label ?? val}`}
                    style={({ pressed }) => [st.orderingItem, { backgroundColor: c.primary + '18', borderColor: c.primary, transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
                    <View style={[st.orderBadge, { backgroundColor: c.primary }]}><Text style={{ color: c.textInverse, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold }}>{idx + 1}</Text></View>
                    <Text style={{ color: c.textPrimary, flex: 1, fontFamily: typography.families.rounded }}>{item?.label ?? val}</Text>
                    <Ionicons name="close-circle" size={18} color={c.textMuted} />
                  </Pressable>
                );
              })}
            </View>
          )}
          {remaining.length > 0 && (
            <View>
              <Text style={[st.orderingLabel, { color: c.textSecondary }]}>Tap to add in order:</Text>
              {remaining.map(opt => (
                <Pressable key={opt.value} onPress={() => toggle(opt.value)} accessibilityRole="button" accessibilityLabel={opt.label}
                  style={({ pressed }) => [st.orderingItem, { backgroundColor: c.surface, borderColor: c.border, transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
                  <Text style={{ color: c.text, fontFamily: typography.families.rounded, fontSize: typography.sizes.body }}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      );
    }

    if (q.questionType === 'matching') {
      const options = q.options ?? [];
      const half = Math.ceil(options.length / 2);
      const leftItems = options.slice(0, half);
      const rightItems = options.slice(half);
      const selectedLeft = matchingSelected;
      let pairs: Record<string, string> = {};
      try { pairs = currentAnswer ? JSON.parse(currentAnswer) : {}; } catch { pairs = {}; }
      const matchedRight = new Set(Object.values(pairs));
      return (
        <View style={st.inlineGap}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Text style={{ fontSize: typography.sizes.sm, color: c.textSecondary, fontWeight: typography.weights.bold, textAlign: 'center', fontFamily: typography.families.rounded }}>Items</Text>
              {leftItems.map(item => {
                const isSel = selectedLeft === item.value;
                const matched = !!pairs[item.value];
                return (
                  <Pressable key={item.value} onPress={() => { if (pairs[item.value]) { const next = { ...pairs }; delete next[item.value]; handleAnswer(q.id, next); } else setMatchingSelected(prev => prev === item.value ? null : item.value); }}
                    accessibilityRole="button" accessibilityLabel={`${item.label}${matched ? ' (matched)' : ''}`}
                    style={[st.matchItem, { borderColor: isSel ? c.primary : matched ? c.success : c.border, backgroundColor: isSel ? c.primary + '18' : matched ? c.successLight + '30' : c.surface }]}>
                    <Text style={{ fontSize: typography.sizes.body, color: c.text, textAlign: 'center', fontFamily: typography.families.rounded }}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Text style={{ fontSize: typography.sizes.sm, color: c.textSecondary, fontWeight: typography.weights.bold, textAlign: 'center', fontFamily: typography.families.rounded }}>Matches</Text>
              {rightItems.map(item => {
                const used = matchedRight.has(item.value);
                return (
                  <Pressable key={item.value} onPress={selectedLeft ? () => { handleAnswer(q.id, { ...pairs, [selectedLeft]: item.value }); setMatchingSelected(null); } : undefined}
                    accessibilityRole="button" accessibilityLabel={item.label}
                    style={[st.matchItem, { borderColor: used ? c.success : c.border, backgroundColor: used ? c.successLight + '30' : selectedLeft ? c.primary + '08' : c.surface, opacity: used ? 1 : selectedLeft ? 1 : 0.7 }]}>
                    <Text style={{ fontSize: typography.sizes.body, color: c.text, textAlign: 'center', fontFamily: typography.families.rounded }}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {selectedLeft && <Text style={{ fontSize: typography.sizes.sm, color: c.primary, textAlign: 'center', fontFamily: typography.families.rounded }}>Tap a match to pair with selected item</Text>}
        </View>
      );
    }

    return <Text style={{ fontSize: typography.sizes.sm, color: c.textMuted, fontStyle: 'italic', fontFamily: typography.families.rounded }}>Unsupported question type.</Text>;
  };

  if (phase === 'loading') {
    return (
      <ScreenContainer>
        <View style={[st.center, { backgroundColor: theme.colors.background }]}>
          <View style={{ width: '100%', maxWidth: 480, gap: spacing.md }}>
            <Skeleton variant="text" width="40%" height={20} />
            <Skeleton variant="text" width="100%" height={14} />
            <Skeleton variant="card" height={200} />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Skeleton variant="rect" width="48%" height={48} borderRadius={radius.button} />
              <Skeleton variant="rect" width="48%" height={48} borderRadius={radius.button} />
            </View>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (phase === 'error') {
    return (
      <ScreenContainer>
        <View style={[st.center, { backgroundColor: theme.colors.background }]}>
          <ErrorState title="Couldn't load quiz" message={queryError instanceof Error ? queryError.message : 'An unexpected error occurred.'} onRetry={() => refetch()} />
        </View>
      </ScreenContainer>
    );
  }

  if (phase === 'empty') {
    return (
      <ScreenContainer>
        <View style={[st.center, { backgroundColor: theme.colors.background }]}>
          <EmptyState icon="📝" title="No questions" message="This quiz has no questions yet." />
          <View style={{ marginTop: spacing.xl, width: '100%', maxWidth: 280 }}><Button label="Go Back" variant="outline" onPress={() => navigation.goBack()} fullWidth /></View>
        </View>
      </ScreenContainer>
    );
  }

  if (phase === 'ready' && quizData) {
    return (
      <ScreenContainer>
        <View style={[st.center, { backgroundColor: theme.colors.background }]}>
          <View style={{ width: '100%', maxWidth: 400, alignItems: 'center', padding: spacing.xxl, gap: spacing.md }}>
            <Ionicons name="help-circle" size={iconSizes.xl} color={theme.colors.primary} />
            <Text style={{ fontSize: typography.sizes.xxl, fontWeight: typography.weights.black, color: theme.colors.textPrimary, textAlign: 'center', fontFamily: typography.families.rounded }}>{quizData.title}</Text>
            <Text style={{ fontSize: typography.sizes.sm, color: theme.colors.textSecondary, textAlign: 'center', fontFamily: typography.families.rounded }}>
              {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}{quizData.passingScore > 0 ? ` · Pass: ${Math.round(quizData.passingScore)}%` : ''}
            </Text>
            <View style={{ width: '100%', gap: spacing.sm, marginTop: spacing.lg }}>
              <Button label="Start Quiz" variant="primary" size="lg" onPress={handleStart} fullWidth />
              <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} fullWidth />
            </View>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (phase === 'playing' && currentQuestion) {
    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={[st.scrollContent, isDesktop && st.scrollDesktop]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[st.contentInner, isDesktop && { maxWidth: 640, width: '100%', alignSelf: 'center' }]}>
            <View style={[st.topBar, { borderBottomColor: theme.colors.divider }]}>
              <Pressable onPress={() => navigation.goBack()} style={st.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
              </Pressable>
              <Text style={[st.topBarTitle, { color: theme.colors.textMuted, fontFamily: typography.families.rounded }]}>Q {currentIndex + 1}/{totalQuestions}</Text>
              {renderTimer()}
            </View>
            <ProgressBar progress={progress} color={theme.colors.primary} style={{ marginBottom: spacing.lg }} />
            <Card variant="elevated" style={{ backgroundColor: theme.colors.card, marginBottom: spacing.lg }}>
              <Text style={{ fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: theme.colors.textPrimary, lineHeight: 28, marginBottom: spacing.lg, fontFamily: typography.families.rounded }}>
                {currentQuestion.prompt}
              </Text>
              {renderQuestionInput(currentQuestion)}
            </Card>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Button label="Previous" variant="outline" onPress={handlePrev} disabled={currentIndex === 0} style={{ flex: 1 }} />
              {currentIndex === totalQuestions - 1 ? (
                <Button label="Submit" variant="success" onPress={handleSubmit} disabled={!allAnswered} style={{ flex: 1 }} />
              ) : (
                <Button label="Next" variant="primary" onPress={handleNext} disabled={!answered} style={{ flex: 1 }} />
              )}
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (phase === 'submitting') {
    return (
      <ScreenContainer>
        <View style={[st.center, { backgroundColor: theme.colors.background }]}>
          <Ionicons name="hourglass-outline" size={iconSizes.xl} color={theme.colors.primary} />
          <Text style={{ fontSize: typography.sizes.md, color: theme.colors.textSecondary, fontFamily: typography.families.rounded, marginTop: spacing.md }}>Submitting your answers...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (phase === 'submit-error') {
    return (
      <ScreenContainer>
        <View style={[st.center, { backgroundColor: theme.colors.background }]}>
          <ErrorState title="Submission failed" message={submitError ?? 'Something went wrong.'} onRetry={handleSubmit} retryLabel="Try Again" />
          <View style={{ marginTop: spacing.xl, width: '100%', maxWidth: 280 }}><Button label="Go Back" variant="ghost" onPress={() => navigation.goBack()} fullWidth /></View>
        </View>
      </ScreenContainer>
    );
  }

  const correctCount = questionResults.filter(r => r.isCorrect).length;
  const scorePct = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
  const passed = quizData ? scorePct >= quizData.passingScore : false;
  const stars = submitResult?.stars ?? 0;
  const reward = submitResult?.reward;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={[st.scrollContent, isDesktop && st.scrollDesktop]} showsVerticalScrollIndicator={false}>
        <View style={[st.contentInner, isDesktop && { maxWidth: 640, width: '100%', alignSelf: 'center' }]}>
          <View style={[st.resultsHeader, { backgroundColor: passed ? theme.colors.successLight + '30' : theme.colors.errorLight + '30', borderColor: passed ? theme.colors.success : theme.colors.error }]}>
            <Ionicons name={passed ? 'trophy' : 'sad-outline'} size={iconSizes.xl} color={passed ? theme.colors.success : theme.colors.error} />
            <Text style={{ fontSize: typography.sizes.xxl, fontWeight: typography.weights.black, color: theme.colors.textPrimary, fontFamily: typography.families.rounded }}>{passed ? 'Great Job!' : 'Keep Trying!'}</Text>
            <Text style={{ fontSize: typography.sizes.huge, fontWeight: typography.weights.black, color: passed ? theme.colors.success : theme.colors.error, fontFamily: typography.families.rounded }}>{correctCount}/{totalQuestions}</Text>
            {stars > 0 && (
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                {Array.from({ length: 3 }, (_, i) => <Ionicons key={i} name={i < stars ? 'star' : 'star-outline'} size={iconSizes.md} color={i < stars ? theme.colors.accent : theme.colors.textMuted} />)}
              </View>
            )}
          </View>
          <ProgressBar progress={scorePct} variant={passed ? 'success' : 'warning'} label="Score" showPercentage style={{ marginBottom: spacing.xl }} />
          <Text style={{ fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, color: theme.colors.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1, fontFamily: typography.families.rounded }}>Question Breakdown</Text>
          {questionResults.map((r, idx) => (
            <Card key={r.question.id} variant="outlined" style={{ borderColor: r.isCorrect ? theme.colors.success + '50' : theme.colors.error + '50', marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
                <Text style={{ fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: theme.colors.textPrimary, flex: 1, marginRight: spacing.sm, fontFamily: typography.families.rounded }}>Q{idx + 1}. {r.question.prompt}</Text>
                <Ionicons name={r.isCorrect ? 'checkmark-circle' : 'close-circle'} size={iconSizes.sm} color={r.isCorrect ? theme.colors.success : theme.colors.error} />
              </View>
              <View style={{ marginTop: spacing.xs }}>
                <Text style={{ fontSize: typography.sizes.caption, color: theme.colors.textSecondary, fontFamily: typography.families.rounded }}>Your answer:</Text>
                <Text style={{ fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: r.isCorrect ? theme.colors.success : theme.colors.error, fontFamily: typography.families.rounded }}>
                  {answerLabel(r.question, r.userAnswer)}
                </Text>
              </View>
              {!r.isCorrect && r.question.correctAnswer && (
                <View style={{ marginTop: spacing.xs }}>
                  <Text style={{ fontSize: typography.sizes.caption, color: theme.colors.textSecondary, fontFamily: typography.families.rounded }}>Correct answer:</Text>
                  <Text style={{ fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: theme.colors.success, fontFamily: typography.families.rounded }}>
                    {answerLabel(r.question, r.question.correctAnswer)}
                  </Text>
                </View>
              )}
            </Card>
          ))}
          {reward && (
            <Card variant="elevated" style={{ backgroundColor: theme.colors.accent + '15', marginBottom: spacing.lg, padding: spacing.lg }}>
              <Text style={{ fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: theme.colors.textPrimary, marginBottom: spacing.sm, fontFamily: typography.families.rounded }}>Rewards</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.sm }}>
                {reward.xpGained > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><Ionicons name="flash" size={iconSizes.sm} color={theme.colors.accent} /><Text style={{ color: theme.colors.text, fontFamily: typography.families.rounded }}>+{reward.xpGained} XP</Text></View>}
                {reward.coinsEarned > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><Ionicons name="cash" size={iconSizes.sm} color={theme.colors.yellow} /><Text style={{ color: theme.colors.text, fontFamily: typography.families.rounded }}>+{reward.coinsEarned}</Text></View>}
                {reward.masteryIncrease > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><Ionicons name="trending-up" size={iconSizes.sm} color={theme.colors.success} /><Text style={{ color: theme.colors.text, fontFamily: typography.families.rounded }}>+{Math.round(reward.masteryIncrease)}% Mastery</Text></View>}
              </View>
              {reward.newBadges?.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.sm }}>
                  {reward.newBadges.map(b => <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><Text style={{ fontSize: 20 }}>{b.icon}</Text><Text style={{ color: theme.colors.text, fontFamily: typography.families.rounded, fontSize: typography.sizes.sm }}>{b.name}</Text></View>)}
                </View>
              )}
              {reward.levelUp && <Text style={{ color: theme.colors.primary, fontWeight: typography.weights.bold, fontSize: typography.sizes.md, textAlign: 'center', marginTop: spacing.sm, fontFamily: typography.families.rounded }}>Level Up! You are now Level {reward.newLevel}</Text>}
            </Card>
          )}
          <View style={{ marginTop: spacing.lg, paddingBottom: spacing.xxl }}>
            <Button label="Continue" variant="primary" size="lg" onPress={handleContinue} fullWidth />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const st = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  scrollContent: { paddingBottom: spacing.xxl * 2 },
  scrollDesktop: { alignItems: 'center' },
  contentInner: { padding: spacing.lg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  topBarTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  timer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, gap: spacing.sm },
  timerText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, minWidth: 36, fontFamily: typography.families.rounded },
  timerBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 3 },
  inlineGap: { gap: spacing.sm },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.chip, borderWidth: 1.5, gap: spacing.sm },
  textInput: { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, fontSize: typography.sizes.body, minHeight: 80, lineHeight: 22, fontFamily: typography.families.rounded },
  orderingLabel: { fontSize: typography.sizes.sm, fontFamily: typography.families.rounded, marginBottom: spacing.sm },
  orderingItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5, gap: spacing.sm, marginBottom: spacing.sm },
  orderBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  matchItem: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  resultsHeader: { alignItems: 'center', padding: spacing.xl, borderRadius: radius.xl, borderWidth: 2, marginBottom: spacing.lg, gap: spacing.sm },
});
