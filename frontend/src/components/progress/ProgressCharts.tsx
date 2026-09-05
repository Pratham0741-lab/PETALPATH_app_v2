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

export const BeforeAfterChart: React.FC<{
  overall: { before: number; after: number };
  rows: BeforeAfterRow[];
}> = ({ overall, rows }) => {
  const gain = Math.round(overall.after - overall.before);
  return (
    <View>
      <Legend items={[{ label: 'Before', color: colors.border }, { label: 'Now', color: colors.primary }]} />
      <View style={styles.group}>
        <Text style={[typography.presets.caption, styles.groupTitle]}>
          Overall {gain >= 0 ? `· +${gain}` : `· ${gain}`}
        </Text>
        <Meter label="Before" value={overall.before} color={colors.border} />
        <Meter label="Now" value={overall.after} color={colors.primary} />
      </View>
      {rows.map((r) => (
        <View key={r.subjectId} style={styles.group}>
          <Text style={[typography.presets.caption, styles.groupTitle]}>{r.subject}</Text>
          <Meter label="Before" value={r.before} color={colors.border} />
          <Meter label="Now" value={r.after} color={colors.primary} />
        </View>
      ))}
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
