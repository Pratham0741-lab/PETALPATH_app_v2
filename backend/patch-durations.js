import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Patching video durations in database...');

  const videos = await prisma.video.findMany();
  for (const video of videos) {
    let newDuration = video.duration;
    if (video.filename.includes('prewriting_001_standing_line.mp4')) {
      newDuration = 10;
    } else if (video.filename.includes('prewriting_002_sleeping_line.mp4')) {
      newDuration = 8;
    } else if (video.filename.includes('prewriting_005_big_curve.mp4')) {
      newDuration = 7;
    } else if (video.filename.includes('shape_001_circle.mp4')) {
      newDuration = 10;
    } else if (video.filename.includes('alphabet_001_a_apple.mp4')) {
      newDuration = 6;
    }

    if (newDuration !== video.duration) {
      await prisma.video.update({
        where: { id: video.id },
        data: { duration: newDuration },
      });
      console.log(`Updated video: ${video.title} (${video.filename}) -> ${newDuration}s`);
    }
  }

  console.log('Database patch complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
