import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { curriculumLoader } from '../src/modules/curriculum/curriculum-loader.js';
import { resolveVideoKey } from '../src/shared/utils/video-resolver.js';
import { resolveAudioKey } from '../src/shared/utils/audio-resolver.js';

const prisma = new PrismaClient();

/**
 * Dynamically discover curricula folders in the curriculum directory.
 * E.g., curriculum/cbse, curriculum/icse, etc.
 */
function getCurriculumDirs(): string[] {
  const primaryPath = path.join(process.cwd(), 'curriculum');
  const secondaryPath = path.join(process.cwd(), '..', 'curriculum');

  const rootPath = fs.existsSync(primaryPath) ? primaryPath : secondaryPath;
  if (!fs.existsSync(rootPath)) {
    return [];
  }

  return fs.readdirSync(rootPath)
    .map((name) => path.join(rootPath, name))
    .filter((p) => fs.statSync(p).isDirectory());
}

function getActivityTitle(lessonTitle: string, type: string): string {
  const typeMap: Record<string, string> = {
    video: 'Video Lesson',
    listen: 'Listening Guide',
    speak: 'Speaking Practice',
    read: 'Reading Practice',
    write: 'Writing Practice',
    revision: 'Revision & Review',
    phonics: 'Phonics Activity',
    blend: 'Word Blending',
    spell: 'Spelling Challenge',
    identify: 'Identify Activity',
    select: 'Selection Game',
    match: 'Matching Game',
    count: 'Counting Exercise',
    sort: 'Sorting Game',
    puzzle: 'Puzzle Challenge',
    sequence: 'Ordering Sequence',
    trace: 'Tracing Activity',
    draw: 'Drawing Canvas',
    drag_drop: 'Drag and Drop',
    memory: 'Memory Game',
    story: 'Story Time',
    conversation: 'Conversation Practice',
    addition: 'Addition Practice',
    subtraction: 'Subtraction Practice',
    compare: 'Comparison Game',
    pattern: 'Pattern Play',
    measure: 'Measurement Fun',
    missing_number: 'Find the Missing Number',
    classify: 'Classification Game',
    connect: 'Connect the Dots',
    circle: 'Circle the Answer',
    assessment: 'Lesson Assessment',
  };

  const suffix = typeMap[type] || `${type.charAt(0).toUpperCase()}${type.slice(1)} Practice`;
  return `${lessonTitle}: ${suffix}`;
}

async function main() {
  console.log('Seeding database from Curriculum loader...');

  // 1. Run Curriculum Loader validation - fail fast if validation fails
  console.log('Validating static curriculum files...');
  try {
    curriculumLoader.loadAllCurricula();
  } catch (err: any) {
    console.error('Curriculum validation failed. Aborting database seeding.');
    if (err.formatDiagnostics) {
      console.error(err.formatDiagnostics());
    } else {
      console.error(err);
    }
    process.exit(1);
  }
  console.log('Static curriculum files validated successfully.');

  // 2. Clean existing database records in correct dependency order
  console.log('Cleaning existing records...');
  await prisma.childSkillCurriculum.deleteMany({});
  await prisma.reinforcementQueue.deleteMany({});
  await prisma.regressionLog.deleteMany({});
  await prisma.skillHistory.deleteMany({});
  await prisma.skillHealth.deleteMany({});
  await prisma.skillDependency.deleteMany({});
  await prisma.skill.deleteMany({});
  await prisma.subject.deleteMany({});

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

  // 3. Seed Mentors
  console.log('Seeding mentors...');
  const mentorsData = [
    {
      name: 'Penny Panda',
      characterType: 'panda',
      personality: 'gentle and caring',
      voiceStyle: 'soft and cheerful',
      description: 'Kind and patient, always cheering you on.',
      iconKey: 'icons/mentors/penny_panda.png',
    },
    {
      name: 'Barnaby Bunny',
      characterType: 'rabbit',
      personality: 'playful and energetic',
      voiceStyle: 'excited',
      description: "Let's hop into a new adventure!",
      iconKey: 'icons/mentors/barnaby_bunny.png',
    },
    {
      name: 'Cleo Cat',
      characterType: 'cat',
      personality: 'smart and curious',
      voiceStyle: 'friendly',
      description: 'Curious minds discover amazing things.',
      iconKey: 'icons/mentors/cleo_cat.png',
    },
    {
      name: 'Finn Fox',
      characterType: 'fox',
      personality: 'adventurous',
      voiceStyle: 'energetic',
      description: "Ready for today's adventure?",
      iconKey: 'icons/mentors/finn_fox.png',
    },
    {
      name: 'Toby Tiger',
      characterType: 'tiger',
      personality: 'bold and confident',
      voiceStyle: 'enthusiastic',
      description: "Let's roar with confidence and learn together!",
      iconKey: 'icons/mentors/toby_tiger.png',
    },
  ];

  for (const m of mentorsData) {
    await prisma.mentor.create({ data: m });
  }

  // 4. Create default test user & child
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

  const prathamHash = await bcrypt.hash('pratham1', salt);
  const prathamUser = await prisma.user.create({
    data: {
      email: 'prathammohadikar@gmail.com',
      name: 'Pratham',
      passwordHash: prathamHash,
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

  const prathamChild = await prisma.child.create({
    data: {
      userId: prathamUser.id,
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

  await prisma.stars.create({
    data: {
      childId: prathamChild.id,
      totalStars: 0,
    },
  });

  // 5. Seed Dynamic Subjects
  console.log('Seeding subjects from configuration...');
  const subjectsData = [
    { name: 'English', description: 'English language learning, alphabet and stories', icon: 'book', color: '#3357FF' },
    { name: 'Fine Motor & Cognitive Skills', description: 'Cognitive reasoning and writing coordination', icon: 'brain', color: '#F33FF5' },
    { name: 'Social-Emotional Learning & Life Skills', description: 'Social cooperation and self-expression', icon: 'heart', color: '#FF5733' },
    { name: 'Hindi', description: 'Hindi language learning, alphabets and rhymes', icon: 'bookmark', color: '#FFC300' },
    { name: 'Environmental Studies / General Awareness', description: 'Nature, safety, and surroundings exploration', icon: 'globe', color: '#33FF57' },
    { name: 'Maths', description: 'Numbers, shapes, counting and logical math', icon: 'calculator', color: '#900C3F' },
  ];

  const subjectMap = new Map<string, string>();
  for (const s of subjectsData) {
    const created = await prisma.subject.create({ data: s });
    subjectMap.set(s.name, created.id);
  }

  // 6. Dynamically load and seed Categories, Modules, Lessons, and Activities
  console.log('Seeding curricula...');
  const allCurricula = curriculumLoader.loadAllCurricula();

  const seededSkillNames = new Set<string>();

  for (const [gradeKey, cur] of allCurricula.entries()) {
    console.log(`Processing Grade: ${cur.grade.name}`);

    // Create Category representing the Grade
    const category = await prisma.category.create({
      data: {
        title: cur.grade.name,
        description: cur.grade.description,
        displayOrder: gradeKey === 'prenursery' ? 1 : gradeKey === 'nursery' ? 2 : gradeKey === 'lkg' ? 3 : 4,
      },
    });

    for (const theme of cur.themes) {
      // Create Module representing the Theme
      const module = await prisma.module.create({
        data: {
          categoryId: category.id,
          title: theme.title,
          description: `Theme: ${theme.title}`,
          displayOrder: theme.order,
        },
      });

      for (const node of theme.nodes) {
        // Create Lesson representing the Node using node.id as stable natural key
        const difficultyString = node.difficulty <= 2 ? 'EASY' : node.difficulty <= 4 ? 'MEDIUM' : 'HARD';
        const lesson = await prisma.lesson.create({
          data: {
            id: node.id,
            moduleId: module.id,
            title: node.title,
            description: node.curriculum.learning_outcome,
            displayOrder: node.order,
            difficulty: difficultyString,
          },
        });

        // Seed activities & guides for the lesson
        const validActivities = node.activities.filter(act => act.type !== 'identify');
        for (let i = 0; i < validActivities.length; i++) {
          const act = validActivities[i];
          const activity = await prisma.activity.create({
            data: {
              lessonId: lesson.id,
              title: getActivityTitle(node.title, act.type),
              activityType: act.type,
              displayOrder: i + 1,
            },
          });

          if (act.type === 'video') {
            const videoKey = resolveVideoKey(node);
            await prisma.video.create({
              data: {
                activityId: activity.id,
                title: `${node.title} Video Lesson`,
                videoKey,
                thumbnailKey: 'thumbnails/default.png',
                duration: act.estimated_minutes * 60,
              },
            });
          } else if (act.type === 'listen') {
            await prisma.audio.create({
              data: {
                activityId: activity.id,
                title: `${node.title} Listening Guide`,
                audioKey: resolveAudioKey(node),
                duration: act.estimated_minutes * 60,
              },
            });
          }
        }

        // Create database Skill mapping for the node (resolving name duplicate conflicts)
        let skillName = node.title;
        if (seededSkillNames.has(skillName)) {
          skillName = `${node.title} (${cur.grade.name})`;
          let idx = 1;
          while (seededSkillNames.has(skillName)) {
            skillName = `${node.title} (${cur.grade.name}) ${idx++}`;
          }
        }
        seededSkillNames.add(skillName);

        const subjectId = subjectMap.get(node.curriculum.subject);
        if (subjectId) {
          await prisma.skill.create({
            data: {
              id: node.id,
              name: skillName,
              description: node.curriculum.learning_outcome,
              difficulty: node.difficulty,
              estimatedAge: gradeKey === 'prenursery' ? 3 : gradeKey === 'nursery' ? 4 : gradeKey === 'lkg' ? 5 : 6,
              isRootSkill: node.prerequisites.length === 0,
              subjectId: subjectId,
              skillCode: node.id,
            },
          });
        }
      }
    }
  }

  // 7. Seed Skill Dependencies from Loader
  console.log('Seeding skill dependencies...');
  for (const cur of allCurricula.values()) {
    for (const theme of cur.themes) {
      for (const node of theme.nodes) {
        for (const prereqId of node.prerequisites) {
          const parentExists = await prisma.skill.findUnique({ where: { id: prereqId } });
          const childExists = await prisma.skill.findUnique({ where: { id: node.id } });
          if (parentExists && childExists) {
            await prisma.skillDependency.create({
              data: {
                parentSkillId: prereqId,
                childSkillId: node.id,
                weight: 1.0,
              },
            });
          }
        }
      }
    }
  }

  // 8. Seed Stickers
  console.log('Seeding stickers...');
  const stickersData = [
    { name: 'Sun', description: 'Glows bright in the sky!', iconKey: 'stickers/sun.png', requiredStars: 20 },
    { name: 'Rainbow', description: 'Colorful path of colors!', iconKey: 'stickers/rainbow.png', requiredStars: 50 },
    { name: 'Rocket', description: 'Zoom through space!', iconKey: 'stickers/rocket.png', requiredStars: 100 },
    { name: 'Planet', description: 'Explore a new world!', iconKey: 'stickers/planet.png', requiredStars: 200 },
    { name: 'Trophy', description: 'For excellent learners!', iconKey: 'stickers/trophy.png', requiredStars: 300 },
    { name: 'Tree', description: 'Growing bigger every day!', iconKey: 'stickers/tree.png', requiredStars: 500 },
    { name: 'Ice Cream', description: 'A sweet cold treat!', iconKey: 'stickers/ice_cream.png', requiredStars: 1000 },
  ];

  for (const s of stickersData) {
    await prisma.sticker.create({ data: s });
  }

  // 9. Seed Badges
  console.log('Seeding badges...');
  const badgesData = [
    { name: 'First Lesson', description: 'First lesson completed', iconKey: 'badges/first_lesson.png' },
    { name: 'Perfect Lesson', description: '8/8 stars', iconKey: 'badges/perfect_lesson.png' },
    { name: 'Golden Speaker', description: 'Average speech score >=80', iconKey: 'badges/golden_speaker.png' },
    { name: 'Writing Wizard', description: 'Average writing score >=80', iconKey: 'badges/writing_wizard.png' },
    { name: 'Shape Master', description: 'Shapes category completed', iconKey: 'badges/shape_master.png' },
    { name: 'Alphabet Explorer', description: 'Alphabet category completed', iconKey: 'badges/alphabet_explorer.png' },
    { name: 'Number Hero', description: 'Numbers category completed', iconKey: 'badges/number_hero.png' },
    { name: 'Reading Champion', description: 'Reading Readiness completed', iconKey: 'badges/reading_champion.png' },
  ];

  for (const b of badgesData) {
    await prisma.badge.create({ data: b });
  }

  // 10. Seed Stories
  console.log('Seeding stories...');
  const stories = [
    { title: 'The Brave Little Seed', description: 'A story about a seed that learns to grow', category: 'FICTION', difficulty: 'EASY', readingLevel: 1, estimatedDuration: 3 },
    { title: 'Colors of the Rainbow', description: 'Learn about colors through a fun adventure', category: 'EDUCATIONAL', difficulty: 'EASY', readingLevel: 1, estimatedDuration: 4 },
    { title: 'Numbers Around Us', description: 'Discover numbers in everyday life', category: 'EDUCATIONAL', difficulty: 'EASY', readingLevel: 1, estimatedDuration: 4 },
    { title: 'The Kindness Monster', description: 'A friendly monster teaches kindness', category: 'FICTION', difficulty: 'MEDIUM', readingLevel: 2, estimatedDuration: 5 },
    { title: 'Alphabet Adventure', description: 'Explore the alphabet from A to Z', category: 'EDUCATIONAL', difficulty: 'EASY', readingLevel: 1, estimatedDuration: 5 },
    { title: 'The Moonlight Garden', description: 'Magical garden adventures under the moonlight', category: 'FICTION', difficulty: 'MEDIUM', readingLevel: 2, estimatedDuration: 6 },
    { title: 'Weather Wonders', description: 'Learn about sunny, rainy, and snowy days', category: 'EDUCATIONAL', difficulty: 'MEDIUM', readingLevel: 2, estimatedDuration: 5 },
    { title: 'The Flying Turtle', description: 'A turtle who dreams of flying', category: 'FICTION', difficulty: 'HARD', readingLevel: 3, preferredModality: 'STORY', readingTime: 7 },
  ];

  for (const storyData of stories) {
    const story = await prisma.story.create({ data: {
      title: storyData.title,
      description: storyData.description,
      category: storyData.category,
      difficulty: storyData.difficulty,
      readingLevel: storyData.readingLevel,
      estimatedDuration: storyData.readingTime || 5
    } });

    const pages = [];
    for (let i = 0; i < 3; i++) {
      pages.push({
        storyId: story.id,
        pageNumber: i,
        content: `Page ${i + 1} of ${storyData.title}. This is a story about ${storyData.description.toLowerCase()}.`,
      });
    }
    await prisma.storyPage.createMany({ data: pages });
  }

  console.log('Stories seeded successfully.');
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
