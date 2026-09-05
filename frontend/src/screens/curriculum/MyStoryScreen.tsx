import React from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useProgressStory } from '../../hooks/useCurriculum';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { toUserMessage } from '../../api/errors';
import { AppShell, PageHeader } from '../../components/design';
import { colors, radius, spacing, typography } from '../../theme';
import type { StoryBeat, StoryMood } from '../../types/progress';
import { SCREEN_BACKGROUNDS } from '../../assets/backgrounds';

/**
 * "My Story" — the child's own progress as a cheerful comic.
 *
 * A companion to the Explore garden: the garden shows where each flower stands
 * now, this shows the adventure of getting there. Every panel is one beat the
 * backend built from the child's real history (start, subject chapters, a
 * test/exam faced as a boss, a stumble, how much they grew). The screen only
 * lays the panels out and tints them by mood; it owns no story logic.
 */

const MOOD_COLOR: Record<StoryMood, string> = {
  happy: colors.primary,
  brave: colors.warning,
  triumph: colors.success,
  gentle: colors.primary,
  cheer: colors.secondary,
};

const KIND_EYEBROW: Record<StoryBeat['kind'], string> = {
  opening: 'The Beginning',
  chapter: 'Chapter',
  boss: 'Boss Battle',
  stumble: 'A Twist',
  growth: 'How You Grew',
  finale: 'The Adventure Continues',
};

/** Add an alpha channel to a #RGB / #RRGGBB colour so a soft tint can be derived
 *  from any strong token without needing a matching *Light variant. */
function withAlpha(hex: string, alpha: number): string {
  if (typeof hex !== 'string' || hex[0] !== '#') return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return hex;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${h}${a}`;
}

/** One comic panel: a mood-tinted card with a big emoji, an eyebrow, the beat's
 *  title, a speech-bubble caption and an optional before→after / score pill. */
const StoryPanel: React.FC<{ beat: StoryBeat; index: number }> = ({ beat, index }) => {
  const tint = MOOD_COLOR[beat.mood] ?? colors.primary;
  const stat = beat.stat;
  const eyebrow =
    beat.kind === 'chapter' ? `${KIND_EYEBROW.chapter} ${beat.subject ?? ''}`.trim() : KIND_EYEBROW[beat.kind];

  return (
    <View style={[styles.panel, { backgroundColor: withAlpha(tint, 0.1), borderColor: withAlpha(tint, 0.35) }]}>
      <View style={styles.panelHead}>
        <View style={[styles.emojiWell, { backgroundColor: withAlpha(tint, 0.22) }]}>
          <Text style={styles.emoji}>{beat.emoji}</Text>
        </View>
        <View style={styles.headText}>
          <Text style={[styles.eyebrow, { color: tint }]} numberOfLines={1}>
            {index + 1} · {eyebrow.toUpperCase()}
          </Text>
          <Text style={[typography.presets.cardTitle, styles.panelTitle]} numberOfLines={2}>
            {beat.title}
          </Text>
        </View>
      </View>

      <View style={styles.bubble}>
        <Text style={[typography.presets.body, styles.caption]}>{beat.caption}</Text>

        {stat && (stat.before != null || stat.percentage != null) ? (
          <View style={styles.statRow}>
            {stat.before != null && stat.after != null ? (
              <View style={[styles.statPill, { backgroundColor: tint }]}>
                <Text style={styles.statText}>
                  {stat.before}% → {stat.after}%
                </Text>
              </View>
            ) : null}
            {stat.percentage != null ? (
              <View style={[styles.statPill, { backgroundColor: tint }]}>
                <Text style={styles.statText}>⭐ Score {stat.percentage}%</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const MyStoryScreen: React.FC = () => {
  const { navigateToTab } = useAppNavigation();
  const { data, isLoading, isError, error, refetch, isFetching } = useProgressStory();
  const story = data?.data;

  const header = (
    <PageHeader
      title={story?.title ?? 'My Story'}
      subtitle="Your learning adventure"
      showBack
      backFallback={() => navigateToTab('Journey')}
      centered={false}
    />
  );

  if (isLoading) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore} scroll={false} header={header}>
        <View style={styles.center}>
          <LoadingSpinner label="Writing your story…" />
        </View>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore} scroll={false} header={header}>
        <View style={styles.center}>
          <ErrorState title="Couldn't open your story" message={toUserMessage(error)} onRetry={refetch} />
        </View>
      </AppShell>
    );
  }

  if (!story || story.beats.length === 0) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore} scroll={false} header={header}>
        <View style={styles.center}>
          <EmptyState
            icon="book"
            title="Your story is just beginning"
            message="Play a lesson and your adventure will start to write itself."
          />
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore}
     
      sky
      header={header}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      {story.beats.map((beat, idx) => (
        <StoryPanel key={beat.id} beat={beat} index={idx} />
      ))}
    </AppShell>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  panel: {
    marginBottom: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 2,
    padding: spacing.md,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  emojiWell: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 28,
  },
  headText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  panelTitle: {
    color: colors.text,
  },
  bubble: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  caption: {
    color: colors.text,
    lineHeight: 24,
    fontSize: 15,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statPill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
});

export default MyStoryScreen;
