/**
 * Match & Learn content blueprints — PetalPath Drag & Drop generation
 *
 * One entry per lesson that ships a drag & drop activity. Each is derived from
 * that lesson's `curriculum.original_topic`, which is where the real content has
 * been sitting all along — the previous generator ignored it entirely and emitted
 * 43 near-identical boards of blank squares.
 *
 * Two authoring rules, both forced by the engine:
 *
 *  1. **One tile per slot.** `PlacementState` keys placements by zone id, so a
 *     zone physically cannot hold two tiles. A "sort six things into three bins"
 *     lesson is therefore written as three slots that each accept *any of* a set
 *     — the child picks one animal that walks, one that flies, one that swims.
 *     They still choose; the board just does not hoard.
 *  2. **Tile texts are unique within a board.** Zones resolve their accepted ids
 *     by text, so a duplicate would be ambiguous.
 *
 * Where a topic describes something text tiles cannot do — a scissor simulation,
 * a 6-piece jigsaw — the blueprint expresses the same *skill* in a form this
 * engine can actually deliver, rather than shipping a board that pretends. Those
 * are flagged with a NOTE.
 */

import type { Blueprint } from './board.js';

const HI = 'hi-IN';

/**
 * Consonant → syllable boards for the ten LKG matra lessons. The child reads the
 * matra rather than the consonant, so the distractors are deliberately the *same*
 * consonants carrying a different matra.
 */
function matraForm(matra: string, distractors: [string, string]): Blueprint {
  return {
    templateId: 'consonant-plus-matra',
    prompt: `Add the ${matra ? 'matra' : 'sign'} to each letter. Drag the right syllable onto its letter.`,
    language: HI,
    slots: [
      { label: 'क', accepts: [`क${matra}`], sr: 'Box for the letter ka' },
      { label: 'म', accepts: [`म${matra}`], sr: 'Box for the letter ma' },
      { label: 'द', accepts: [`द${matra}`], sr: 'Box for the letter da' },
    ],
    distractors,
  };
}

/**
 * Word → syllable boards for the six UKG word-building lessons. The tile is the
 * syllable inside the word that carries the lesson's matra, so the child has to
 * find it; the distractors are the same consonant with a neighbouring matra.
 */
function wordBuild(
  matraName: string,
  pairs: Array<[word: string, syllable: string]>,
  distractors: string[]
): Blueprint {
  return {
    templateId: 'word-to-syllable',
    prompt: `Find the ${matraName} sound in each word. Drag the syllable onto the word it belongs to.`,
    language: HI,
    slots: pairs.map(([word, syllable]) => ({
      label: word,
      accepts: [syllable],
      sr: `Box for the word ${word}`,
    })),
    distractors,
  };
}

export const BLUEPRINTS: Record<string, Blueprint> = {
  // ------------------------------------------------------------ pre-nursery
  pn_animal_babies: {
    templateId: 'animal-to-baby',
    prompt: 'Every animal is looking for its baby. Drag each baby to its mother.',
    slots: [
      { label: 'Cow', accepts: ['Calf'], sr: 'Box for the cow' },
      { label: 'Dog', accepts: ['Puppy'], sr: 'Box for the dog' },
      { label: 'Cat', accepts: ['Kitten'], sr: 'Box for the cat' },
    ],
    distractors: ['Chick'],
  },

  pn_playbased_sorting: {
    templateId: 'sort-by-size',
    prompt: 'One big thing and one small thing. Drag a toy into each box.',
    slots: [
      { label: 'Big', accepts: ['Elephant', 'Bus'], sr: 'Box for big things' },
      { label: 'Small', accepts: ['Ant', 'Button'], sr: 'Box for small things' },
    ],
  },

  pn_sorting_continued: {
    templateId: 'sort-by-length',
    prompt: 'Which one is long and which one is short? Drag one into each box.',
    slots: [
      { label: 'Long', accepts: ['Snake', 'Train'], sr: 'Box for long things' },
      { label: 'Short', accepts: ['Pencil', 'Key'], sr: 'Box for short things' },
    ],
  },

  pn_position_words: {
    templateId: 'inside-or-outside',
    prompt: 'Some things live inside the house and some stay outside. Drag one into each box.',
    slots: [
      { label: 'Inside', accepts: ['Bed', 'Sofa'], sr: 'Box for things inside the house' },
      { label: 'Outside', accepts: ['Tree', 'Swing'], sr: 'Box for things outside the house' },
    ],
  },

  pn_comparing: {
    templateId: 'heavy-or-light',
    prompt: 'One side of the see-saw goes down. Drag a heavy thing and a light thing.',
    slots: [
      { label: 'Heavy', accepts: ['Rock', 'Truck'], sr: 'Box for heavy things' },
      { label: 'Light', accepts: ['Feather', 'Balloon'], sr: 'Box for light things' },
    ],
  },

  pn_matching: {
    templateId: 'match-identical',
    prompt: 'Find the shape that is exactly the same. Drag it onto its twin.',
    slots: [
      { label: 'Star', accepts: ['Star'], sr: 'Box for the star' },
      { label: 'Heart', accepts: ['Heart'], sr: 'Box for the heart' },
      { label: 'Moon', accepts: ['Moon'], sr: 'Box for the moon' },
    ],
    distractors: ['Sun'],
  },

  pn_sequencing: {
    templateId: 'order-by-size',
    prompt: 'Line them up from the biggest to the smallest.',
    slots: [
      { label: 'Biggest', accepts: ['Elephant'], sr: 'Box for the biggest animal' },
      { label: 'Middle', accepts: ['Dog'], sr: 'Box for the middle animal' },
      { label: 'Smallest', accepts: ['Ant'], sr: 'Box for the smallest animal' },
    ],
  },

  pn_classification: {
    templateId: 'sort-by-colour',
    prompt: 'Sort them by colour. Drag each thing into the box that matches it.',
    slots: [
      { label: 'Red', accepts: ['Apple'], sr: 'Box for red things' },
      { label: 'Yellow', accepts: ['Banana'], sr: 'Box for yellow things' },
      { label: 'Green', accepts: ['Leaf'], sr: 'Box for green things' },
    ],
    distractors: ['Plum'],
  },

  pn_drag_objects: {
    templateId: 'object-to-container',
    prompt: 'Put the ball in the basket. Take your time!',
    slots: [{ label: 'Basket', accepts: ['Ball'], sr: 'The basket' }],
    distractors: ['Shoe', 'Cup'],
  },

  // ---------------------------------------------------------------- nursery
  // NOTE: the topic is a scissor simulation — a gesture this engine has no way to
  // express. The board keeps the lesson's subject (the tools of fine-motor work)
  // in a form it can actually deliver, instead of faking a cutting line.
  n_fm_cutting: {
    templateId: 'tool-to-task',
    prompt: 'Which tool does each job? Drag the tool onto its job.',
    slots: [
      { label: 'Cut', accepts: ['Scissors'], sr: 'Box for cutting' },
      { label: 'Colour', accepts: ['Crayon'], sr: 'Box for colouring' },
      { label: 'Stick', accepts: ['Glue'], sr: 'Box for sticking' },
    ],
  },

  n_fm_sorting: {
    templateId: 'sort-by-category',
    prompt: 'Sort them into groups. Drag one thing into each box.',
    slots: [
      { label: 'Fruit', accepts: ['Mango', 'Grapes'], sr: 'Box for fruit' },
      { label: 'Animal', accepts: ['Tiger', 'Goat'], sr: 'Box for animals' },
      { label: 'Toy', accepts: ['Ball', 'Doll'], sr: 'Box for toys' },
    ],
  },

  // NOTE: a 6-piece jigsaw needs image slicing, which this engine does not have.
  // Same underlying skill — which part completes the whole — with text pieces.
  n_fm_puzzle: {
    templateId: 'part-to-whole',
    prompt: 'Finish the picture. Drag each piece where it belongs.',
    slots: [
      { label: 'Head', accepts: ['Hat'], sr: 'Box for the head' },
      { label: 'Hand', accepts: ['Glove'], sr: 'Box for the hand' },
      { label: 'Foot', accepts: ['Shoe'], sr: 'Box for the foot' },
    ],
    distractors: ['Bag'],
  },

  // -------------------------------------------------------------------- LKG
  lkg_classification: {
    templateId: 'sort-numbers',
    prompt: 'Is the number smaller or bigger than 20? Drag one into each box.',
    slots: [
      { label: 'Under 20', accepts: ['7', '12'], sr: 'Box for numbers less than twenty' },
      { label: 'Over 20', accepts: ['34', '41'], sr: 'Box for numbers more than twenty' },
    ],
  },

  lkg_hi_aa_form: matraForm('ा', ['कि', 'मे']),
  lkg_hi_i_form: matraForm('ि', ['का', 'मू']),
  lkg_hi_ee_form: matraForm('ी', ['कि', 'मा']),
  lkg_hi_u_form: matraForm('ु', ['कू', 'मा']),
  lkg_hi_uu_form: matraForm('ू', ['कु', 'मे']),
  lkg_hi_e_form: matraForm('े', ['कै', 'मा']),
  lkg_hi_ai_form: matraForm('ै', ['के', 'मा']),
  lkg_hi_o_form: matraForm('ो', ['कौ', 'मा']),
  lkg_hi_au_form: matraForm('ौ', ['को', 'मा']),
  lkg_hi_am_form: matraForm('ं', ['का', 'मे']),

  lkg_fm_drag_sort: {
    templateId: 'sort-three-bins',
    prompt: 'Three boxes, three groups. Drag one thing into each box.',
    slots: [
      { label: 'Animal', accepts: ['Cow', 'Hen'], sr: 'Box for animals' },
      { label: 'Fruit', accepts: ['Mango', 'Apple'], sr: 'Box for fruit' },
      { label: 'Vehicle', accepts: ['Bus', 'Train'], sr: 'Box for vehicles' },
    ],
  },

  lkg_sel_organising: {
    templateId: 'tidy-up',
    prompt: 'Time to tidy up! Drag each thing where it is kept.',
    slots: [
      { label: 'Toy Box', accepts: ['Ball', 'Teddy'], sr: 'The toy box' },
      { label: 'School Bag', accepts: ['Pencil', 'Crayon'], sr: 'The school bag' },
    ],
  },

  // -------------------------------------------------------------------- UKG
  ukg_place_value: {
    templateId: 'place-value',
    prompt: 'The number is 42. Drag each digit into its place.',
    slots: [
      { label: 'Tens', accepts: ['4'], sr: 'The tens place' },
      { label: 'Ones', accepts: ['2'], sr: 'The ones place' },
    ],
    distractors: ['7', '9'],
  },

  ukg_money_extended: {
    templateId: 'add-coins',
    prompt: 'Add the coins. Drag each pair onto the total it makes.',
    slots: [
      { label: '₹7', accepts: ['5 + 2'], sr: 'Box for seven rupees' },
      { label: '₹10', accepts: ['5 + 5'], sr: 'Box for ten rupees' },
      { label: '₹15', accepts: ['10 + 5'], sr: 'Box for fifteen rupees' },
    ],
  },

  ukg_asc_desc: {
    templateId: 'ascending-order',
    prompt: 'Smallest first. Drag the numbers into growing order.',
    slots: [
      { label: '1st', accepts: ['12'], sr: 'First place, the smallest' },
      { label: '2nd', accepts: ['25'], sr: 'Second place' },
      { label: '3rd', accepts: ['38'], sr: 'Third place' },
      { label: '4th', accepts: ['47'], sr: 'Fourth place, the biggest' },
    ],
  },

  ukg_asc_desc_jan: {
    templateId: 'descending-order',
    prompt: 'Biggest first this time. Drag the numbers into shrinking order.',
    slots: [
      { label: '1st', accepts: ['90'], sr: 'First place, the biggest' },
      { label: '2nd', accepts: ['72'], sr: 'Second place' },
      { label: '3rd', accepts: ['55'], sr: 'Third place' },
      { label: '4th', accepts: ['31'], sr: 'Fourth place, the smallest' },
    ],
  },

  ukg_aa_word_build: wordBuild(
    'आ',
    [
      ['माला', 'मा'],
      ['नाना', 'ना'],
      ['काका', 'का'],
    ],
    ['मि', 'नी']
  ),
  ukg_i_word_build: wordBuild(
    'इ',
    [
      ['दिन', 'दि'],
      ['किला', 'कि'],
      ['तिल', 'ति'],
    ],
    ['दा', 'की']
  ),
  ukg_ee_word_build: wordBuild(
    'ई',
    [
      ['नदी', 'दी'],
      ['मछली', 'ली'],
      ['सीढ़ी', 'सी'],
    ],
    ['दि', 'ला']
  ),
  ukg_u_word_build: wordBuild(
    'उ',
    [
      ['गुल', 'गु'],
      ['सुन', 'सु'],
      ['तुम', 'तु'],
    ],
    ['गू', 'सा']
  ),
  ukg_uu_word_build: wordBuild(
    'ऊ',
    [
      ['फूल', 'फू'],
      ['भूल', 'भू'],
      ['सूरज', 'सू'],
    ],
    ['फु', 'भा']
  ),
  ukg_e_word_build: wordBuild(
    'ए',
    [
      ['मेला', 'मे'],
      ['रेल', 'रे'],
      ['खेल', 'खे'],
    ],
    ['मै', 'रा']
  ),

  ukg_fm_sequence_5: {
    templateId: 'order-five-steps',
    prompt: 'Brushing your teeth, step by step. Drag them into order.',
    slots: [
      { label: '1', accepts: ['Wet'], sr: 'Step one' },
      { label: '2', accepts: ['Paste'], sr: 'Step two' },
      { label: '3', accepts: ['Brush'], sr: 'Step three' },
      { label: '4', accepts: ['Rinse'], sr: 'Step four' },
      { label: '5', accepts: ['Dry'], sr: 'Step five' },
    ],
  },

  ukg_fm_sort_4bin: {
    templateId: 'sort-four-bins',
    prompt: 'Where does each one travel? Drag it into the right box.',
    slots: [
      { label: 'Land', accepts: ['Car', 'Bus'], sr: 'Box for things that travel on land' },
      { label: 'Water', accepts: ['Boat', 'Ship'], sr: 'Box for things that travel on water' },
      { label: 'Air', accepts: ['Plane'], sr: 'Box for things that travel in the air' },
      { label: 'Space', accepts: ['Rocket'], sr: 'Box for things that travel in space' },
    ],
  },

  ukg_sel_healthy: {
    templateId: 'balanced-plate',
    prompt: 'Build a balanced plate. Drag one food into each box.',
    slots: [
      { label: 'Grow', accepts: ['Egg', 'Dal'], sr: 'Grow foods, which build your body' },
      { label: 'Go', accepts: ['Rice', 'Roti'], sr: 'Go foods, which give you energy' },
      { label: 'Glow', accepts: ['Carrot', 'Orange'], sr: 'Glow foods, which keep you well' },
    ],
  },

  ukg_sel_helping: {
    templateId: 'helping-or-not',
    prompt: 'Your group has one box of crayons. Which choices help?',
    slots: [
      { label: 'Helping', accepts: ['Share', 'Tidy'], sr: 'Box for helping choices' },
      { label: 'Not Helping', accepts: ['Grab', 'Shout'], sr: 'Box for choices that do not help' },
    ],
  },

  ukg_sel_teamwork: {
    templateId: 'turn-taking',
    prompt: 'Taking turns has an order. Drag the steps into place.',
    slots: [
      { label: '1st', accepts: ['Ask'], sr: 'First step' },
      { label: '2nd', accepts: ['Wait'], sr: 'Second step' },
      { label: '3rd', accepts: ['Share'], sr: 'Third step' },
    ],
  },

  ukg_evs_myself: {
    templateId: 'about-me',
    prompt: 'This is Asha. She is 5 and she loves mangoes. Fill in her card.',
    slots: [
      { label: 'Name', accepts: ['Asha'], sr: 'Box for the name' },
      { label: 'Age', accepts: ['5'], sr: 'Box for the age' },
      { label: 'Likes', accepts: ['Mango'], sr: 'Box for what she likes' },
    ],
    distractors: ['9'],
  },

  ukg_evs_animals: {
    templateId: 'animal-movement',
    prompt: 'How does each animal move? Drag one animal into each box.',
    slots: [
      { label: 'Walks', accepts: ['Dog', 'Cat'], sr: 'Box for animals that walk' },
      { label: 'Flies', accepts: ['Bird', 'Bee'], sr: 'Box for animals that fly' },
      { label: 'Swims', accepts: ['Fish', 'Crab'], sr: 'Box for animals that swim' },
    ],
  },

  pn_letter_c: {
    templateId: 'letter-to-outline',
    prompt: 'Find the letter C and drag it onto its outline.',
    slots: [{ label: 'C', accepts: ['C'], sr: 'Outline of the letter C' }],
    distractors: ['A', 'B', 'D'],
  },
};

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

/**
 * Pulls a bracketed list out of a topic string: "…by category (animals/fruits/
 * vehicles)" → `['animals', 'fruits', 'vehicles']`. Splits on slashes, commas and
 * en/em dashes, because the curriculum uses all of them.
 */
function parseParenthetical(topic: string): string[] {
  const match = topic.match(/\(([^)]+)\)/);
  if (!match || !match[1]) return [];
  return match[1]
    .split(/[\/,;]|\s+—\s+|\s+–\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 24);
}

/** "big vs. small", "heavy/light", "inside/outside" → the two poles. */
function parseContrast(topic: string): string[] {
  const vs = topic.match(/([A-Za-z]+)\s+vs\.?\s+([A-Za-z]+)/i);
  if (vs && vs[1] && vs[2]) return [vs[1], vs[2]];
  return [];
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Last resort for a lesson with no blueprint — a new curriculum node, say.
 *
 * It reads what it can out of `original_topic` and, failing that, builds a
 * letter-matching board from the node id. It is deliberately plain: the point is
 * that an unmapped lesson degrades to something honest and playable rather than
 * to four squares reading "sr label", which is what the old generator did.
 */
export function fallbackBlueprint(nodeId: string, title: string, topic?: string): Blueprint {
  const source = topic ?? title ?? '';

  const listed = parseParenthetical(source);
  if (listed.length >= 2) {
    // A word-matching board, not a categorisation one. The topic gave us the
    // category *names* but no example items to sort into them, and inventing
    // items here would be guessing at curriculum. Matching the word to its own
    // box is a real reading task and does not pretend to be more.
    const picked = [...new Set(listed.map(titleCase))].slice(0, 4);
    return {
      templateId: 'derived-word-match',
      prompt: 'Read each word and drag it onto the box with the same word.',
      slots: picked.map((label) => ({
        label,
        accepts: [label],
        sr: `Box for ${label}`,
      })),
    };
  }

  const poles = parseContrast(source);
  if (poles.length === 2) {
    const [a, b] = poles as [string, string];
    return {
      templateId: 'derived-contrast',
      prompt: `Which one is ${a.toLowerCase()} and which is ${b.toLowerCase()}?`,
      slots: [
        { label: titleCase(a), accepts: [titleCase(a)], sr: `Box for ${a}` },
        { label: titleCase(b), accepts: [titleCase(b)], sr: `Box for ${b}` },
      ],
    };
  }

  // Letter board. Prefers an explicit "Letter X" in the title, then a trailing
  // single-character segment of the node id, then A.
  const letterMatch = source.match(/letter\s+([a-z])/i) ?? nodeId.match(/letter_([a-z])\b/i);
  const tail = nodeId.split('_').pop() ?? '';
  const letter = (
    letterMatch?.[1] ?? (tail.length === 1 && /[a-z]/i.test(tail) ? tail : 'A')
  ).toUpperCase();

  const distractors = ['A', 'B', 'C', 'D', 'E', 'M', 'S', 'T']
    .filter((l) => l !== letter)
    .slice(0, 3);

  return {
    templateId: 'letter-to-outline',
    prompt: `Find the letter ${letter} and drag it onto its outline.`,
    slots: [{ label: letter, accepts: [letter], sr: `Outline of the letter ${letter}` }],
    distractors,
  };
}
