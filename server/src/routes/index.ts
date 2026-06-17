import { Router } from 'express';
import { usersRoutes } from '../modules/users/users.routes.js';
import { authRoutes } from '../modules/users/auth.routes.js';
import { childrenRoutes } from '../modules/children/children.routes.js';
import { mentorsRoutes } from '../modules/mentors/mentors.routes.js';
import { categoriesRoutes } from '../modules/categories/categories.routes.js';
import { modulesRoutes } from '../modules/modules/modules.routes.js';
import { roadmapRoutes } from '../modules/roadmap/roadmap.routes.js';
import { lessonsRoutes } from '../modules/lessons/lessons.routes.js';
import { activitiesRoutes } from '../modules/activities/activities.routes.js';
import { videosRoutes } from '../modules/videos/videos.routes.js';
import { videoProgressRoutes } from '../modules/video-progress/video-progress.routes.js';
import { progressRoutes } from '../modules/progress/progress.routes.js';
import { rewardsRoutes } from '../modules/rewards/rewards.routes.js';
import { storiesRoutes } from '../modules/stories/stories.routes.js';
import { questionnairesRoutes } from '../modules/questionnaires/questionnaires.routes.js';
import { audioRoutes } from '../modules/audio/audio.routes.js';
import { listenProgressRoutes } from '../modules/listen-progress/listen-progress.routes.js';
import { speakProgressRoutes } from '../modules/speak-progress/speak-progress.routes.js';
import { writeProgressRoutes } from '../modules/write-progress/write-progress.routes.js';
import { masteryRoutes } from '../modules/mastery/mastery.routes.js';
import { curriculumRoutes } from '../modules/curriculum/curriculum.routes.js';
import { adaptiveRoutes } from '../modules/adaptive/adaptive.routes.js';

const router = Router();

// Health Check Endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Mounted API Routes
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/children', childrenRoutes);
router.use('/mentors', mentorsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/modules', modulesRoutes);
router.use('/roadmap', roadmapRoutes);
router.use('/lessons', lessonsRoutes);
router.use('/activities', activitiesRoutes);
router.use('/videos', videosRoutes);
router.use('/video-progress', videoProgressRoutes);
router.use('/progress', progressRoutes);
router.use('/rewards', rewardsRoutes);
router.use('/stories', storiesRoutes);
router.use('/questionnaires', questionnairesRoutes);
router.use('/audio', audioRoutes);
router.use('/listen-progress', listenProgressRoutes);
router.use('/speak-progress', speakProgressRoutes);
router.use('/write-progress', writeProgressRoutes);
router.use('/mastery', masteryRoutes);
router.use('/curriculum', curriculumRoutes);
router.use('/adaptive', adaptiveRoutes);

export { router as rootRouter };


