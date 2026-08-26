import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ParentSection } from '../design/ParentSection';
import { Card } from '../design/Card';
import { StatePanel } from '../design/StatePanel';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { spacing } from '../../theme';
import type { PetalIconName } from '../icons';

/**
 * A parent-section heading plus the three states its data can be in.
 *
 * Every one of the seven parent screens repeats the same shape: a section
 * title, then either a spinner, an error with a retry, an empty message, or the
 * real card. Written out longhand that is a fifteen-line ternary per section and
 * roughly forty of them across the folder (§28).
 *
 * Loading is deliberately *not* a state here. The analytics cards each take a
 * `loading` prop and shimmer only their body, so the heading and card frame stay
 * put while the query runs — swapping the whole card for a grey rectangle would
 * throw that away. `loading` is only used to hold back the empty state until the
 * query has actually settled, which stops "No data yet" flashing on first paint.
 */

export interface DataSectionProps {
  title: string;
  subtitle?: string;
  icon?: PetalIconName;
  /** Right-aligned control in the section header, e.g. a period switcher. */
  right?: React.ReactNode;
  /**
   * Rendered between the heading and the content, and kept in *every* state — a
   * period switcher must not disappear behind the error its own period caused,
   * or there is no way back to a period that works.
   */
  controls?: React.ReactNode;
  /** Wraps the loaded children in a Card. Leave false when they are cards. */
  boxed?: boolean;
  /** True while the query is in flight — suppresses the empty state. */
  loading?: boolean;
  error?: Error | null;
  /** Defaults to "Could not load {title}". */
  errorTitle?: string;
  onRetry?: () => void;
  /** True when the query settled with nothing worth drawing. */
  empty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: PetalIconName;
  /** Small print under the section, shown only in the loaded state. */
  footnote?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const DataSection: React.FC<DataSectionProps> = ({
  title,
  subtitle,
  icon,
  right,
  controls,
  boxed = false,
  loading = false,
  error,
  errorTitle,
  onRetry,
  empty = false,
  emptyTitle = 'Nothing here yet',
  emptyMessage = 'This will fill in as your child learns.',
  emptyIcon,
  footnote,
  children,
  style,
}) => {
  const state: 'error' | 'empty' | 'data' = error ? 'error' : !loading && empty ? 'empty' : 'data';

  const body =
    state === 'error' ? (
      <StatePanel minHeight={168}>
        <ErrorState
          title={errorTitle ?? `Could not load ${title.toLowerCase()}`}
          message={error?.message}
          onRetry={onRetry}
        />
      </StatePanel>
    ) : state === 'empty' ? (
      <StatePanel minHeight={168}>
        <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} />
      </StatePanel>
    ) : boxed ? (
      <Card variant="raised" padding="normal">
        {children}
      </Card>
    ) : (
      children
    );

  return (
    <ParentSection
      title={title}
      subtitle={subtitle}
      icon={icon}
      right={right}
      // Boxing is handled here rather than by the section, so that `controls`
      // can sit above the box instead of inside it.
      boxed={false}
      footnote={state === 'data' ? footnote : undefined}
      style={style}
    >
      {controls ? <View style={styles.controls}>{controls}</View> : null}
      {body}
    </ParentSection>
  );
};

const styles = StyleSheet.create({
  controls: {
    marginBottom: spacing.md,
  },
});

export default DataSection;
