import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing progress and curriculum data in correct dependency order
  await prisma.childSticker.deleteMany({});
  await prisma.sticker.deleteMany({});
  await prisma.childBadge.deleteMany({});
  await prisma.badge.deleteMany({});
  await prisma.stars.deleteMany({});
  await prisma.moduleProgress.deleteMany({});
  await prisma.categoryProgress.deleteMany({});

  await prisma.audio.deleteMany({});
  await prisma.listenProgress.deleteMany({});
  await prisma.speakProgress.deleteMany({});
  await prisma.writeProgress.deleteMany({});
  await prisma.videoProgress.deleteMany({});
  await prisma.video.deleteMany({});
  await prisma.activity.deleteMany({});
  await prisma.lessonProgress.deleteMany({});
  await prisma.lesson.deleteMany({});
  await prisma.module.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.child.deleteMany({});
  await prisma.mentor.deleteMany({});
  await prisma.user.deleteMany({});

  // Seed Mentors
  console.log('Seeding mentors...');
  const mentorsData = [
    {
      name: 'Penny Panda',
      characterType: 'panda',
      personality: 'gentle and caring',
      voiceStyle: 'soft and cheerful',
      description: 'Kind and patient, always cheering you on.',
      imagePath: 'storage/icons/penny_panda.png',
    },
    {
      name: 'Barnaby Bunny',
      characterType: 'rabbit',
      personality: 'playful and energetic',
      voiceStyle: 'excited',
      description: "Let's hop into a new adventure!",
      imagePath: 'storage/icons/barnaby_bunny.png',
    },
    {
      name: 'Cleo Cat',
      characterType: 'cat',
      personality: 'smart and curious',
      voiceStyle: 'friendly',
      description: 'Curious minds discover amazing things.',
      imagePath: 'storage/icons/cleo_cat.png',
    },
    {
      name: 'Finn Fox',
      characterType: 'fox',
      personality: 'adventurous',
      voiceStyle: 'energetic',
      description: "Ready for today's adventure?",
      imagePath: 'storage/icons/finn_fox.png',
    },
    {
      name: 'Toby Tiger',
      characterType: 'tiger',
      personality: 'bold and confident',
      voiceStyle: 'enthusiastic',
      description: "Let's roar with confidence and learn together!",
      imagePath: 'storage/icons/toby_tiger.png',
    },
  ];

  for (const m of mentorsData) {
    await prisma.mentor.create({
      data: m,
    });
  }

  // Create default test user & child so developer does not need to register again
  console.log('Seeding default user and child...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Parent User',
      passwordHash,
      role: 'PARENT',
    },
  });

  const pandaMentor = await prisma.mentor.findFirst({ where: { characterType: 'panda' } });

  const child = await prisma.child.create({
    data: {
      userId: user.id,
      name: 'Aarav',
      age: 5,
      ageGroup: 'PRE_K',
      avatar: 'panda',
      mentorId: pandaMentor?.id || null,
    },
  });

  await prisma.stars.create({
    data: {
      childId: child.id,
      totalStars: 0,
    },
  });

  // Seed Curriculum Tree
  console.log('Seeding curriculum tree...');

  const curriculum = [
    {
      title: 'Prewriting Skills',
      description: 'Lines, curves and patterns',
      displayOrder: 1,
      modules: [
        {
          title: 'Lines',
          description: 'Practice drawing straight lines',
          displayOrder: 1,
          lessons: [
            { title: 'Standing Line', description: 'Learn to trace vertical standing lines', difficulty: 'EASY', video: 'lines_and_curves/prewriting_001_standing_line.mp4', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Sleeping Line', description: 'Learn to trace horizontal sleeping lines', difficulty: 'EASY', video: 'lines_and_curves/prewriting_002_sleeping_line.mp4', audio: 'speech_guide_sleepingline_en.mp3' },
            { title: 'Left Slanting Line', description: 'Learn to trace left slanting lines', difficulty: 'EASY', video: 'lines_and_curves/prewriting_003_left_slanting_line.mp4', audio: 'speech_guide_leftslantingline_en.mp3' },
            { title: 'Right Slanting Line', description: 'Learn to trace right slanting lines', difficulty: 'EASY', video: 'lines_and_curves/prewriting_004_right_slanting_line.mp4', audio: 'speech_guide_rightslantingline_en.mp3' }
          ]
        },
        {
          title: 'Curves',
          description: 'Learn to trace smooth curves',
          displayOrder: 2,
          lessons: [
            { title: 'Big Curve', description: 'Learn to trace big curves', difficulty: 'EASY', video: 'lines_and_curves/prewriting_005_big_curve.mp4', audio: 'speech_guide_bigcurve_en.mp3' },
            { title: 'Small Curve', description: 'Learn to trace small curves', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_smallcurve_en.mp3' },
            { title: 'Semi Circle', description: 'Learn to trace semi circles', difficulty: 'EASY', video: 'lines_and_curves/prewriting_007_semi_circle.mp4', audio: 'speech_guide_semicircle_en.mp3' },
            { title: 'Reverse Semi Circle', description: 'Learn to trace reverse semi circles', difficulty: 'EASY', video: 'lines_and_curves/prewriting_008_reverse_semi_circle.mp4', audio: 'speech_guide_reverse_semicircle_en.mp3' }
          ]
        },
        {
          title: 'Patterns',
          description: 'Trace winding patterns',
          displayOrder: 3,
          lessons: [
            { title: 'Zig-zag', description: 'Trace zigzag path patterns', difficulty: 'EASY', video: 'coming_soon', audio: 'coming_soon' },
            { title: 'Spiral', description: 'Trace spiral path patterns', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_spiral_en.mp3' },
            { title: 'Loop', description: 'Trace loops path patterns', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_loop_en.mp3' },
            { title: 'Combined Curves', description: 'Trace combined curves and waves', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_combinedcurves_en.mp3' }
          ]
        }
      ]
    },
    {
      title: 'Shapes',
      description: 'Learn shapes all around',
      displayOrder: 2,
      modules: [
        {
          title: 'Module 1',
          description: 'Circle, Square, and Triangle',
          displayOrder: 1,
          lessons: [
            { title: 'Circle', description: 'Learn to trace a circle', difficulty: 'EASY', video: 'shapes/shape_001_circle.mp4', audio: 'speech_guide_circle_en.mp3' },
            { title: 'Square', description: 'Learn to trace a square', difficulty: 'EASY', video: 'shapes/shape_002_square.mp4', audio: 'speech_guide_square_en.mp3' },
            { title: 'Triangle', description: 'Learn to trace a triangle', difficulty: 'EASY', video: 'shapes/shape_003_triangle.mp4', audio: 'speech_guide_triangle_en.mp3' }
          ]
        },
        {
          title: 'Module 2',
          description: 'Rectangle, Oval, and Star',
          displayOrder: 2,
          lessons: [
            { title: 'Rectangle', description: 'Learn to trace a rectangle', difficulty: 'EASY', video: 'shapes/shape_004_rectangle.mp4', audio: 'speech_guide_rectangle_en.mp3' },
            { title: 'Oval', description: 'Learn to trace an oval', difficulty: 'EASY', video: 'shapes/shape_005_oval.mp4', audio: 'speech_guide_oval_en.mp3' },
            { title: 'Star', description: 'Learn to trace a star', difficulty: 'EASY', video: 'shapes/shape_006_star.mp4', audio: 'speech_guide_star_en.mp3' }
          ]
        },
        {
          title: 'Module 3',
          description: 'Heart, Diamond, and Pentagon',
          displayOrder: 3,
          lessons: [
            { title: 'Heart', description: 'Learn to trace a heart', difficulty: 'MEDIUM', video: 'coming_soon', audio: 'speech_guide_circle_en.mp3' },
            { title: 'Diamond', description: 'Learn to trace a diamond', difficulty: 'MEDIUM', video: 'coming_soon', audio: 'speech_guide_circle_en.mp3' },
            { title: 'Pentagon', description: 'Learn to trace a pentagon', difficulty: 'MEDIUM', video: 'coming_soon', audio: 'speech_guide_circle_en.mp3' }
          ]
        },
        {
          title: 'Module 4',
          description: 'Hexagon',
          displayOrder: 4,
          lessons: [
            { title: 'Hexagon', description: 'Learn to trace a hexagon', difficulty: 'HARD', video: 'coming_soon', audio: 'speech_guide_circle_en.mp3' }
          ]
        }
      ]
    },
    {
      title: 'Alphabet',
      description: 'A to Z fun learning',
      displayOrder: 3,
      modules: [
        {
          title: 'Module A-C',
          description: 'Letters A, B, C',
          displayOrder: 1,
          lessons: [
            { title: 'Letter A', description: 'Learn letter A', difficulty: 'EASY', video: 'alphabet/alphabet_001_a_apple.mp4', audio: 'speech_guide_a_en.mp3' },
            { title: 'Letter B', description: 'Learn letter B', difficulty: 'EASY', video: 'alphabet/alphabet_002_b_ball.mp4', audio: 'speech_guide_b_en.mp3' },
            { title: 'Letter C', description: 'Learn letter C', difficulty: 'EASY', video: 'alphabet/alphabet_003_c_cat.mp4', audio: 'speech_guide_c_en.mp3' }
          ]
        },
        {
          title: 'Module D-F',
          description: 'Letters D, E, F',
          displayOrder: 2,
          lessons: [
            { title: 'Letter D', description: 'Learn letter D', difficulty: 'EASY', video: 'alphabet/alphabet_004_d_dog.mp4', audio: 'speech_guide_d_en.mp3' },
            { title: 'Letter E', description: 'Learn letter E', difficulty: 'EASY', video: 'alphabet/alphabet_005_e_egg.mp4', audio: 'speech_guide_e_en.mp3' },
            { title: 'Letter F', description: 'Learn letter F', difficulty: 'EASY', video: 'alphabet/alphabet_006_f_fish.mp4', audio: 'speech_guide_f_en.mp3' }
          ]
        },
        {
          title: 'Module G-I',
          description: 'Letters G, H, I',
          displayOrder: 3,
          lessons: [
            { title: 'Letter G', description: 'Learn letter G', difficulty: 'EASY', video: 'alphabet/alphabet_007_g_grapes.mp4', audio: 'speech_guide_a_en.mp3' },
            { title: 'Letter H', description: 'Learn letter H', difficulty: 'EASY', video: 'alphabet/alphabet_008_h_house.mp4', audio: 'speech_guide_a_en.mp3' },
            { title: 'Letter I', description: 'Learn letter I', difficulty: 'EASY', video: 'alphabet/alphabet_009_i_icecream.mp4', audio: 'speech_guide_a_en.mp3' }
          ]
        },
        {
          title: 'Module J-L',
          description: 'Letters J, K, L',
          displayOrder: 4,
          lessons: [
            { title: 'Letter J', description: 'Learn letter J', difficulty: 'EASY', video: 'alphabet/alphabet_010_j_jar.mp4', audio: 'speech_guide_a_en.mp3' },
            { title: 'Letter K', description: 'Learn letter K', difficulty: 'EASY', video: 'alphabet/alphabet_011_k_kite.mp4', audio: 'speech_guide_a_en.mp3' },
            { title: 'Letter L', description: 'Learn letter L', difficulty: 'EASY', video: 'alphabet/alphabet_012_l_lion.mp4', audio: 'speech_guide_a_en.mp3' }
          ]
        },
        {
          title: 'Module M-O',
          description: 'Letters M, N, O',
          displayOrder: 5,
          lessons: [
            { title: 'Letter M', description: 'Learn letter M', difficulty: 'EASY', video: 'alphabet/alphabet_013_m_mango.mp4', audio: 'speech_guide_a_en.mp3' },
            { title: 'Letter N', description: 'Learn letter N', difficulty: 'EASY', video: 'alphabet/alphabet_014_n_nest.mp4', audio: 'speech_guide_a_en.mp3' },
            { title: 'Letter O', description: 'Learn letter O', difficulty: 'EASY', video: 'alphabet/alphabet_015_o_owl.mp4', audio: 'speech_guide_a_en.mp3' }
          ]
        },
        {
          title: 'Module P-R',
          description: 'Letters P, Q, R',
          displayOrder: 6,
          lessons: [
            { title: 'Letter P', description: 'Learn letter P', difficulty: 'EASY', video: 'alphabet/alphabet_016_p_parrot.mp4', audio: 'speech_guide_a_en.mp3' },
            { title: 'Letter Q', description: 'Learn letter Q', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_a_en.mp3' },
            { title: 'Letter R', description: 'Learn letter R', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_a_en.mp3' }
          ]
        },
        {
          title: 'Module S-U',
          description: 'Letters S, T, U',
          displayOrder: 7,
          lessons: [
            { title: 'Letter S', description: 'Learn letter S', difficulty: 'EASY', video: 'alphabet/alphabet_019_s_sun.mp4', audio: 'speech_guide_a_en.mp3' },
            { title: 'Letter T', description: 'Learn letter T', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_a_en.mp3' },
            { title: 'Letter U', description: 'Learn letter U', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_a_en.mp3' }
          ]
        },
        {
          title: 'Module V-X',
          description: 'Letters V, W, X',
          displayOrder: 8,
          lessons: [
            { title: 'Letter V', description: 'Learn letter V', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_a_en.mp3' },
            { title: 'Letter W', description: 'Learn letter W', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_a_en.mp3' },
            { title: 'Letter X', description: 'Learn letter X', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_a_en.mp3' }
          ]
        },
        {
          title: 'Module Y-Z',
          description: 'Letters Y, Z',
          displayOrder: 9,
          lessons: [
            { title: 'Letter Y', description: 'Learn letter Y', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_a_en.mp3' },
            { title: 'Letter Z', description: 'Learn letter Z', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_a_en.mp3' }
          ]
        }
      ]
    },
    {
      title: 'Numbers',
      description: 'Count, write and understand',
      displayOrder: 4,
      modules: [
        {
          title: 'Module 1',
          description: 'Numbers 1, 2, 3',
          displayOrder: 1,
          lessons: [
            { title: 'Number 1', description: 'Learn number 1', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Number 2', description: 'Learn number 2', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Number 3', description: 'Learn number 3', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' }
          ]
        },
        {
          title: 'Module 2',
          description: 'Numbers 4, 5, 6',
          displayOrder: 2,
          lessons: [
            { title: 'Number 4', description: 'Learn number 4', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Number 5', description: 'Learn number 5', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Number 6', description: 'Learn number 6', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' }
          ]
        },
        {
          title: 'Module 3',
          description: 'Numbers 7, 8, 9',
          displayOrder: 3,
          lessons: [
            { title: 'Number 7', description: 'Learn number 7', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Number 8', description: 'Learn number 8', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Number 9', description: 'Learn number 9', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' }
          ]
        },
        {
          title: 'Module 4',
          description: 'Numbers 10, 11, 12',
          displayOrder: 4,
          lessons: [
            { title: 'Number 10', description: 'Learn number 10', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Number 11', description: 'Learn number 11', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Number 12', description: 'Learn number 12', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' }
          ]
        },
        {
          title: 'Module 5',
          description: 'Numbers 13, 14, 15',
          displayOrder: 5,
          lessons: [
            { title: 'Number 13', description: 'Learn number 13', difficulty: 'MEDIUM', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Number 14', description: 'Learn number 14', difficulty: 'MEDIUM', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Number 15', description: 'Learn number 15', difficulty: 'MEDIUM', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' }
          ]
        },
        {
          title: 'Module 6',
          description: 'Numbers 16, 17, 18',
          displayOrder: 6,
          lessons: [
            { title: 'Number 16', description: 'Learn number 16', difficulty: 'MEDIUM', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Number 17', description: 'Learn number 17', difficulty: 'MEDIUM', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Number 18', description: 'Learn number 18', difficulty: 'MEDIUM', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' }
          ]
        },
        {
          title: 'Module 7',
          description: 'Numbers 19, 20',
          displayOrder: 7,
          lessons: [
            { title: 'Number 19', description: 'Learn number 19', difficulty: 'MEDIUM', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Number 20', description: 'Learn number 20', difficulty: 'MEDIUM', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' }
          ]
        },
        {
          title: 'Module 8',
          description: 'Counting and patterns',
          displayOrder: 8,
          lessons: [
            { title: 'Count Objects', description: 'Learn to count objects', difficulty: 'MEDIUM', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'More and Less', description: 'Learn more and less concepts', difficulty: 'MEDIUM', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Number Patterns', description: 'Find number patterns', difficulty: 'HARD', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' }
          ]
        }
      ]
    },
    {
      title: 'Words',
      description: 'Short words and sight words',
      displayOrder: 5,
      modules: [
        {
          title: 'Module 1',
          description: 'Sight words At, In, On',
          displayOrder: 1,
          lessons: [
            { title: 'At', description: 'Learn word At', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'In', description: 'Learn word In', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'On', description: 'Learn word On', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' }
          ]
        },
        {
          title: 'Module 2',
          description: 'Sight words Up, It',
          displayOrder: 2,
          lessons: [
            { title: 'Up', description: 'Learn word Up', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'It', description: 'Learn word It', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' }
          ]
        },
        {
          title: 'Module 3',
          description: 'Words Cat, Dog, Sun',
          displayOrder: 3,
          lessons: [
            { title: 'Cat', description: 'Learn word Cat', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Dog', description: 'Learn word Dog', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Sun', description: 'Learn word Sun', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' }
          ]
        },
        {
          title: 'Module 4',
          description: 'Words Bus, Cup',
          displayOrder: 4,
          lessons: [
            { title: 'Bus', description: 'Learn word Bus', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Cup', description: 'Learn word Cup', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' }
          ]
        },
        {
          title: 'Module 5',
          description: 'Words I, Am, The',
          displayOrder: 5,
          lessons: [
            { title: 'I', description: 'Learn word I', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Am', description: 'Learn word Am', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'The', description: 'Learn word The', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' }
          ]
        },
        {
          title: 'Module 6',
          description: 'Words Is, Can',
          displayOrder: 6,
          lessons: [
            { title: 'Is', description: 'Learn word Is', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' },
            { title: 'Can', description: 'Learn word Can', difficulty: 'EASY', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' }
          ]
        }
      ]
    },
    {
      title: 'Reading Readiness',
      description: 'Sentences, stories and more',
      displayOrder: 6,
      modules: [
        {
          title: 'Module 1',
          description: 'Simple Sentences',
          displayOrder: 1,
          lessons: [
            { title: 'Simple Sentences', description: 'Learn simple sentence reading', difficulty: 'MEDIUM', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' }
          ]
        },
        {
          title: 'Module 2',
          description: 'Story Sequences',
          displayOrder: 2,
          lessons: [
            { title: 'Story Sequences', description: 'Understand story timelines', difficulty: 'HARD', video: 'coming_soon', audio: 'speech_guide_standingline_en.mp3' }
          ]
        }
      ]
    }
  ];

  // Helper to add the Video, Listen, Speak, Write activities to a lesson
  const seedCurriculum = async (
    lessonId: string,
    titlePrefix: string,
    videoPath: string,
    audioFilename: string
  ) => {
    // 1. Video
    const aVideo = await prisma.activity.create({
      data: {
        lessonId,
        title: `Watch ${titlePrefix} Tutorial`,
        activityType: 'video',
        displayOrder: 1,
      },
    });
    await prisma.video.create({
      data: {
        activityId: aVideo.id,
        title: `${titlePrefix} Tutorial`,
        filename: videoPath,
        duration: 10,
        thumbnail: 'storage/thumbnails/default.png',
      },
    });

    // 2. Listen
    const aListen = await prisma.activity.create({
      data: {
        lessonId,
        title: `Listen to ${titlePrefix}`,
        activityType: 'listen',
        displayOrder: 2,
      },
    });
    await prisma.audio.create({
      data: {
        activityId: aListen.id,
        title: `${titlePrefix} Audio Guide`,
        filename: audioFilename,
        duration: 5,
      },
    });

    // 3. Speak
    await prisma.activity.create({
      data: {
        lessonId,
        title: `Say ${titlePrefix}`,
        activityType: 'speak',
        displayOrder: 3,
      },
    });

    // 4. Write
    await prisma.activity.create({
      data: {
        lessonId,
        title: `Trace ${titlePrefix}`,
        activityType: 'write',
        displayOrder: 4,
      },
    });
  };

  for (const catData of curriculum) {
    const createdCat = await prisma.category.create({
      data: {
        title: catData.title,
        description: catData.description,
        displayOrder: catData.displayOrder,
      },
    });

    console.log(`Created Category: ${createdCat.title}`);

    for (const modData of catData.modules) {
      const createdMod = await prisma.module.create({
        data: {
          categoryId: createdCat.id,
          title: modData.title,
          description: modData.description,
          displayOrder: modData.displayOrder,
        },
      });

      console.log(`  Created Module: ${createdMod.title}`);

      let displayOrder = 1;
      for (const lesData of modData.lessons) {
        const createdLes = await prisma.lesson.create({
          data: {
            moduleId: createdMod.id,
            title: lesData.title,
            description: lesData.description,
            displayOrder: displayOrder++,
            difficulty: lesData.difficulty,
          },
        });

        console.log(`    Created Lesson: ${createdLes.title}`);

        await seedCurriculum(
          createdLes.id,
          lesData.title,
          lesData.video,
          lesData.audio
        );
      }
    }
  }

  console.log('Seeding stickers...');
  const stickersData = [
    { name: 'Sun', description: 'Glows bright in the sky!', imagePath: 'storage/stickers/sun.png', requiredStars: 20 },
    { name: 'Rainbow', description: 'Colorful path of colors!', imagePath: 'storage/stickers/rainbow.png', requiredStars: 50 },
    { name: 'Rocket', description: 'Zoom through space!', imagePath: 'storage/stickers/rocket.png', requiredStars: 100 },
    { name: 'Planet', description: 'Explore a new world!', imagePath: 'storage/stickers/planet.png', requiredStars: 200 },
    { name: 'Trophy', description: 'For excellent learners!', imagePath: 'storage/stickers/trophy.png', requiredStars: 300 },
    { name: 'Tree', description: 'Growing bigger every day!', imagePath: 'storage/stickers/tree.png', requiredStars: 500 },
    { name: 'Ice Cream', description: 'A sweet cold treat!', imagePath: 'storage/stickers/ice_cream.png', requiredStars: 1000 },
  ];

  for (const s of stickersData) {
    await prisma.sticker.create({ data: s });
  }

  console.log('Seeding badges...');
  const badgesData = [
    { name: 'First Lesson', description: 'First lesson completed', imagePath: 'storage/badges/first_lesson.png' },
    { name: 'Perfect Lesson', description: '8/8 stars', imagePath: 'storage/badges/perfect_lesson.png' },
    { name: 'Golden Speaker', description: 'Average speech score >=80', imagePath: 'storage/badges/golden_speaker.png' },
    { name: 'Writing Wizard', description: 'Average writing score >=80', imagePath: 'storage/badges/writing_wizard.png' },
    { name: 'Shape Master', description: 'Shapes category completed', imagePath: 'storage/badges/shape_master.png' },
    { name: 'Alphabet Explorer', description: 'Alphabet category completed', imagePath: 'storage/badges/alphabet_explorer.png' },
    { name: 'Number Hero', description: 'Numbers category completed', imagePath: 'storage/badges/number_hero.png' },
    { name: 'Reading Champion', description: 'Reading Readiness completed', imagePath: 'storage/badges/reading_champion.png' },
  ];

  for (const b of badgesData) {
    await prisma.badge.create({ data: b });
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
