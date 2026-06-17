import { roadmapRepository } from './roadmap.repository.js';
import { storageService } from '../../shared/services/storage.service.js';

const formatRoadmapActivity = (activity: any) => {
  const formatted: any = { ...activity };
  if (formatted.video) {
    formatted.video = {
      ...formatted.video,
      videoUrl: storageService.getVideoUrl(formatted.video.videoKey),
      thumbnailUrl: storageService.getPublicUrl(formatted.video.thumbnailKey),
      filename: formatted.video.videoKey,
    };
  }
  if (formatted.audio) {
    formatted.audio = {
      ...formatted.audio,
      audioUrl: storageService.getAudioUrl(formatted.audio.audioKey),
      filename: formatted.audio.audioKey,
    };
  }
  return formatted;
};

export class RoadmapService {
  async getRoadmap(childId: string) {
    const categories = await roadmapRepository.getCurriculumTree();
    const progressList = await roadmapRepository.getChildProgress(childId);

    const progressMap = new Map();
    progressList.forEach((p) => {
      progressMap.set(p.lessonId, p);
    });

    let previousLessonCompleted = true; // First lesson is always unlocked

    const roadmap = categories.map((category) => {
      let categoryLessonsCount = 0;
      let categoryLessonsCompleted = 0;
      let categoryStars = 0;

      const modules = category.modules.map((module) => {
        let moduleLessonsCompleted = 0;

        const lessons = module.lessons.map((lesson) => {
          categoryLessonsCount++;
          const progress = progressMap.get(lesson.id);
          const isCompleted = progress?.status === 'COMPLETED';

          if (isCompleted) {
            categoryLessonsCompleted++;
            moduleLessonsCompleted++;
            categoryStars += progress?.totalStars ?? 0;
          }

          const isUnlocked = previousLessonCompleted;
          previousLessonCompleted = isCompleted;

          return {
            id: lesson.id,
            moduleId: lesson.moduleId,
            title: lesson.title,
            description: lesson.description,
            displayOrder: lesson.displayOrder,
            difficulty: lesson.difficulty,
            createdAt: lesson.createdAt,
            updatedAt: lesson.updatedAt,
            isCompleted,
            isUnlocked,
            activities: lesson.activities.map(formatRoadmapActivity),
            progress: progress || null,
          };
        });

        const isModuleCompleted = lessons.length > 0 && lessons.every((l) => l.isCompleted);
        const isModuleUnlocked = lessons.length > 0 && lessons.some((l) => l.isUnlocked);

        return {
          id: module.id,
          categoryId: module.categoryId,
          title: module.title,
          description: module.description,
          displayOrder: module.displayOrder,
          createdAt: module.createdAt,
          updatedAt: module.updatedAt,
          lessons,
          isCompleted: isModuleCompleted,
          isUnlocked: isModuleUnlocked,
        };
      });

      const isCategoryCompleted = modules.length > 0 && modules.every((m) => m.isCompleted);
      const isCategoryUnlocked = modules.length > 0 && modules.some((m) => m.isUnlocked);

      return {
        id: category.id,
        title: category.title,
        description: category.description,
        displayOrder: category.displayOrder,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        modules,
        lessonsCount: categoryLessonsCount,
        lessonsCompleted: categoryLessonsCompleted,
        stars: categoryStars,
        isCompleted: isCategoryCompleted,
        isUnlocked: isCategoryUnlocked,
      };
    });

    let currentLesson = null;
    let foundCurrent = false;
    for (const cat of roadmap) {
      for (const mod of cat.modules) {
        for (const les of mod.lessons) {
          if (!les.isCompleted && les.isUnlocked && !foundCurrent) {
            currentLesson = les;
            foundCurrent = true;
          }
        }
      }
    }

    if (!currentLesson && roadmap.length > 0) {
      const lastCat = roadmap[roadmap.length - 1];
      if (lastCat.modules.length > 0) {
        const lastMod = lastCat.modules[lastCat.modules.length - 1];
        if (lastMod.lessons.length > 0) {
          currentLesson = lastMod.lessons[lastMod.lessons.length - 1];
        }
      }
    }

    return {
      roadmap,
      currentLesson,
    };
  }
}

export const roadmapService = new RoadmapService();
