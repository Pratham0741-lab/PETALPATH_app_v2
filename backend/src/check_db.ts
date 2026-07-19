import { prisma } from './config/database.js';

async function main() {
  console.log('--- DIAGNOSTIC SCRIPT ---');
  const children = await prisma.child.findMany();
  console.log(`Found ${children.length} children in DB:`);
  for (const c of children) {
    console.log(`  - Child ID: ${c.id}, Name: ${c.name}, AgeGroup: ${c.ageGroup}`);
  }

  const lessonsCount = await prisma.lesson.count();
  console.log(`Total lessons in DB: ${lessonsCount}`);

  const lessonProgress = await prisma.lessonProgress.count();
  console.log(`Total lesson progress entries: ${lessonProgress}`);

  const categories = await prisma.category.findMany({
    include: {
      modules: {
        include: {
          lessons: true
        }
      }
    }
  });
  console.log(`Found ${categories.length} categories:`);
  for (const cat of categories) {
    console.log(`  - Category ID: ${cat.id}, Title: ${cat.title}`);
    for (const mod of cat.modules) {
      console.log(`    - Module ID: ${mod.id}, Title: ${mod.title}, Lessons: ${mod.lessons.length}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
