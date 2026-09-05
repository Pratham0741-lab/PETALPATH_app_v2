import { lightColors as colors } from './colors';

export const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  /**
   * "Sticker" — a grounded, slightly tighter shadow for the playful‑premium look.
   * Sits a card/button just off the surface with a crisp‑ish drop (small radius,
   * a touch more opacity) so interactive things feel tactile and pressable,
   * without any gradient or glow. Use on primary buttons and hero/interactive
   * cards; keep `sm` for quiet surfaces.
   */
  sticker: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.13,
    shadowRadius: 5,
    elevation: 5,
  },
};
