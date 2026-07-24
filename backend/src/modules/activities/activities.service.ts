import { activitiesRepository } from './activities.repository.js';
import { Prisma } from '@prisma/client';
import { curriculumService } from '../curriculum/curriculum.service.js';

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

export class ActivitiesService {
  async getAllActivities(lessonId?: string) {
    if (lessonId) {
      const dbActivities = await activitiesRepository.findByLessonId(lessonId);
      if (dbActivities && dbActivities.length > 0) {
        return dbActivities;
      }

      // Dynamic Failsafe: Synthesize from static curriculum configuration if DB is not seeded
      const node = curriculumService.getLessonById(lessonId);
      if (node && node.activities && node.activities.length > 0) {
        return node.activities.map((act, index) => ({
          id: `${lessonId}_act_${index + 1}`,
          lessonId,
          title: getActivityTitle(node.title, act.type),
          activityType: act.type,
          contentUrl: null,
          displayOrder: index + 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          video: act.type === 'video' ? {
            id: `v_${lessonId}`,
            activityId: `${lessonId}_act_${index + 1}`,
            title: `${node.title} Video Lesson`,
            videoKey: `videos/${node.id}.mp4`,
            thumbnailKey: 'thumbnails/default.png',
            duration: act.estimated_minutes * 60,
          } : null,
          audio: act.type === 'listen' ? {
            id: `a_${lessonId}`,
            activityId: `${lessonId}_act_${index + 1}`,
            title: `${node.title} Listening Guide`,
            audioKey: `audio/${node.id}.mp3`,
            duration: act.estimated_minutes * 60,
          } : null,
        }));
      }

      return [];
    }
    return activitiesRepository.findAll();
  }

  async getActivityById(id: string) {
    return activitiesRepository.findById(id);
  }

  async createActivity(data: Prisma.ActivityUncheckedCreateInput) {
    return activitiesRepository.create(data);
  }

  async updateActivity(id: string, data: Prisma.ActivityUncheckedUpdateInput) {
    return activitiesRepository.update(id, data);
  }

  async deleteActivity(id: string) {
    return activitiesRepository.delete(id);
  }
}

export const activitiesService = new ActivitiesService();

