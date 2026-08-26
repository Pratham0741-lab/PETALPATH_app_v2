# Illustration manifest

This folder holds the painted character artwork for PetalPath. It is currently
**empty**, and the app is built to work that way: every call site passes a
`fallback` (an `IconWell`, an `AvatarGlyph`, a drawn scene) so nothing looks
broken before the art arrives, and each screen upgrades itself the moment a file
lands here.

Everything below is what an illustrator needs to deliver, and what a developer
needs to do to switch a slot on.

## How to add a finished illustration

1. Drop the files in this folder: `watch.png`, `watch@2x.png`, `watch@3x.png`.
   Metro finds the `@2x` / `@3x` siblings on its own — only the base name is ever
   referenced in code.
2. Open `src/components/design/Illustration.tsx` and **uncomment that slot's line**
   in the `ILLUSTRATIONS` map.
3. Reload. Every screen using that slot picks it up.

Step 2 cannot be skipped or automated. Metro resolves `require()` at bundle time
from a literal string, so a path built from a variable
(`require(`./${name}.png`)`) does not work, and a `require()` pointing at a file
that does not exist fails the **whole bundle**, not one screen. That is why the
lines ship commented out rather than written ahead of the files.

If the project ever adds an `assetBundlePatterns` allow-list to `app.json`
(there is none today, so Expo bundles everything), this folder has to be included
in it.

## Art direction

The app's own drawn elements — `AvatarGlyph`, `SceneBand`, `PetalIcon` — set the
house style, and new artwork should sit beside them rather than argue with them:

- **Palette.** Draw from the existing tokens in `src/theme/colors.ts`: pink
  `#F43F72`, purple `#8064D8`, yellow `#F6C94A`, green `#8FC27A`, blue `#4F91D9`,
  orange `#EE8C3C`, coral `#F4776E`, peach `#FBD6C4`. Outlines and facial
  features use the ink `#3A322F` that `AvatarGlyph` uses, not black.
- **Backgrounds.** Character slots must be exported on **transparency**. They are
  composited over cards and over the cream `#FFF8FA` app background, and a white
  rectangle behind a character shows as a box. The two scene slots may carry
  their own background.
- **Shape language.** Rounded, soft-cornered, no hairline detail. These are seen
  at 120–200pt on a phone, and a 1px whisker disappears.
- **Framing.** Characters sit fully inside the frame with a small margin — the
  component uses `resizeMode="contain"` and will never crop, but a character
  touching the edge reads as clipped.
- **Audience.** Ages 4–8. Friendly, awake, facing the viewer. No text baked into
  the artwork; all copy is live and localisable.

## The slots

Widths come from `src/theme/illustrationSizes.ts` (`sm` 120, `md` 160, `lg` 200,
`xl` 280) so the pixel sizes below are the tokens, not new numbers. Export at
@2x and @3x for phone screens.

| Slot | Filename | Subject | Aspect | @1x | @2x | @3x |
| --- | --- | --- | --- | --- | --- | --- |
| `watch` | `watch.png` | Elephant sitting with an open book — the Watch & Learn character | 1:1 | 160×160 | 320×320 | 480×480 |
| `listen` | `listen.png` | Boombox with a handle, dials and a cheerful face | 1:1 | 160×160 | 320×320 | 480×480 |
| `speak` | `speak.png` | Parrot on a branch, beak open mid-word | 1:1 | 160×160 | 320×320 | 480×480 |
| `match` | `match.png` | Bee in flight, holding one puzzle piece | 1:1 | 160×160 | 320×320 | 480×480 |
| `trace` | `trace.png` | Character holding an oversized pencil, mid-stroke | 1:1 | 160×160 | 320×320 | 480×480 |
| `celebrate` | `celebrate.png` | Gold star with a face, arms up — the completion mascot | 1:1 | 160×160 | 320×320 | 480×480 |
| `mentor` | `mentor.png` | Panda standing in a garden — the mentor portrait | 1:1 | 200×200 | 400×400 | 600×600 |
| `camera` | `camera.png` | Garden scene with a tree and watering can, room for a child's silhouette in front | 16:9 | 360×203 | 720×405 | 1080×608 |
| `welcome` | `welcome.png` | Cherry-blossom branch across the top of a soft sky | 16:9 | 360×203 | 720×405 | 1080×608 |
| `empty` | `empty.png` | Small character shrugging beside an empty basket | 1:1 | 120×120 | 240×240 | 360×360 |

Ten files at three densities is thirty exports. If that has to be staged, the
order that buys the most visible change per file is `celebrate` (it is the only
slot wired to a live screen today), then `mentor`, then the five activity
characters, then the two scenes, then `empty`.

## Where each slot is used

Only `celebrate` is wired in so far — the hero of `CelebrationScaffold`, which is
shared by the Lesson, Module, Category and Story completion screens. The other
nine are declared so that art can be commissioned in parallel with the screens
that will consume them; wiring one up is a single `<Illustration>` element with
the screen's current visual passed as `fallback`.

## Format

PNG-24 with alpha. WebP is smaller and both platforms support it, but PNG is the
safe default for artwork with soft edges and it is what the existing assets in
`frontend/assets/` use — switch the whole set together if you switch at all,
since mixed formats in one folder are how a `@3x` ends up missing.
