import '../helpers/setup.js';
import app from '../../app.js';
import { prisma } from '../../config/database.js';
import supertest from 'supertest';
import { createTestUser, createTestChild, createTestSubject, createTestSkill, cleanDatabase } from '../helpers/factories.js';
import { getAuthToken } from '../helpers/auth.js';

const request = supertest(app);

describe('Adaptive Curriculum API', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  const createUserWithToken = async (role = 'PARENT') => {
    const user = await createTestUser({ role });
    return { user, token: getAuthToken(user.id, role) };
  };

  const createAdminWithToken = async () => {
    const user = await createTestUser({ role: 'ADMIN' });
    return { user, token: getAuthToken(user.id, 'ADMIN') };
  };

  describe('Skill Search', () => {
    it('should return empty results when no skills exist', async () => {
      const { token } = await createUserWithToken();

      const res = await request
        .get('/api/adaptive-curriculum/skills/search')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.total).toBe(0);
    });

    it('should search skills with filters', async () => {
      const { token } = await createUserWithToken();
      const subject = await createTestSubject();
      await createTestSkill(subject.id, { name: 'Addition Basics', isRootSkill: true });
      await createTestSkill(subject.id, { name: 'Subtraction Basics', isRootSkill: true });

      const res = await request
        .get(`/api/adaptive-curriculum/skills/search?query=Addition&subjectId=${subject.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].name).toContain('Addition');
      expect(res.body.data.total).toBe(1);
    });

    it('should paginate skill search results', async () => {
      const { token } = await createUserWithToken();
      const subject = await createTestSubject();
      for (let i = 0; i < 3; i++) {
        await createTestSkill(subject.id, { name: `Skill ${i}`, isRootSkill: true });
      }

      const res = await request
        .get('/api/adaptive-curriculum/skills/search?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(2);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(2);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.totalPages).toBe(2);
    });
  });

  describe('Skill Detail', () => {
    it('should return 404 for non-existent skill', async () => {
      const { token } = await createUserWithToken();

      const res = await request
        .get(`/api/adaptive-curriculum/skills/${'00000000-0000-0000-0000-000000000000'}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return full skill detail with tags and activities', async () => {
      const { token } = await createUserWithToken();
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id, { name: 'Full Skill Test', isRootSkill: true });

      const res = await request
        .get(`/api/adaptive-curriculum/skills/${skill.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(skill.id);
      expect(res.body.data.name).toBe('Full Skill Test');
      expect(res.body.data.subjectId).toBe(subject.id);
      expect(res.body.data.tags).toEqual([]);
      expect(res.body.data.activities).toEqual([]);
      expect(res.body.data.assessments).toEqual([]);
      expect(Array.isArray(res.body.data.parentDependencies)).toBe(true);
      expect(Array.isArray(res.body.data.childDependencies)).toBe(true);
    });
  });

  describe('Grades CRUD', () => {
    it('should create a grade', async () => {
      const { token } = await createAdminWithToken();

      const res = await request
        .post('/api/admin/adaptive-curriculum/grades')
        .set('Authorization', `Bearer ${token}`)
        .send({ gradeNumber: 1, title: 'Grade 1', description: 'First grade' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.gradeNumber).toBe(1);
      expect(res.body.data.title).toBe('Grade 1');
    });

    it('should list grades', async () => {
      const { token: adminToken } = await createAdminWithToken();
      const { token } = await createUserWithToken();
      await request
        .post('/api/admin/adaptive-curriculum/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ gradeNumber: 1, title: 'Grade 1' });
      await request
        .post('/api/admin/adaptive-curriculum/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ gradeNumber: 2, title: 'Grade 2' });

      const res = await request
        .get('/api/adaptive-curriculum/grades')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].gradeNumber).toBe(1);
      expect(res.body.data[1].gradeNumber).toBe(2);
    });

    it('should get grade by id', async () => {
      const { token: adminToken } = await createAdminWithToken();
      const { token } = await createUserWithToken();
      const created = await request
        .post('/api/admin/adaptive-curriculum/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ gradeNumber: 3, title: 'Grade 3' });

      const res = await request
        .get(`/api/adaptive-curriculum/grades/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(created.body.data.id);
      expect(res.body.data.gradeNumber).toBe(3);
    });

    it('should update grade', async () => {
      const { token } = await createAdminWithToken();
      const created = await request
        .post('/api/admin/adaptive-curriculum/grades')
        .set('Authorization', `Bearer ${token}`)
        .send({ gradeNumber: 4, title: 'Grade 4' });

      const res = await request
        .put(`/api/admin/adaptive-curriculum/grades/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Grade Four' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Grade Four');
    });

    it('should delete grade', async () => {
      const { token } = await createAdminWithToken();
      const { token: userToken } = await createUserWithToken();
      const created = await request
        .post('/api/admin/adaptive-curriculum/grades')
        .set('Authorization', `Bearer ${token}`)
        .send({ gradeNumber: 5, title: 'Grade 5' });

      const delRes = await request
        .delete(`/api/admin/adaptive-curriculum/grades/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const getRes = await request
        .get(`/api/adaptive-curriculum/grades/${created.body.data.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(getRes.status).toBe(404);
    });

    it('should return 404 for non-existent grade', async () => {
      const { token } = await createUserWithToken();

      const res = await request
        .get(`/api/adaptive-curriculum/grades/${'00000000-0000-0000-0000-000000000000'}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Domains CRUD', () => {
    it('should create a domain', async () => {
      const { token } = await createAdminWithToken();
      const subject = await createTestSubject();

      const res = await request
        .post('/api/admin/adaptive-curriculum/domains')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Number Sense', subjectId: subject.id, description: 'Basic number concepts', displayOrder: 1 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Number Sense');
      expect(res.body.data.subjectId).toBe(subject.id);
    });

    it('should list domains', async () => {
      const { token: adminToken } = await createAdminWithToken();
      const { token } = await createUserWithToken();
      const subject = await createTestSubject();
      await request
        .post('/api/admin/adaptive-curriculum/domains')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Domain A', subjectId: subject.id, displayOrder: 1 });
      await request
        .post('/api/admin/adaptive-curriculum/domains')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Domain B', subjectId: subject.id, displayOrder: 2 });

      const res = await request
        .get('/api/adaptive-curriculum/domains')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should get domains by subject', async () => {
      const { token: adminToken } = await createAdminWithToken();
      const { token } = await createUserWithToken();
      const subject = await createTestSubject();
      const otherSubject = await createTestSubject();
      await request
        .post('/api/admin/adaptive-curriculum/domains')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Domain X', subjectId: subject.id, displayOrder: 1 });
      await request
        .post('/api/admin/adaptive-curriculum/domains')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Domain Y', subjectId: otherSubject.id, displayOrder: 1 });

      const res = await request
        .get(`/api/adaptive-curriculum/domains/by-subject/${subject.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Domain X');
    });
  });

  describe('Skill Tags', () => {
    it('should add and list tags', async () => {
      const { token: adminToken } = await createAdminWithToken();
      const { token } = await createUserWithToken();
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id, { name: 'Tagged Skill', isRootSkill: true });

      const addRes = await request
        .post(`/api/admin/adaptive-curriculum/skills/${skill.id}/tags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tag: 'addition' });

      expect(addRes.status).toBe(201);
      expect(addRes.body.success).toBe(true);
      expect(addRes.body.data.tag).toBe('addition');

      const listRes = await request
        .get(`/api/adaptive-curriculum/skills/${skill.id}/tags`)
        .set('Authorization', `Bearer ${token}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.data.length).toBe(1);
      expect(listRes.body.data[0].tag).toBe('addition');
    });

    it('should remove tag', async () => {
      const { token } = await createAdminWithToken();
      const { token: userToken } = await createUserWithToken();
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id, { name: 'Remove Tag Skill', isRootSkill: true });

      const addRes = await request
        .post(`/api/admin/adaptive-curriculum/skills/${skill.id}/tags`)
        .set('Authorization', `Bearer ${token}`)
        .send({ tag: 'remove-me' });

      const delRes = await request
        .delete(`/api/admin/adaptive-curriculum/skills/${skill.id}/tags/${addRes.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(delRes.status).toBe(200);

      const listRes = await request
        .get(`/api/adaptive-curriculum/skills/${skill.id}/tags`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(listRes.body.data.length).toBe(0);
    });
  });

  describe('Skill Activities', () => {
    it('should create and list activities', async () => {
      const { token: adminToken } = await createAdminWithToken();
      const { token } = await createUserWithToken();
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id, { name: 'Activity Skill', isRootSkill: true });

      const createRes = await request
        .post(`/api/admin/adaptive-curriculum/skills/${skill.id}/activities`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Counting Exercise', activityType: 'INTERACTIVE', description: 'Count objects', displayOrder: 1 });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.title).toBe('Counting Exercise');

      const listRes = await request
        .get(`/api/adaptive-curriculum/skills/${skill.id}/activities`)
        .set('Authorization', `Bearer ${token}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(1);
    });

    it('should update and delete activity', async () => {
      const { token } = await createAdminWithToken();
      const { token: userToken } = await createUserWithToken();
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id, { name: 'Update Activity Skill', isRootSkill: true });

      const created = await request
        .post(`/api/admin/adaptive-curriculum/skills/${skill.id}/activities`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Old Activity', activityType: 'VIDEO', displayOrder: 1 });

      const updateRes = await request
        .put(`/api/admin/adaptive-curriculum/skills/${skill.id}/activities/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Activity' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.title).toBe('Updated Activity');

      const delRes = await request
        .delete(`/api/admin/adaptive-curriculum/skills/${skill.id}/activities/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(delRes.status).toBe(200);

      const listRes = await request
        .get(`/api/adaptive-curriculum/skills/${skill.id}/activities`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(listRes.body.data.length).toBe(0);
    });
  });

  describe('Skill Assessments', () => {
    it('should create and list assessments', async () => {
      const { token: adminToken } = await createAdminWithToken();
      const { token } = await createUserWithToken();
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id, { name: 'Assessment Skill', isRootSkill: true });

      const createRes = await request
        .post(`/api/admin/adaptive-curriculum/skills/${skill.id}/assessments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Addition Quiz', assessmentType: 'QUIZ', maxScore: 100, passingScore: 80, description: 'Test addition skills' });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.title).toBe('Addition Quiz');

      const listRes = await request
        .get(`/api/adaptive-curriculum/skills/${skill.id}/assessments`)
        .set('Authorization', `Bearer ${token}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(1);
    });

    it('should update and delete assessment', async () => {
      const { token } = await createAdminWithToken();
      const { token: userToken } = await createUserWithToken();
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id, { name: 'Update Assessment Skill', isRootSkill: true });

      const created = await request
        .post(`/api/admin/adaptive-curriculum/skills/${skill.id}/assessments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Old Assessment', assessmentType: 'QUIZ', maxScore: 100, passingScore: 80 });

      const updateRes = await request
        .put(`/api/admin/adaptive-curriculum/skills/${skill.id}/assessments/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Assessment', passingScore: 90 });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.title).toBe('Updated Assessment');

      const delRes = await request
        .delete(`/api/admin/adaptive-curriculum/skills/${skill.id}/assessments/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(delRes.status).toBe(200);

      const listRes = await request
        .get(`/api/adaptive-curriculum/skills/${skill.id}/assessments`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(listRes.body.data.length).toBe(0);
    });
  });

  describe('Validation', () => {
    it('should reject invalid UUIDs', async () => {
      const { token } = await createUserWithToken();

      const res = await request
        .get('/api/adaptive-curriculum/skills/invalid-uuid')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing required fields', async () => {
      const { token } = await createAdminWithToken();

      const res = await request
        .post('/api/admin/adaptive-curriculum/grades')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Bulk Import', () => {
    it('should import curriculum data', async () => {
      const { token } = await createAdminWithToken();
      const subject = await createTestSubject();

      const res = await request
        .post('/api/admin/adaptive-curriculum/bulk-import')
        .set('Authorization', `Bearer ${token}`)
        .send({
          grades: [
            { gradeNumber: 1, title: 'Grade 1' },
            { gradeNumber: 2, title: 'Grade 2' },
          ],
          domains: [
            { name: 'Number Sense', subjectId: subject.id, displayOrder: 1 },
          ],
          skills: [
            { name: 'Counting', subjectId: subject.id, difficulty: 1, isRootSkill: true, displayOrder: 1, skillCode: 'TEST_COUNTING' },
            { name: 'Addition', subjectId: subject.id, difficulty: 2, isRootSkill: false, displayOrder: 2, skillCode: 'TEST_ADDITION' },
          ],
          skillTags: [
            { skillName: 'Counting', tags: ['counting', 'numbers'] },
          ],
          skillActivities: [
            { skillName: 'Counting', title: 'Count to 10', activityType: 'INTERACTIVE', displayOrder: 1 },
          ],
          skillAssessments: [
            { skillName: 'Counting', title: 'Counting Quiz', assessmentType: 'QUIZ', maxScore: 100, passingScore: 80 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.gradesProcessed).toBe(2);
      expect(res.body.data.domainsProcessed).toBe(1);
      expect(res.body.data.skillsProcessed).toBe(2);
      expect(res.body.data.tagsProcessed).toBe(2);
      expect(res.body.data.activitiesProcessed).toBe(1);
      expect(res.body.data.assessmentsProcessed).toBe(1);
    });
  });

  describe('Not Found', () => {
    it('should return 404 for non-existent skill on tag operations', async () => {
      const { token } = await createAdminWithToken();

      const res = await request
        .post(`/api/admin/adaptive-curriculum/skills/${'00000000-0000-0000-0000-000000000000'}/tags`)
        .set('Authorization', `Bearer ${token}`)
        .send({ tag: 'test' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent skill on activity operations', async () => {
      const { token } = await createAdminWithToken();

      const res = await request
        .post(`/api/admin/adaptive-curriculum/skills/${'00000000-0000-0000-0000-000000000000'}/activities`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Test', activityType: 'INTERACTIVE', displayOrder: 1 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent skill on assessment operations', async () => {
      const { token } = await createAdminWithToken();

      const res = await request
        .post(`/api/admin/adaptive-curriculum/skills/${'00000000-0000-0000-0000-000000000000'}/assessments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Test', assessmentType: 'QUIZ', maxScore: 100, passingScore: 80 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
