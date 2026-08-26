import {
  resolveSpecies,
  speciesBackground,
  type AvatarSpecies,
} from '../components/design/AvatarGlyph';

/**
 * The child avatar catalogue — one source of truth (spec §28).
 *
 * This list previously existed **twice**, byte-identical, in
 * `screens/profile/AddEditChildScreen.tsx` and
 * `screens/profile/ChildSelectionScreen.tsx`, and `components/dashboard/*`
 * imported the helpers from whichever copy it happened to reach for. Both
 * screens now re-export from here, so every existing import keeps working (§1)
 * while there is only one place to add an animal.
 *
 * `emoji` is what the pre-redesign UI drew. Emoji are not UI icons (§7), so the
 * redesigned screens pass `species` to `AvatarGlyph` and get a real drawn face
 * instead. The emoji field and `getAvatarEmoji` survive only for the two
 * dashboard components that have not been restyled yet, and should be deleted
 * along with their last caller.
 */
export interface AvatarAsset {
  /** Persisted on `Child.avatar` — these ids must never change. */
  id: string;
  /** Spoken/visible name, e.g. for the picker's accessibility label. */
  label: string;
  /** Which face `AvatarGlyph` draws. */
  species: AvatarSpecies;
  /** Palette tint behind the face (spec §3). */
  color: string;
  /** @deprecated Pre-redesign emoji. Render `species` via `AvatarGlyph`. */
  emoji: string;
}

/** What a new profile starts on, and the form's default value. */
export const DEFAULT_AVATAR_ID = 'avatar_panda';

export const AVATAR_ASSETS: AvatarAsset[] = [
  { id: 'avatar_panda', label: 'Panda', species: 'panda', color: speciesBackground('panda'), emoji: '🐼' },
  { id: 'avatar_bunny', label: 'Bunny', species: 'bunny', color: speciesBackground('bunny'), emoji: '🐰' },
  { id: 'avatar_cat', label: 'Cat', species: 'cat', color: speciesBackground('cat'), emoji: '🐱' },
  { id: 'avatar_fox', label: 'Fox', species: 'fox', color: speciesBackground('fox'), emoji: '🦊' },
  { id: 'avatar_tiger', label: 'Tiger', species: 'tiger', color: speciesBackground('tiger'), emoji: '🐯' },
  { id: 'avatar_bear', label: 'Bear', species: 'bear', color: speciesBackground('bear'), emoji: '🐻' },
];

export const getAvatarAsset = (avatarId?: string | null): AvatarAsset | undefined =>
  AVATAR_ASSETS.find((a) => a.id === avatarId);

/** Animal name for labels and screen readers. Falls back to a neutral word. */
export const getAvatarLabel = (avatarId?: string | null): string =>
  getAvatarAsset(avatarId)?.label ?? 'Explorer';

/**
 * Background tint for an avatar id. Unknown ids fall through
 * `resolveSpecies`, so a hand-typed value like `"bear-cub"` still gets the
 * right wash rather than the old flat grey.
 */
export const getAvatarBgColor = (avatarId: string): string =>
  getAvatarAsset(avatarId)?.color ?? speciesBackground(resolveSpecies(avatarId));

/**
 * @deprecated Emoji are not UI icons (spec §7) — pass the id straight to
 * `AvatarGlyph`, which resolves the species itself. Kept for
 * `components/dashboard/ChildSwitcher` and `DashboardHeader` until phase 8.
 */
export const getAvatarEmoji = (avatarId: string): string =>
  getAvatarAsset(avatarId)?.emoji ?? '👶';
