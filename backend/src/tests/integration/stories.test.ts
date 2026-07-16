import '../helpers/setup.js';
import app from '../../app.js';
import { prisma } from '../../config/database.js';
import supertest from 'supertest';
import { createTestUser, createTestChild, cleanDatabase } from '../helpers/factories.js';
import { getAuthToken } from '../helpers/auth.js';

const request = supertest(app);

describe('Stories Integration', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  const createUserWithToken = async (role = 'PARENT', childId?: string) => {
    const user = await createTestUser({ role });
    return { user, token: getAuthToken(user.id, role, childId) };
  };

  const createUserWithChild = async (role = 'PARENT') => {
    const user = await createTestUser({ role });
    const child = await createTestChild(user.id);
    const token = getAuthToken(user.id, role, child.id);
    return { user, child, token };
  };

  const createStoryFixture = async (overrides: Partial<{
    title: string;
    description: string;
    category: string;
    difficulty: string;
    readingLevel: number;
  }> = {}) => {
    const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    return prisma.story.create({
      data: {
        title: `Test Story ${suffix}`,
        description: 'A test story for integration testing',
        category: 'FICTION',
        difficulty: 'EASY',
        readingLevel: 1,
        ...overrides,
      },
    });
  };

  const createStoryWithPagesFixture = async (pageCount = 3) => {
    const story = await createStoryFixture();
    for (let i = 0; i < pageCount; i++) {
      await prisma.storyPage.create({
        data: {
          storyId: story.id,
          pageNumber: i,
          content: `Page ${i} content`,
        },
      });
    }
    return prisma.story.findUnique({
      where: { id: story.id },
      include: { pages: { orderBy: { pageNumber: 'asc' } } },
    }) as Promise<any>;
  };

  describe('GET /api/stories', () => {
    it('should list active stories', async () => {
      const { token } = await createUserWithToken();
      await createStoryFixture({ title: 'Story A' });
      await createStoryFixture({ title: 'Story B' });

      const res = await request
        .get('/api/stories')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should filter by category', async () => {
      const { token } = await createUserWithToken();
      await createStoryFixture({ title: 'Fic Story', category: 'FICTION' });
      await createStoryFixture({ title: 'Edu Story', category: 'EDUCATIONAL' });

      const res = await request
        .get('/api/stories?category=FICTION')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].category).toBe('FICTION');
    });

    it('should search by title', async () => {
      const { token } = await createUserWithToken();
      await createStoryFixture({ title: 'Brave Little Lion' });
      await createStoryFixture({ title: 'Quiet Mouse' });

      const res = await request
        .get('/api/stories?search=Brave')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toContain('Brave');
    });

    it('should paginate results', async () => {
      const { token } = await createUserWithToken();
      await createStoryFixture({ title: 'S1' });
      await createStoryFixture({ title: 'S2' });
      await createStoryFixture({ title: 'S3' });

      const res = await request
        .get('/api/stories?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.totalPages).toBe(2);
    });

    it('should return 401 without token', async () => {
      const res = await request.get('/api/stories');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/stories/:id', () => {
    it('should return story with pages and vocabulary', async () => {
      const { token } = await createUserWithToken();
      const story = await createStoryWithPagesFixture(3);

      const res = await request
        .get(`/api/stories/${story.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(story.id);
      expect(res.body.data.pages.length).toBe(3);
      expect(res.body.data.pages[0].pageNumber).toBe(0);
      expect(res.body.data.pages[1].pageNumber).toBe(1);
    });

    it('should return 404 for unknown story', async () => {
      const { token } = await createUserWithToken();
      const res = await request
        .get(`/api/stories/${'00000000-0000-0000-0000-000000000000'}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/stories/:id/start', () => {
    it('should start a story for the child', async () => {
      const { child, token } = await createUserWithChild();
      const story = await createStoryWithPagesFixture(3);

      const res = await request
        .post(`/api/stories/${story.id}/start`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.childId).toBe(child.id);
      expect(res.body.data.storyId).toBe(story.id);
      expect(res.body.data.status).toBe('IN_PROGRESS');
      expect(res.body.data.currentPage).toBe(0);
      expect(res.body.data.totalPages).toBe(3);
    });

    it('should return 401 without childId in token', async () => {
      const { token } = await createUserWithToken();
      const story = await createStoryFixture();

      const res = await request
        .post(`/api/stories/${story.id}/start`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });

    it('should return 404 for unknown story', async () => {
      const { token } = await createUserWithChild();

      const res = await request
        .post(`/api/stories/${'00000000-0000-0000-0000-000000000000'}/start`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/stories/:id/page', () => {
    it('should update page progress', async () => {
      const { token } = await createUserWithChild();
      const story = await createStoryWithPagesFixture(3);

      await request
        .post(`/api/stories/${story.id}/start`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request
        .post(`/api/stories/${story.id}/page`)
        .set('Authorization', `Bearer ${token}`)
        .send({ pageNumber: 1, readingTime: 30 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentPage).toBe(1);
      expect(res.body.data.completionPercent).toBeGreaterThan(0);
    });

    it('should return 404 if story not started', async () => {
      const { token } = await createUserWithChild();
      const story = await createStoryFixture();

      const res = await request
        .post(`/api/stories/${story.id}/page`)
        .set('Authorization', `Bearer ${token}`)
        .send({ pageNumber: 1 });

      expect(res.status).toBe(404);
    });

    it('should return 400 for page number exceeding story page count', async () => {
      const { token } = await createUserWithChild();
      const story = await createStoryWithPagesFixture(3);

      await request
        .post(`/api/stories/${story.id}/start`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request
        .post(`/api/stories/${story.id}/page`)
        .set('Authorization', `Bearer ${token}`)
        .send({ pageNumber: 10 });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/stories/:id/complete', () => {
    it('should complete a story and update stars', async () => {
      const { token } = await createUserWithChild();
      const story = await createStoryWithPagesFixture(3);

      await request
        .post(`/api/stories/${story.id}/start`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request
        .post(`/api/stories/${story.id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ readingTime: 120 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('COMPLETED');
      expect(res.body.data.completionPercent).toBe(100);
      expect(res.body.data.starsEarned).toBe(3);
      expect(res.body.data.completedAt).not.toBeNull();
    });

    it('should return 409 for duplicate completion', async () => {
      const { token } = await createUserWithChild();
      const story = await createStoryWithPagesFixture(3);

      await request
        .post(`/api/stories/${story.id}/start`)
        .set('Authorization', `Bearer ${token}`);

      await request
        .post(`/api/stories/${story.id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ readingTime: 120 });

      const res = await request
        .post(`/api/stories/${story.id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ readingTime: 30 });

      expect(res.status).toBe(409);
    });

    it('should return 400 for invalid payload', async () => {
      const { token } = await createUserWithChild();
      const story = await createStoryFixture();

      const res = await request
        .post(`/api/stories/${story.id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ readingTime: -1 });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/stories/:id/progress', () => {
    it('should return progress for a started story', async () => {
      const { child, token } = await createUserWithChild();
      const story = await createStoryWithPagesFixture(5);

      await request
        .post(`/api/stories/${story.id}/start`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request
        .get(`/api/stories/${story.id}/progress`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.childId).toBe(child.id);
      expect(res.body.data.storyId).toBe(story.id);
      expect(res.body.data.totalPages).toBe(5);
      expect(res.body.data.status).toBe('IN_PROGRESS');
    });

    it('should return 404 if story not started', async () => {
      const { token } = await createUserWithChild();
      const story = await createStoryFixture();

      const res = await request
        .get(`/api/stories/${story.id}/progress`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
