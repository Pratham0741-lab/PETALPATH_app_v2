import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Polyline } from 'react-native-svg';
import { colors, radius, spacing, typography } from '../../theme';
import type { BeforeAfterRow, MasteryPoint, SubjectAccuracy } from '../../types/progress';

/**
 * The three parent-locked charts for the Explore analysis panel. Deliberately
 * plain — data before decoration — and self-contained: each takes already-scoped,
 * already-scored rows and draws them, with no data fetching or grade logic of its
 * own. Values are 0-100 percentages, as the backend hands them.
 */

const clampPct = (v: number) => Math.max(0, Math.min(100, v));

/** One labelled horizontal meter — the shared primitive for the bar charts. */
const Meter: React.FC<{ label: string; value: number; color: string; caption?: string }> = ({
  label,
  value,
  color,
  caption,
}) => (
  <View style={styles.meterRow}>
    <View style={styles.meterHead}>
      <Text style={[typography.presets.caption, styles.meterLabel]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[typography.presets.caption, styles.meterValue]}>{Math.round(value)}%</Text>
    </View>
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clampPct(value)}%`, backgroundColor: color }]} />
    </View>
    {caption ? <Text style={[typography.presets.caption, styles.meterCaption]}>{caption}</Text> : null}
  </View>
);

// ---------------------------------------------------------------- 1) Accuracy

export const AccuracyChart: React.FC<{ rows: SubjectAccuracy[] }> = ({ rows }) => {
  if (rows.length === 0) return <EmptyNote text="No accuracy recorded yet." />;
  return (
    <View>
      <Legend items={[{ label: 'Accuracy', color: colors.primary }, { label: 'Mastery', color: colors.secondary }]} />
      {rows.map((r) => (
        <View key={r.subjectId} style={styles.group}>
          <Text style={[typography.presets.caption, styles.groupTitle]}>{r.subject}</Text>
          <Meter label="Accuracy" value={r.accuracy} color={colors.primary} />
          <Meter label="Mastery" value={r.mastery} color={colors.secondary} />
        </View>
      ))}
    </View>
  );
};

// -------------------------------------------------------- 2) Mastery timeline

export const MasteryTimelineChart: React.FC<{ points: MasteryPoint[] }> = ({ points }) => {
  if (points.length === 0) return <EmptyNote text="No history to chart yet." />;
  if (points.length === 1) {
    return (
      <Meter
        label={points[0].date}
        value={points[0].mastery}
        color={colors.primary}
        caption="One day recorded so far — the line grows as more days are logged."
      />
    );
  }

  // A fixed viewBox keeps the SVG crisp at any width; the parent scales it.
  const W = 300;
  const H = 120;
  const pad = 8;
  const n = points.length;
  const x = (i: number) => pad + (i * (W - pad * 2)) / (n - 1);
  const y = (v: number) => H - pad - (clampPct(v) / 100) * (H - pad * 2);

  const line = points.map((p, i) => `${x(i)},${y(p.mastery)}`).join(' ');
  const area = `${pad},${H - pad} ${line} ${W - pad},${H - pad}`;

  const first = Math.round(points[0].mastery);
  const last = Math.round(points[n - 1].mastery);

  return (
    <View>
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={140}>
        {/* baseline */}
        <Line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={colors.border} strokeWidth={1} />
        <Polygon points={area} fill={colors.primaryLight} opacity={0.5} />
        <Polyline points={line} fill="none" stroke={colors.primary} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <Circle key={p.date} cx={x(i)} cy={y(p.mastery)} r={3} fill={colors.primary} />
        ))}
      </Svg>
      <View style={styles.timelineFoot}>
        <Text style={[typography.presets.caption, styles.meterCaption]}>Start {first}%</Text>
        <Text style={[typography.presets.caption, styles.meterCaption]}>Now {last}%</Text>
      </View>
    </View>
  );
};

// ---------------------------------------------------------- 3) Before / after

/**
 * Before -> now, as movement rather than a pair of numbers.
 *
 * This was two stacked bars per subject with "Before 42%" and "Now 61%", which
 * left the parent to do the subtraction — the one thing they actually want to
 * know. Each subject is now a single track with a hollow dot where the child
 * started, a filled dot where they are now, and the distance between them drawn
 * as a coloured bar: the length of that bar *is* the progress. Percentages stay,
 * small and secondary, for anyone who wants the detail.
 */
export const BeforeAfterChart: React.FC<{
  overall: { before: number; after: number };
  rows: BeforeAfterRow[];
}> = ({ overall, rows }) => {
  const gain = Math.round(overall.after - overall.before);
  const improved = rows.filter((r) => r.after > r.before).length;

  return (
    <View>
      {/* The headline a parent can read in one glance, in words. */}
      <Text style={[typography.presets.body, styles.summary]}>
        {gain > 0
          ? `Moved forward in ${improved} of ${rows.length} ${rows.length === 1 ? 'subject' : 'subjects'} since starting.`
          : gain === 0
            ? 'Holding steady since starting.'
            : 'Some ground to regain since starting.'}
      </Text>

      <Legend
        items={[
          { label: 'Where they started', color: colors.border },
          { label: 'Where they are now', color: colors.primary },
        ]}
      />

      <Dumbbell label="Overall" before={overall.before} after={overall.after} emphasis />
      {rows.map((r) => (
        <Dumbbell key={r.subjectId} label={r.subject} before={r.before} after={r.after} />
      ))}
    </View>
  );
};

/** One subject's journey: start dot, end dot, and the gain drawn between them. */
const Dumbbell: React.FC<{
  label: string;
  before: number;
  after: number;
  emphasis?: boolean;
}> = ({ label, before, after, emphasis = false }) => {
  const from = clampPct(Math.min(before, after));
  const to = clampPct(Math.max(before, after));
  const grew = after >= before;
  const delta = Math.round(after - before);
  /* Green for forward, amber for slipped — never colour alone, the words and the
     dot positions carry it too. */
  const moveColor = grew ? colors.success : colors.warning;

  return (
    <View style={styles.dumbbellRow}>
      <View style={styles.dumbbellHead}>
        <Text
          style={[typography.presets.caption, emphasis ? styles.groupTitle : styles.meterLabel]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text style={[typography.presets.caption, { color: moveColor }]}>
          {delta === 0 ? 'no change' : grew ? `+${delta}` : `${delta}`}
        </Text>
      </View>

      <View style={styles.dumbbellTrack}>
        {/* The distance travelled. */}
        <View
          style={[
            styles.dumbbellMove,
            { left: `${from}%`, width: `${Math.max(to - from, 0.5)}%`, backgroundColor: moveColor },
          ]}
        />
        {/* Started here. */}
        <View style={[styles.dot, styles.dotBefore, { left: `${clampPct(before)}%` }]} />
        {/* Now here. */}
        <View style={[styles.dot, styles.dotAfter, { left: `${clampPct(after)}%` }]} />
      </View>

      <Text style={[typography.presets.caption, styles.dumbbellScale]}>
        {Math.round(before)}% → {Math.round(after)}%
      </Text>
    </View>
  );
};

// ------------------------------------------------------------------- helpers

const Legend: React.FC<{ items: Array<{ label: string; color: string }> }> = ({ items }) => (
  <View style={styles.legend}>
    {items.map((it) => (
      <View key={it.label} style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: it.color }]} />
        <Text style={[typography.presets.caption, styles.meterCaption]}>{it.label}</Text>
      </View>
    ))}
  </View>
);

const EmptyNote: React.FC<{ text: string }> = ({ text }) => (
  <Text style={[typography.presets.caption, styles.empty]}>{text}</Text>
);

const styles = StyleSheet.create({
  summary: {
    color: colors.text,
    marginBottom: spacing.sm,
  },
  dumbbellRow: {
    marginBottom: spacing.md,
  },
  dumbbellHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: spacing.sm,
  },
  /* Room above and below the track so the dots are not clipped by it. */
  dumbbellTrack: {
    height: 14,
    justifyContent: 'center',
    backgroundColor: colors.borderLight,
    borderRadius: radius.pill,
  },
  dumbbellMove: {
    position: 'absolute',
    height: 6,
    borderRadius: radius.pill,
  },
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
  },
  dotBefore: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  dotAfter: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  dumbbellScale: {
    color: colors.textMuted,
    marginTop: 4,
  },
  group: {
    marginBottom: spacing.md,
  },
  groupTitle: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  meterRow: {
    marginBottom: spacing.sm,
  },
  meterHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  meterLabel: {
    color: colors.textSecondary,
    flexShrink: 1,
  },
  meterValue: {
    color: colors.text,
    fontWeight: '700',
  },
  track: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
  meterCaption: {
    color: colors.textSecondary,
  },
  timelineFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  empty: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
