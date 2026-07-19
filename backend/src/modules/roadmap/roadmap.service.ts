import { prisma } from '../../config/database.js';
import { storageService } from '../../shared/services/storage.service.js';
import { NotFoundError } from '../../utils/errors.js';
import { curriculumService, curriculumEngineService, curriculumLoader } from '../curriculum/index.js';
import { CurriculumNode } from '../curriculum/curriculum.types.js';

const formatRoadmapActivity = (activity: any) => {
  return {
    ...activity,
    video: activity.video
      ? {
          ...activity.video,
          videoUrl: storageService.getVideoUrl(activity.video.videoKey),
          thumbnailUrl: storageService.getPublicUrl(activity.video.thumbnailKey || null),
          filename: activity.video.videoKey,
        }
      : null,
    audio: activity.audio
      ? {
          ...activity.audio,
          audioUrl: storageService.getAudioUrl(activity.audio.audioKey),
          filename: activity.audio.audioKey,
        }
      : null,
  };
};

function themeIdOfNode(node: CurriculumNode, cur: any): string {
  for (const theme of cur.themes) {
    if (theme.nodes.some((n: any) => n.id === node.id)) {
      return theme.id;
    }
  }
  return '';
}

export class RoadmapService {
  async getRoadmap(childId: string) {
    const child = await prisma.child.findUnique({
      where: { id: childId },
      include: {
        lessonProgress: true,
      },
    });
    if (!child) {
      throw new NotFoundError('Child not found');
    }

    const gradeId = curriculumService.resolveChildGrade(child);
    const gradeCurriculum = curriculumService.getCurriculumByGrade(gradeId);
    if (!gradeCurriculum) {
      throw new NotFoundError(`Curriculum not found for grade: ${gradeId}`);
    }

    const nodes = curriculumService.getLessonsInCurriculumOrder(gradeId);
    const nodeIds = nodes.map((n) => n.id);

    // Query child progress & knowledge states
    const progressList = await prisma.lessonProgress.findMany({
      where: { childId, lessonId: { in: nodeIds } },
    });
    const progressMap = new Map<string, any>(progressList.map((p) => [p.lessonId, p]));

    const knowledgeStates = await prisma.knowledgeState.findMany({
      where: { childId },
    });
    const knowledgeMap = new Map<string, any>(knowledgeStates.map((k) => [k.topicId, k]));

    // Query seeded activities from the database to map audio/video relation paths
    const allActivities = await prisma.activity.findMany({
      where: { lessonId: { in: nodeIds }, deletedAt: null },
      include: { video: true, audio: true },
    });
    const activitiesMap = new Map<string, any[]>();
    allActivities.forEach((act) => {
      const list = activitiesMap.get(act.lessonId) || [];
      list.push(formatRoadmapActivity(act));
      activitiesMap.set(act.lessonId, list);
    });

    // Build Node Status List
    const enrichedNodes: any[] = [];
    let completedCount = 0;

    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index];
      const progress = progressMap.get(node.id);
      const isCompleted = progress?.status === 'COMPLETED';

      if (isCompleted) {
        completedCount++;
      }

      // Unlock evaluation resolved via stateless CurriculumEngineService
      const isUnlocked = curriculumEngineService.isLessonUnlocked(
        node.id,
        nodes,
        progressList,
        knowledgeStates
      );

      enrichedNodes.push({
        id: node.id,
        title: node.title,
        themeId: themeIdOfNode(node, gradeCurriculum),
        isCompleted,
        isUnlocked,
        stars: progress?.totalStars ?? 0,
        xp: progress?.status === 'COMPLETED' ? (node.reward?.xp ?? 0) : 0,
        coins: progress?.status === 'COMPLETED' ? (node.reward?.coins ?? 0) : 0,
        attempts: knowledgeMap.get(node.id)?.totalAttempts ?? 0,
        mastery: knowledgeMap.get(node.id)?.mastery ?? 0.0,
        completedAt: progress?.completedAt ?? null,
        prerequisite: node.prerequisites[0] || null,
        activities: activitiesMap.get(node.id) || [],
        progress: progress || null,
      });
    }

    // Compute Current Node
    let currentNode = null;
    for (const node of enrichedNodes) {
      if (node.isUnlocked && !node.isCompleted) {
        currentNode = node;
        break;
      }
    }

    // Fallback: If all completed, return last node
    if (!currentNode && enrichedNodes.length > 0) {
      currentNode = enrichedNodes[enrichedNodes.length - 1];
    }

    const totalCount = enrichedNodes.length;
    const completion = totalCount > 0 ? parseFloat(((completedCount / totalCount) * 100).toFixed(1)) : 0.0;

    // Build visual roadmap Categories structure for backwards compatibility
    const themesList = gradeCurriculum.themes.map((theme) => {
      const themeNodes = enrichedNodes.filter((n) => n.themeId === theme.id);
      const themeLessonsCount = themeNodes.length;
      const themeLessonsCompleted = themeNodes.filter((n) => n.isCompleted).length;

      return {
        id: theme.id,
        title: theme.title,
        description: `Theme: ${theme.title}`,
        displayOrder: theme.order,
        modules: [
          {
            id: `mod_${theme.id}`,
            categoryId: theme.id,
            title: theme.title,
            description: `Theme ${theme.title} Module`,
            displayOrder: theme.order,
            lessons: themeNodes,
            isCompleted: themeNodes.every((n) => n.isCompleted),
            isUnlocked: themeNodes.some((n) => n.isUnlocked),
          },
        ],
        lessonsCount: themeLessonsCount,
        lessonsCompleted: themeLessonsCompleted,
        stars: themeNodes.reduce((acc, curr) => acc + curr.stars, 0),
        isCompleted: themeNodes.every((n) => n.isCompleted),
        isUnlocked: themeNodes.some((n) => n.isUnlocked),
      };
    });

    const nextGradeMap: Record<string, string | null> = {
      prenursery: 'nursery',
      nursery: 'lkg',
      lkg: 'ukg',
      ukg: null,
    };

    return {
      grade: gradeCurriculum.grade.name,
      themes: gradeCurriculum.themes,
      nodes: enrichedNodes,
      currentNode,
      progress: {
        completedCount,
        totalCount,
      },
      completion,
      nextGrade: nextGradeMap[gradeId] || null,
      // Backwards compatibility keys
      roadmap: themesList,
      currentLesson: currentNode,
    };
  }

  async getCurrentLesson(childId: string) {
    const roadmap = await this.getRoadmap(childId);
    return roadmap.currentNode;
  }

  async getCurrentTheme(childId: string) {
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) {
      throw new NotFoundError('Child not found');
    }

    const gradeId = curriculumService.resolveChildGrade(child);
    const gradeCurriculum = curriculumService.getCurriculumByGrade(gradeId);
    if (!gradeCurriculum) {
      throw new NotFoundError(`Curriculum not found for grade: ${gradeId}`);
    }

    const currentLesson = await this.getCurrentLesson(childId);
    if (!currentLesson) return null;

    const theme = gradeCurriculum.themes.find((t) =>
      t.nodes.some((n) => n.id === currentLesson.id)
    );

    return theme || null;
  }

  async getCurrentGrade(childId: string) {
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) {
      throw new NotFoundError('Child not found');
    }

    const gradeId = curriculumService.resolveChildGrade(child);
    const metadata = curriculumLoader.getGradeMetadata(gradeId);
    if (!metadata) {
      throw new NotFoundError(`Metadata not found for grade: ${gradeId}`);
    }

    return metadata;
  }
}

export const roadmapService = new RoadmapService();
