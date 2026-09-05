import React, { createContext, useContext } from 'react';
import { colors } from '../../theme';

/**
 * Per‑screen accent colour, delivered by context.
 *
 * Each tab screen sets an accent (matched to its scene background) on `AppShell`,
 * which publishes it here. Accent‑bearing components — card rails, icon wells,
 * chips, progress bars, secondary buttons — read it as their DEFAULT colour, so a
 * whole screen's accents shift together without every call site passing a colour.
 * A component that is given an explicit colour keeps it (semantic colours like the
 * green "done" tick or a subject's own hue must not be overridden).
 *
 * Primary CTA buttons stay pink app‑wide — they read `colors.primary` directly,
 * not this accent.
 */
const ScreenAccentContext = createContext<string>(colors.primary);

export const ScreenAccentProvider: React.FC<{
  accent?: string;
  children: React.ReactNode;
}> = ({ accent, children }) => (
  <ScreenAccentContext.Provider value={accent ?? colors.primary}>
    {children}
  </ScreenAccentContext.Provider>
);

/** The current screen accent (falls back to brand pink outside any provider). */
export const useScreenAccent = (): string => useContext(ScreenAccentContext);

/**
 * Mix a #RGB / #RRGGBB colour toward white. `ratio` = how much of the colour is
 * kept (0.16 = a pale 16% wash). Returns the input unchanged if it isn't a hex.
 */
export const mixWhite = (hex: string, ratio: number, alpha = 1): string => {
  if (typeof hex !== 'string' || hex[0] !== '#') return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const m = (c: number) => Math.round(255 * (1 - ratio) + c * ratio);
  return `rgba(${m(r)}, ${m(g)}, ${m(b)}, ${alpha})`;
};

/**
 * A soft tint of the current screen accent (accent mixed into white) — for
 * boxes/cards that should read as the screen's colour but keep dark text crisp.
 * Returns plain white when there is no themed accent (default brand pink).
 */
export const useAccentTint = (ratio = 0.16, alpha = 1): string => {
  const accent = useScreenAccent();
  if (accent === colors.primary) return `rgba(255, 255, 255, ${alpha})`;
  return mixWhite(accent, ratio, alpha);
};

/**
 * How opaque a content panel is. Below 1 the scene shows faintly through the
 * card, so panels sit *in* the illustration rather than on top of it — but it is
 * kept high enough that dark text on the panel still clears 4.5:1 over any of
 * the wallpapers. Lower it for more scene, raise it for more contrast.
 */
export const PANEL_ALPHA = 0.78;
