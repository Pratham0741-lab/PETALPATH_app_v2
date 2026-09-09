import { lightColors as colors } from './colors';

/*
 * None of these carry `elevation`.
 *
 * Every panel in the app is translucent, and Android composites an elevated
 * view against an opaque backing — which rendered as a solid white card sitting
 * inside the translucent one (clearest on the reward tiles and the roadmap's
 * lesson cards). The iOS shadow properties respect alpha and are kept; on
 * Android the panel's hairline border carries the edge instead.
 */
export const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  xl: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  /**
   * "Sticker" — a grounded, slightly tighter shadow for the playful‑premium look.
   * Sits a card/button just off the surface with a crisp‑ish drop (small radius,
   * a touch more opacity) so interactive things feel tactile and pressable,
   * without any gradient or glow. Use on primary buttons and hero/interactive
   * cards; keep `sm` for quiet surfaces.
   */
  /*
   * No `elevation` on purpose.
   *
   * Cards are translucent now, and Android composites an elevated view against
   * an opaque backing — which showed up as a solid white card sitting inside the
   * translucent one, most visibly on the reward tiles. The iOS shadow props are
   * kept (they respect alpha); on Android the card's border carries the edge.
   */
  sticker: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.13,
    shadowRadius: 5,
  },
};
