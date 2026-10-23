/**
 * The baseline questionnaire, shown by RootNavigator instead of the Learning
 * Journey while the active child's baseline is pending, in progress or
 * showing its result (see features/baseline/baselineStore.ts).
 *
 * One component rather than a stack of routes, on purpose: which part to show
 * is a pure function of the saved state, so a questionnaire interrupted at
 * any point — app closed, phone restarted — resumes at the last answered item
 * without any navigation state to restore.
 */
import React, { useState } from 'react';
import { useBaselineStore } from '../../features/baseline/baselineStore';
import { nextChildItem } from '../../features/baseline/engine';
import { ITEM_BANK } from '../../features/baseline/baselineStore';
import { useChildStore } from '../../store/childStore';
import { GrownUpGate } from '../../components/design';
import { BaselineIntro } from './BaselineIntro';
import { BaselineChildPart } from './BaselineChildPart';
import { BaselineParentPart } from './BaselineParentPart';
import { BaselineResult } from './BaselineResult';

export const BaselineFlow: React.FC = () => {
  const child = useChildStore((s) => s.activeChild);
  const state = useBaselineStore((s) => (child ? s.byChild[child.id] : undefined));
  const [gate, setGate] = useState(false);

  if (!child || !state) return null;

  const askSkip = () => setGate(true);
  const gateEl = (
    <GrownUpGate
      visible={gate}
      onCancel={() => setGate(false)}
      onUnlock={() => {
        setGate(false);
        void useBaselineStore.getState().skip(child.id, state.grade);
      }}
    />
  );

  if (state.status === 'pending') {
    return (
      <>
        <BaselineIntro child={child} onStart={() => useBaselineStore.getState().start(child.id)} onSkip={askSkip} />
        {gateEl}
      </>
    );
  }

  if (state.status === 'result' && state.baseline) {
    return <BaselineResult child={child} baseline={state.baseline} onContinue={() => useBaselineStore.getState().acknowledge(child.id)} />;
  }

  const childItem = nextChildItem(ITEM_BANK, state.grade, state.answers);
  return (
    <>
      {childItem ? (
        <BaselineChildPart child={child} state={state} item={childItem} onGrownUp={askSkip} />
      ) : (
        <BaselineParentPart child={child} state={state} onSkip={askSkip} />
      )}
      {gateEl}
    </>
  );
};

export default BaselineFlow;
