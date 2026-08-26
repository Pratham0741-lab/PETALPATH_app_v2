/**
 * StatePanel
 *
 * A flat card that gives `EmptyState`, `ErrorState` and `LoadingSpinner` somewhere
 * to stand when they appear inside a scroll view.
 *
 * All three centre themselves with `flex: 1`. Inside a `ScrollView`'s auto-height
 * content container there is no height to flex against, so `flex: 1` resolves to
 * zero and the state renders as an invisible sliver — the child sees a blank gap
 * where "No badges yet" should be. Wrapping them in a panel with a minimum height
 * gives that flex something to fill.
 *
 * This lived as a copy-pasted local helper in DataSection and
 * CurriculumInsightsScreen before; §28 asks for one component rather than the
 * same markup in several files.
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { spacing } from '../../theme';
import { Card } from './Card';

export interface StatePanelProps {
  children: React.ReactNode;
  /**
   * Minimum height for the centred content. Defaults to 200 — enough for an
   * icon, a title and a line of message without dwarfing a short screen.
   */
  minHeight?: number;
  /** Renders without the card surface, for use inside an existing card. */
  bare?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const StatePanel: React.FC<StatePanelProps> = ({
  children,
  minHeight = 200,
  bare = false,
  style,
}) => {
  const inner = <View style={[styles.panel, { minHeight }, bare && style]}>{children}</View>;

  if (bare) return inner;

  return (
    <Card variant="flat" padding="none" style={style}>
      {inner}
    </Card>
  );
};

const styles = StyleSheet.create({
  panel: {
    paddingVertical: spacing.md,
  },
});

export default StatePanel;
