const VALID_S3_VIDEOS = [
  'videos/alphabet/alphabet_001_a_apple.mp4',
  'videos/alphabet/alphabet_002_b_ball.mp4',
  'videos/alphabet/alphabet_003_c_cat.mp4',
  'videos/alphabet/alphabet_004_d_dog.mp4',
  'videos/alphabet/alphabet_005_e_egg.mp4',
  'videos/alphabet/alphabet_006_f_fish.mp4',
  'videos/alphabet/alphabet_007_g_grapes.mp4',
  'videos/alphabet/alphabet_008_h_house.mp4',
  'videos/alphabet/alphabet_009_i_icecream.mp4',
  'videos/alphabet/alphabet_010_j_jar.mp4',
  'videos/alphabet/alphabet_011_k_kite.mp4',
  'videos/alphabet/alphabet_012_l_lion.mp4',
  'videos/alphabet/alphabet_013_m_mango.mp4',
  'videos/alphabet/alphabet_014_n_nest.mp4',
  'videos/alphabet/alphabet_015_o_owl.mp4',
  'videos/alphabet/alphabet_016_p_parrot.mp4',
  'videos/alphabet/alphabet_017_q_queen.mp4',
  'videos/alphabet/alphabet_018_r_rabbit.mp4',
  'videos/alphabet/alphabet_019_s_sun.mp4',
  'videos/alphabet/alphabet_020_t_tiger.mp4',
  'videos/alphabet/alphabet_021_u_umbrella.mp4',
  'videos/alphabet/alphabet_022_v_van.mp4',
  'videos/alphabet/alphabet_023_w_watch.mp4',
  'videos/alphabet/alphabet_024_x_xylophone.mp4',
  'videos/alphabet/alphabet_025_y_yak.mp4',
  'videos/alphabet/alphabet_026_z_zebra.mp4',
  'videos/lines_and_curves/prewriting_001_standing_line.mp4',
  'videos/lines_and_curves/prewriting_002_sleeping_line.mp4',
  'videos/lines_and_curves/prewriting_003_left_slanting_line.mp4',
  'videos/lines_and_curves/prewriting_004_right_slanting_line.mp4',
  'videos/lines_and_curves/prewriting_005_big_curve.mp4',
  'videos/lines_and_curves/prewriting_006_small_curve.mp4',
  'videos/lines_and_curves/prewriting_007_zigzag_line.mp4',
  'videos/numbers/numbers_001_one.mp4',
  'videos/numbers/numbers_002_two.mp4',
  'videos/numbers/numbers_003_three.mp4',
  'videos/numbers/numbers_004_four.mp4',
  'videos/numbers/numbers_005_five.mp4',
  'videos/numbers/numbers_006_six.mp4',
  'videos/numbers/numbers_007_seven.mp4',
  'videos/numbers/numbers_008_eight.mp4',
  'videos/numbers/numbers_009_nine.mp4',
  'videos/numbers/numbers_010_ten.mp4',
  'videos/shapes/shapes_001_circle.mp4',
  'videos/shapes/shapes_002_square.mp4',
  'videos/shapes/shapes_003_triangle.mp4',
  'videos/shapes/shapes_004_rectangle.mp4',
  'videos/shapes/shapes_005_oval.mp4',
  'videos/shapes/shapes_006_pentagon.mp4',
];

export function resolveVideoKey(node: { id: string; title: string }): string {
  const id = node.id.toLowerCase();
  const title = node.title.toLowerCase();

  // Explicit mappings for pre-nursery natural keys
  const EXPLICIT_MAP: Record<string, string> = {
    pn_line_following: 'videos/lines_and_curves/prewriting_001_standing_line.mp4',
    pn_straight_and_slanting_linedrawing: 'videos/lines_and_curves/prewriting_002_sleeping_line.mp4',
    pn_prewriting_lines_straight_lines: 'videos/lines_and_curves/prewriting_003_left_slanting_line.mp4',
    pn_curve_tracing: 'videos/lines_and_curves/prewriting_005_big_curve.mp4',
    pn_prewriting_curves: 'videos/lines_and_curves/prewriting_006_small_curve.mp4',
    pn_pattern_tracing: 'videos/lines_and_curves/prewriting_007_zigzag_line.mp4',
    pn_circle_square_triangle: 'videos/shapes/shapes_002_square.mp4',
    pn_rectangle_star_oval: 'videos/shapes/shapes_004_rectangle.mp4',
  };

  if (EXPLICIT_MAP[id]) {
    return EXPLICIT_MAP[id];
  }

  // 1. Letters A-Z
  const letterMatch = id.match(/letter_([a-z])$/) || title.match(/^letter ([a-z])$/i) || title.match(/^sound of ([a-z])$/i);
  if (letterMatch) {
    const char = letterMatch[1].toLowerCase();
    const found = VALID_S3_VIDEOS.find(v => v.includes('/alphabet_') && v.includes(`_${char}_`));
    if (found) return found;
  }

  // 2. Numbers 1-10
  const numMatch = id.match(/number_(\d+)$/) || id.match(/count_(\d+)$/) || title.match(/^number (\d+)$/i) || title.match(/^count (\d+)$/i);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 1 && num <= 10) {
      const numPad = String(num).padStart(3, '0');
      const found = VALID_S3_VIDEOS.find(v => v.includes(`numbers_${numPad}_`));
      if (found) return found;
    }
  }

  // 3. Shapes
  if (id.includes('circle') || title.includes('circle')) return 'videos/shapes/shapes_001_circle.mp4';
  if (id.includes('square') || title.includes('square')) return 'videos/shapes/shapes_002_square.mp4';
  if (id.includes('triangle') || title.includes('triangle')) return 'videos/shapes/shapes_003_triangle.mp4';
  if (id.includes('rectangle') || title.includes('rectangle')) return 'videos/shapes/shapes_004_rectangle.mp4';
  if (id.includes('oval') || title.includes('oval')) return 'videos/shapes/shapes_005_oval.mp4';
  if (id.includes('pentagon') || title.includes('pentagon')) return 'videos/shapes/shapes_006_pentagon.mp4';

  // 4. Lines & Curves
  if (id.includes('standing') || title.includes('standing line')) return 'videos/lines_and_curves/prewriting_001_standing_line.mp4';
  if (id.includes('sleeping') || title.includes('sleeping line')) return 'videos/lines_and_curves/prewriting_002_sleeping_line.mp4';
  if (id.includes('left_slanting') || title.includes('left slanting')) return 'videos/lines_and_curves/prewriting_003_left_slanting_line.mp4';
  if (id.includes('right_slanting') || title.includes('right slanting')) return 'videos/lines_and_curves/prewriting_004_right_slanting_line.mp4';
  if (id.includes('big_curve') || title.includes('big curve')) return 'videos/lines_and_curves/prewriting_005_big_curve.mp4';
  if (id.includes('small_curve') || title.includes('small curve')) return 'videos/lines_and_curves/prewriting_006_small_curve.mp4';
  if (id.includes('zigzag') || title.includes('zigzag')) return 'videos/lines_and_curves/prewriting_007_zigzag_line.mp4';

  return 'coming_soon';
}
