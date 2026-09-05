import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

/*
 * The background scenes ship as ~1.5MB PNGs. Android decodes the full PNG every
 * time a screen mounts, which is what made switching tabs (Camera, Explore) feel
 * slow. JPEG at high quality is visually identical for these painted scenes and
 * roughly a tenth of the bytes, so the decode is far cheaper.
 *
 * Dimensions are untouched — the artwork is not cropped or resized, only
 * re-encoded.
 */
const DIR = 'D:/petalpath/PETALPATH_app_v2.0/frontend/src/assets/backgrounds';
const QUALITY = 86;

const run = async () => {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.png'));
  let before = 0;
  let after = 0;

  for (const file of files) {
    const src = path.join(DIR, file);
    const out = path.join(DIR, file.replace(/\.png$/, '.jpg'));
    const meta = await sharp(src).metadata();
    await sharp(src).jpeg({ quality: QUALITY, mozjpeg: true }).toFile(out);

    const b = fs.statSync(src).size;
    const a = fs.statSync(out).size;
    before += b;
    after += a;
    console.log(
      `${file} ${meta.width}x${meta.height}  ${(b / 1024).toFixed(0)}KB -> ${(a / 1024).toFixed(0)}KB`,
    );
    fs.unlinkSync(src);
  }

  console.log(
    `\nTOTAL ${(before / 1024 / 1024).toFixed(1)}MB -> ${(after / 1024 / 1024).toFixed(2)}MB`,
  );
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
