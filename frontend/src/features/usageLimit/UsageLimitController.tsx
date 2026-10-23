/**
 * Runs the daily learning-time limit for the active child.
 *
 * Counts only while the app is in the foreground AND a learning screen
 * (LEARNING_ROUTES) is showing; pauses on background, screen off or leaving
 * the screen. Shows the gentle two-minute warning, and at the limit a calm
 * full-screen lock the child cannot dismiss. Mounted once, around the main
 * app, in RootNavigator.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { navigationRef } from '../../navigation/navigationRef';
import { useChildStore } from '../../store/childStore';
import { LEARNING_ROUTES, LOCK_EXEMPT_ROUTES, usageTimer, useUsageStore } from './usageStore';
import { UsageLockScreen } from './UsageLockScreen';
import { UsageWarning } from './UsageWarning';

const TICK_MS = 1_000;

function currentRouteName(): string | undefined {
  return navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined;
}

export const UsageLimitController: React.FC = () => {
  const child = useChildStore((s) => s.activeChild);
  const hydrated = useUsageStore((s) => s.hydrated);
  const status = useUsageStore((s) => s.status);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [route, setRoute] = useState<string | undefined>(currentRouteName);
  const [warning, setWarning] = useState(false);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hydrated) void useUsageStore.getState().hydrate();
  }, [hydrated]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', setAppState);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const update = () => setRoute(currentRouteName());
    update();
    const unsubscribe = navigationRef.addListener('state', update);
    return unsubscribe;
  }, []);

  const childId = child?.id;
  const foreground = appState === 'active';
  const onLearningScreen = !!route && LEARNING_ROUTES.has(route);
  const locked = !!status?.locked;
  const counting = hydrated && !!childId && foreground && onLearningScreen && !locked;

  // Start / pause the timer as the conditions change.
  useEffect(() => {
    if (!hydrated || !childId) return;
    if (counting) usageTimer.start(childId);
    else usageTimer.pause();
    useUsageStore.getState().refresh(childId);
    if (!foreground) void useUsageStore.getState().persist();
  }, [hydrated, childId, counting, foreground]);

  // Tick while counting; refresh status (and the midnight reset) once a minute otherwise.
  useEffect(() => {
    if (!hydrated || !childId) return;
    const id = setInterval(() => {
      usageTimer.tick();
      useUsageStore.getState().refresh(childId);
    }, counting ? TICK_MS : 60_000);
    return () => clearInterval(id);
  }, [hydrated, childId, counting]);

  // Two minutes left: a gentle, non-blocking heads-up, once a day.
  useEffect(() => {
    if (!childId || !status?.shouldWarn || !onLearningScreen) return;
    useUsageStore.getState().markWarned(childId);
    setWarning(true);
    if (warnTimer.current) clearTimeout(warnTimer.current);
    warnTimer.current = setTimeout(() => setWarning(false), 7_000);
  }, [childId, status?.shouldWarn, onLearningScreen]);

  useEffect(() => () => {
    usageTimer.pause();
    void useUsageStore.getState().persist();
    if (warnTimer.current) clearTimeout(warnTimer.current);
  }, []);

  if (!child || !hydrated) return null;
  if (locked && !(route && LOCK_EXEMPT_ROUTES.has(route))) {
    return <UsageLockScreen child={child} resetsInMs={status?.resetsInMs ?? 0} />;
  }
  return warning ? <UsageWarning characterType={child.mentor?.characterType} onDismiss={() => setWarning(false)} /> : null;
};
