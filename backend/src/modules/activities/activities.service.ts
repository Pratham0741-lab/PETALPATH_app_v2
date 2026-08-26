import { activitiesRepository } from './activities.repository.js';
import { Prisma } from '@prisma/client';
import { curriculumService } from '../curriculum/curriculum.service.js';
import { resolveVideoKey } from '../../shared/utils/video-resolver.js';
import { resolveAudioKey } from '../../shared/utils/audio-resolver.js';

import { generateDynamicDragDropSpec } from '../../shared/utils/spec-generator.js';

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

import fs from 'fs';
import path from 'path';

function getDragDropSpec(lessonId: string, activityIndex?: number): any | null {
  try {
    const manifestPath = path.resolve(process.cwd(), 'curriculum', 'activities', 'drag_drop_manifest.json');
    const altManifestPath = path.resolve(process.cwd(), '..', 'curriculum', 'activities', 'drag_drop_manifest.json');
    const actualManifestPath = fs.existsSync(manifestPath) ? manifestPath : altManifestPath;

    if (!fs.existsSync(actualManifestPath)) return null;

    const manifest = JSON.parse(fs.readFileSync(actualManifestPath, 'utf8'));
    const matched = manifest.activities.find(
      (a: any) => a.nodeId === lessonId && (activityIndex === undefined || a.activityIndex === activityIndex)
    );

    if (!matched) return null;

    const specDir = path.dirname(actualManifestPath);
    const specFilePath = path.join(specDir, 'drag_drop', matched.fileName);

    if (fs.existsSync(specFilePath)) {
      return JSON.parse(fs.readFileSync(specFilePath, 'utf8'));
    }
  } catch (e) {
    // Return null silently if file reading fails
  }
  return null;
}

function getDragDropSpecForLesson(lessonId: string): any | null {
  const node = curriculumService.getLessonById(lessonId);
  const activityIndex = node?.activities?.findIndex((activity: any) => activity.type === 'drag_drop');
  const spec = getDragDropSpec(lessonId, activityIndex === undefined || activityIndex < 0 ? undefined : activityIndex)
    || getDragDropSpec(lessonId);
  if (spec) return spec;
  if (node) {
    // `original_topic` is where the real lesson content lives — "classify objects
    // into 3 bins by category (animals/fruits/vehicles)" and the like. Without it
    // the generator can only fall back to a generic letter board.
    return generateDynamicDragDropSpec(lessonId, node.title, node.curriculum?.original_topic);
  }
  return null;
}

function isSpeakingActivity(type: string): boolean {
  return ['speak', 'blend', 'conversation', 'read'].includes(type.toLowerCase());
}

function positionDragDropAfterSpeaking<T extends { activityType: string; displayOrder: number }>(activities: T[]): T[] {
  const speakingActivity = activities
    .filter((activity) => isSpeakingActivity(activity.activityType))
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .at(-1);

  if (!speakingActivity) return activities;

  return activities.map((activity) => (
    activity.activityType === 'drag_drop'
      ? { ...activity, displayOrder: speakingActivity.displayOrder + 0.5 }
      : activity
  ));
}

function addMissingDragDropActivity(lessonId: string, activities: any[]): any[] {
  if (activities.some((activity) => activity.activityType === 'drag_drop')) return activities;

  const node = curriculumService.getLessonById(lessonId);
  if (!node) return activities;

  const spec = getDragDropSpecForLesson(lessonId);
  const nextDisplayOrder = activities.length > 0
    ? Math.max(...activities.map((a: any) => a.displayOrder)) + 1
    : 4;

  return [
    ...activities,
    {
      id: `${lessonId}_act_${nextDisplayOrder}`,
      lessonId,
      title: getActivityTitle(node.title, 'drag_drop'),
      activityType: 'drag_drop',
      contentUrl: null,
      displayOrder: nextDisplayOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      dragDropSpec: spec,
    },
  ];
}

export class ActivitiesService {
  async getAllActivities(lessonId?: string) {
    if (lessonId) {
      const dbActivities = await activitiesRepository.findByLessonId(lessonId);
      if (dbActivities && dbActivities.length > 0) {
        const activitiesWithDragDrop = addMissingDragDropActivity(lessonId, dbActivities);
        const enrichedActivities = activitiesWithDragDrop.map((act) => {
          if (act.activityType === 'drag_drop') {
            const spec = act.dragDropSpec || getDragDropSpecForLesson(act.lessonId);
            return { ...act, dragDropSpec: spec };
          }
          return act;
        });
        return positionDragDropAfterSpeaking(enrichedActivities);
      }

      // Dynamic Failsafe: Synthesize from static curriculum configuration if DB is not seeded
      const node = curriculumService.getLessonById(lessonId);
      if (node && node.activities && node.activities.length > 0) {
        let activities = node.activities.map((act, index) => ({
          id: `${lessonId}_act_${index + 1}`,
          lessonId,
          title: getActivityTitle(node.title, act.type),
          activityType: act.type,
          contentUrl: null,
          displayOrder: index + 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          dragDropSpec: act.type === 'drag_drop' ? getDragDropSpecForLesson(lessonId) : null,
          video: act.type === 'video' ? {
            id: `v_${lessonId}`,
            activityId: `${lessonId}_act_${index + 1}`,
            title: `${node.title} Video Lesson`,
            videoKey: resolveVideoKey(node),
            thumbnailKey: 'thumbnails/default.png',
            duration: act.estimated_minutes * 60,
          } : null,
          audio: act.type === 'listen' ? {
            id: `a_${lessonId}`,
            activityId: `${lessonId}_act_${index + 1}`,
            title: `${node.title} Listening Guide`,
            audioKey: resolveAudioKey(node),
            duration: act.estimated_minutes * 60,
          } : null,
        }));

        if (!activities.some((a) => a.activityType === 'drag_drop')) {
          activities = addMissingDragDropActivity(lessonId, activities);
        }

        return positionDragDropAfterSpeaking(activities);
      }

      return [];
    }

    const all = await activitiesRepository.findAll();
    return all.map((act) => {
      if (act.activityType === 'drag_drop') {
        const spec = getDragDropSpecForLesson(act.lessonId);
        return { ...act, dragDropSpec: spec };
      }
      return act;
    });
  }

  async getActivityById(id: string) {
    const act = await activitiesRepository.findById(id);
    if (!act) return null;
    if (act.activityType === 'drag_drop') {
      const spec = getDragDropSpecForLesson(act.lessonId);
      return { ...act, dragDropSpec: spec };
    }
    return act;
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

