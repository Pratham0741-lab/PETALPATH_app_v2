import sharp from 'sharp';
import path from 'node:path';

const SRC = 'D:/petalpath/assets/backgrounds';
const DEST = 'D:/petalpath/PETALPATH_app_v2.0/frontend/src/assets/backgrounds';

// Source ChatGPT export -> app background name (mapped by viewing each image).
const MAP = {
  'ChatGPT Image Sep 3, 2026, 03_20_23 PM.png': 'bg_home',
  'ChatGPT Image Sep 3, 2026, 03_20_27 PM.png': 'bg_explore',
  'ChatGPT Image Sep 3, 2026, 03_20_30 PM.png': 'bg_camera',
  'ChatGPT Image Sep 3, 2026, 03_20_32 PM.png': 'bg_mentors',
  'ChatGPT Image Sep 3, 2026, 03_20_34 PM.png': 'bg_rewards',
  'ChatGPT Image Sep 3, 2026, 03_20_37 PM.png': 'bg_profile',
  'ChatGPT Image Sep 3, 2026, 03_20_39 PM.png': 'bg_watch',
  'ChatGPT Image Sep 3, 2026, 03_20_42 PM.png': 'bg_listen',
  'ChatGPT Image Sep 3, 2026, 03_20_44 PM.png': 'bg_speak',
  'ChatGPT Image Sep 3, 2026, 03_20_46 PM.png': 'bg_trace',
  'ChatGPT Image Sep 3, 2026, 03_20_48 PM.png': 'bg_match',
};

// "Recede" treatment so the background stays quiet behind app content:
//  - drop saturation so the colours are gentle, not shouty
//  - bake a soft white veil (pull every pixel toward white) to lower contrast
// White veil = out = in*(1-V) + 255*V  ->  linear(a = 1-V, b = 255*V)
const SATURATION = 0.68; // 1 = original; lower = calmer colour
const VEIL = 0.32;       // 0 = none; higher = more washed toward white
const a = 1 - VEIL;
const b = 255 * VEIL;

// Output 9:16 portrait, cover-fit, compressed JPG.
const W = 1080;
const H = 1920;

const run = async () => {
  for (const [file, name] of Object.entries(MAP)) {
    const inPath = path.join(SRC, file);
    // `_v2` suffix: Metro caches assets by filename, so a content change under
    // the same name serves the stale image. Bump the suffix when art changes.
    const outPath = path.join(DEST, `${name}_v2.jpg`);
    await sharp(inPath)
      .resize(W, H, { fit: 'cover', position: 'centre' })
      .modulate({ saturation: SATURATION })
      .linear(a, b)
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(outPath);
    console.log(`${name}.jpg  <-  ${file}`);
  }
  console.log('done');
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
