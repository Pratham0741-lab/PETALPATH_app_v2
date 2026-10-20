/*
 * Sidebar geometry, kept apart from the component so layout code (`AppShell`,
 * `useTwoPane`, `RootNavigator`) can read it without importing the design
 * system that the sidebar itself is built from.
 */

/**
 * Rail widths. Exported so layouts can work out the space left for content
 * (`useTwoPane`) instead of guessing it.
 */
// Column widths: the floating rail plus its inset on both sides (12 + rail + 12).
export const SIDEBAR_WIDTH = { tablet: 112, expanded: 232, desktop: 256 } as const;

type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Whether the sidebar shows as the full panel (labels beside icons, the child's
 * card on top) or the slim labelled rail.
 *
 * Tablets always get the rail: it keeps navigation one tap away on every screen
 * while leaving the width to the content. The full panel is desktop-only.
 */
export function useSidebarExpanded(deviceType: DeviceType): boolean {
  return deviceType === 'desktop';
}

/** Width the sidebar takes, so layouts can size what is left (`useTwoPane`). */
export function useSidebarWidth(deviceType: DeviceType): number {
  const expanded = useSidebarExpanded(deviceType);
  if (deviceType === 'mobile') return 0;
  if (!expanded) return SIDEBAR_WIDTH.tablet;
  return deviceType === 'desktop' ? SIDEBAR_WIDTH.desktop : SIDEBAR_WIDTH.expanded;
}
