import { colors } from '../theme';

/**
 * The five learning buddies.
 *
 * Each mentor's `color` is used as a card accent, avatar ring and eyebrow tint
 * all over the app, so it has to come from the palette in spec §3. The five
 * values here were Tailwind defaults (#10B981, #FBBF24, #EC4899, #8B5CF6,
 * #F97316) which read colder and more saturated than everything around them —
 * emerald beside PetalPath's soft #8FC27A green was the most obvious mismatch.
 * The mentor-to-hue mapping is unchanged (Penny green, Barnaby yellow, Cleo
 * pink, Finn purple, Toby orange); only the hex values move onto the tokens, so
 * every screen that reads `mentor.color` becomes palette-correct at once
 * instead of each one patching it locally.
 */
export interface Mentor {
  id?: string;
  name: string;
  characterType: string;
  personality: string;
  voiceStyle: string;
  description: string;
  imagePath: string;
  color: string;
  species: string;
  funFact: string;
  iconName?: string;
}

export const MENTORS: Mentor[] = [
  {
    name: 'Penny Panda',
    characterType: 'panda',
    personality: 'gentle and caring',
    voiceStyle: 'soft and cheerful',
    description: 'Kind and patient, always cheering you on.',
    imagePath: 'storage/icons/penny_panda.png',
    color: colors.leafGreen,
    species: 'Panda',
    funFact: 'Pandas spend 12 hours a day eating bamboo!',
  },
  {
    name: 'Barnaby Bunny',
    characterType: 'rabbit',
    personality: 'playful and energetic',
    voiceStyle: 'excited',
    description: "Let's hop into a new adventure!",
    imagePath: 'storage/icons/barnaby_bunny.png',
    color: colors.yellow,
    species: 'Rabbit',
    funFact: 'Bunnies can hop up to 3 feet high!',
  },
  {
    name: 'Cleo Cat',
    characterType: 'cat',
    personality: 'smart and curious',
    voiceStyle: 'friendly',
    description: 'Curious minds discover amazing things.',
    imagePath: 'storage/icons/cleo_cat.png',
    color: colors.primary,
    species: 'Cat',
    funFact: 'Cats can jump up to six times their height!',
  },
  {
    name: 'Finn Fox',
    characterType: 'fox',
    personality: 'adventurous',
    voiceStyle: 'energetic',
    description: "Ready for today's adventure?",
    imagePath: 'storage/icons/finn_fox.png',
    color: colors.purple,
    species: 'Fox',
    funFact: 'Foxes can hear a watch ticking 40 yards away!',
  },
  {
    name: 'Toby Tiger',
    characterType: 'tiger',
    personality: 'bold and confident',
    voiceStyle: 'enthusiastic',
    description: "Let's roar with confidence and learn together!",
    imagePath: 'storage/icons/toby_tiger.png',
    color: colors.orange,
    species: 'Tiger',
    funFact: "Toby's stripes are unique, just like fingerprints!",
  },
];

export const getMentorColor = (characterType: string): string => {
  const mentor = MENTORS.find((m) => m.characterType === characterType);
  return mentor ? mentor.color : colors.textSecondary;
};

export const getMentorIcon = (characterType: string): string => {
  switch (characterType) {
    case 'panda': return 'heart-outline';
    case 'rabbit': return 'rocket-outline';
    case 'cat': return 'bulb-outline';
    case 'fox': return 'compass-outline';
    case 'tiger': return 'ribbon-outline';
    default: return 'paw-outline';
  }
};

export const getMentorSpecies = (characterType: string): string => {
  switch (characterType) {
    case 'panda': return 'Panda';
    case 'rabbit': return 'Rabbit';
    case 'cat': return 'Cat';
    case 'fox': return 'Fox';
    case 'tiger': return 'Tiger';
    default: return 'Companion';
  }
};

export const getMentorFunFact = (characterType: string): string => {
  switch (characterType) {
    case 'panda': return 'Pandas spend 12 hours a day eating bamboo!';
    case 'rabbit': return 'Bunnies can hop up to 3 feet high!';
    case 'cat': return 'Cats can jump up to six times their height!';
    case 'fox': return 'Foxes can hear a watch ticking 40 yards away!';
    case 'tiger': return "Toby's stripes are unique, just like fingerprints!";
    default: return 'Ready to learn and play!';
  }
};

export const enhanceMentor = (mentor: any): Mentor | null => {
  if (!mentor) return null;
  return {
    ...mentor,
    color: getMentorColor(mentor.characterType),
    iconName: getMentorIcon(mentor.characterType),
    species: getMentorSpecies(mentor.characterType),
    funFact: getMentorFunFact(mentor.characterType),
  };
};

