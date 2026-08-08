const VALID_S3_AUDIOS = [
  // Alphabet
  'audio/alphabet_audio/alphabet_001_a.mp3',
  'audio/alphabet_audio/alphabet_002_b.mp3',
  'audio/alphabet_audio/alphabet_003_c.mp3',
  'audio/alphabet_audio/alphabet_004_d.mp3',
  'audio/alphabet_audio/alphabet_005_e.mp3',
  'audio/alphabet_audio/alphabet_006_f.mp3',
  'audio/alphabet_audio/alphabet_007_g.mp3',
  'audio/alphabet_audio/alphabet_008_h.mp3',
  'audio/alphabet_audio/alphabet_009_i.mp3',
  'audio/alphabet_audio/alphabet_010_j.mp3',
  'audio/alphabet_audio/alphabet_011_k.mp3',
  'audio/alphabet_audio/alphabet_012_l.mp3',
  'audio/alphabet_audio/alphabet_013_m.mp3',
  'audio/alphabet_audio/alphabet_014_n.mp3',
  'audio/alphabet_audio/alphabet_015_o.mp3',
  'audio/alphabet_audio/alphabet_016_p.mp3',
  'audio/alphabet_audio/alphabet_017_q.mp3',
  'audio/alphabet_audio/alphabet_018_r.mp3',
  'audio/alphabet_audio/alphabet_019_s.mp3',
  'audio/alphabet_audio/alphabet_020_t.mp3',
  'audio/alphabet_audio/alphabet_021_u.mp3',
  'audio/alphabet_audio/alphabet_022_v.mp3',
  'audio/alphabet_audio/alphabet_023_w.mp3',
  'audio/alphabet_audio/alphabet_024_x.mp3',
  'audio/alphabet_audio/alphabet_025_y.mp3',
  'audio/alphabet_audio/alphabet_026_z.mp3',

  // Lines & Curves
  'audio/lines_curves/lines_curves_001_standing_line.mp3',
  'audio/lines_curves/lines_curves_002_sleeping_line.mp3',
  'audio/lines_curves/lines_curves_003_left_slanting_line.mp3',
  'audio/lines_curves/lines_curves_004_right_slanting_line.mp3',
  'audio/lines_curves/lines_curves_005_big_curve.mp3',
  'audio/lines_curves/lines_curves_006_small_curve.mp3',
  'audio/lines_curves/lines_curves_007_zigzag_line.mp3',

  // Numbers
  'audio/numbers/numbers_001_one.mp3',
  'audio/numbers/numbers_002_two.mp3',
  'audio/numbers/numbers_003_three.mp3',
  'audio/numbers/numbers_004_four.mp3',
  'audio/numbers/numbers_005_five.mp3',
  'audio/numbers/numbers_006_six.mp3',
  'audio/numbers/numbers_007_seven.mp3',
  'audio/numbers/numbers_008_eight.mp3',
  'audio/numbers/numbers_009_nine.mp3',
  'audio/numbers/numbers_010_ten.mp3',

  // Shapes
  'audio/shapes/shapes_001_circle.mp3',
  'audio/shapes/shapes_002_oval.mp3',
  'audio/shapes/shapes_003_triangle.mp3',
  'audio/shapes/shapes_004_square.mp3',
  'audio/shapes/shapes_005_rectangle.mp3',
  'audio/shapes/shapes_006_pentagon.mp3',
];

export function resolveAudioKey(node: { id: string; title: string }): string {
  const id = node.id.toLowerCase();
  const title = node.title.toLowerCase();

  // Explicit mappings for pre-nursery natural keys
  const EXPLICIT_MAP: Record<string, string> = {
    pn_line_following: 'audio/lines_curves/lines_curves_001_standing_line.mp3',
    pn_straight_and_slanting_linedrawing: 'audio/lines_curves/lines_curves_002_sleeping_line.mp3',
    pn_prewriting_lines_straight_lines: 'audio/lines_curves/lines_curves_003_left_slanting_line.mp3',
    pn_curve_tracing: 'audio/lines_curves/lines_curves_005_big_curve.mp3',
    pn_prewriting_curves: 'audio/lines_curves/lines_curves_006_small_curve.mp3',
    pn_pattern_tracing: 'audio/lines_curves/lines_curves_007_zigzag_line.mp3',
    pn_circle_square_triangle: 'audio/shapes/shapes_004_square.mp3',
    pn_rectangle_star_oval: 'audio/shapes/shapes_005_rectangle.mp3',
  };

  if (EXPLICIT_MAP[id]) {
    return EXPLICIT_MAP[id];
  }

  // 1. Letters A-Z
  const letterMatch = id.match(/letter_([a-z])$/) || title.match(/^letter ([a-z])$/i) || title.match(/^sound of ([a-z])$/i);
  if (letterMatch) {
    const char = letterMatch[1].toLowerCase();
    const found = VALID_S3_AUDIOS.find(v => v.includes('/alphabet_') && v.endsWith(`_${char}.mp3`));
    if (found) return found;
  }

  // 2. Numbers 1-10
  const numMatch = id.match(/number_(\d+)$/) || id.match(/count_(\d+)$/) || title.match(/^number (\d+)$/i) || title.match(/^count (\d+)$/i);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 1 && num <= 10) {
      const numPad = String(num).padStart(3, '0');
      const found = VALID_S3_AUDIOS.find(v => v.includes(`numbers_${numPad}_`));
      if (found) return found;
    }
  }

  // 3. Shapes
  if (id.includes('circle') || title.includes('circle')) return 'audio/shapes/shapes_001_circle.mp3';
  if (id.includes('oval') || title.includes('oval')) return 'audio/shapes/shapes_002_oval.mp3';
  if (id.includes('triangle') || title.includes('triangle')) return 'audio/shapes/shapes_003_triangle.mp3';
  if (id.includes('square') || title.includes('square')) return 'audio/shapes/shapes_004_square.mp3';
  if (id.includes('rectangle') || title.includes('rectangle')) return 'audio/shapes/shapes_005_rectangle.mp3';
  if (id.includes('pentagon') || title.includes('pentagon')) return 'audio/shapes/shapes_006_pentagon.mp3';

  // 4. Lines & Curves
  if (id.includes('standing') || title.includes('standing line')) return 'audio/lines_curves/lines_curves_001_standing_line.mp3';
  if (id.includes('sleeping') || title.includes('sleeping line')) return 'audio/lines_curves/lines_curves_002_sleeping_line.mp3';
  if (id.includes('left_slanting') || title.includes('left slanting')) return 'audio/lines_curves/lines_curves_003_left_slanting_line.mp3';
  if (id.includes('right_slanting') || title.includes('right slanting')) return 'audio/lines_curves/lines_curves_004_right_slanting_line.mp3';
  if (id.includes('big_curve') || title.includes('big curve')) return 'audio/lines_curves/lines_curves_005_big_curve.mp3';
  if (id.includes('small_curve') || title.includes('small curve')) return 'audio/lines_curves/lines_curves_006_small_curve.mp3';
  if (id.includes('zigzag') || title.includes('zigzag')) return 'audio/lines_curves/lines_curves_007_zigzag_line.mp3';

  return 'coming_soon';
}
