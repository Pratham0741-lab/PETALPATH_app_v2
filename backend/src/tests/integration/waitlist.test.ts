import '../helpers/setup.js';
import app from '../../app.js';
import { prisma } from '../../config/database.js';
import supertest from 'supertest';
import { cleanDatabase } from '../helpers/factories.js';

const request = supertest(app);

describe('Waitlist Integration', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('POST /api/waitlist', () => {
    it('should successfully add a valid new name and email to the waitlist and return 201', async () => {
      const res = await request
        .post('/api/waitlist')
        .send({
          name: 'Test Parent',
          email: 'new@example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        success: true,
        message: "You're on the waitlist!",
      });

      const entry = await prisma.waitlist.findUnique({
        where: { email: 'new@example.com' },
      });
      expect(entry).not.toBeNull();
      expect(entry?.name).toBe('Test Parent');
      expect(entry?.email).toBe('new@example.com');
      expect(entry?.id).toBeDefined();
      expect(entry?.createdAt).toBeInstanceOf(Date);
    });

    it('should return 200 when the email is already on the waitlist and NOT overwrite original name', async () => {
      // First signup
      await request
        .post('/api/waitlist')
        .send({
          name: 'Original Parent',
          email: 'duplicate@example.com',
        });

      // Duplicate signup with different name
      const res = await request
        .post('/api/waitlist')
        .send({
          name: 'Different Name',
          email: 'duplicate@example.com',
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: "You're already on the waitlist!",
      });

      // Confirm only 1 entry in DB and name was not overwritten
      const count = await prisma.waitlist.count({
        where: { email: 'duplicate@example.com' },
      });
      expect(count).toBe(1);

      const entry = await prisma.waitlist.findUnique({
        where: { email: 'duplicate@example.com' },
      });
      expect(entry?.name).toBe('Original Parent');
    });

    it('should normalize emails by trimming whitespace and converting to lowercase', async () => {
      const res1 = await request
        .post('/api/waitlist')
        .send({
          name: 'Parent User',
          email: '  Parent.User@EXAMPLE.COM  ',
        });

      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);

      const entry = await prisma.waitlist.findUnique({
        where: { email: 'parent.user@example.com' },
      });
      expect(entry).not.toBeNull();
      expect(entry?.email).toBe('parent.user@example.com');

      // Attempting again with different casing and whitespace
      const res2 = await request
        .post('/api/waitlist')
        .send({
          name: 'Parent User',
          email: 'PARENT.USER@example.com',
        });

      expect(res2.status).toBe(200);
      expect(res2.body).toEqual({
        success: true,
        message: "You're already on the waitlist!",
      });
    });

    it('should trim whitespace from name', async () => {
      const res = await request
        .post('/api/waitlist')
        .send({
          name: '   Spaced Parent Name   ',
          email: 'spaced@example.com',
        });

      expect(res.status).toBe(201);
      const entry = await prisma.waitlist.findUnique({
        where: { email: 'spaced@example.com' },
      });
      expect(entry?.name).toBe('Spaced Parent Name');
    });

    it('should return 400 when name is missing', async () => {
      const res = await request
        .post('/api/waitlist')
        .send({
          email: 'noname@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Please enter your name.');
    });

    it('should return 400 when name is empty or only whitespace', async () => {
      const res = await request
        .post('/api/waitlist')
        .send({
          name: '   ',
          email: 'emptyname@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Please enter your name.');
    });

    it('should return 400 for non-string name', async () => {
      const res = await request
        .post('/api/waitlist')
        .send({
          name: 12345,
          email: 'badname@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Please enter your name.');
    });

    it('should return 400 when email is missing', async () => {
      const res = await request
        .post('/api/waitlist')
        .send({
          name: 'Test Parent',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Please enter a valid email address.');
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request
        .post('/api/waitlist')
        .send({
          name: 'Test Parent',
          email: 'not-a-valid-email',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Please enter a valid email address.');
    });

    it('should return 400 for non-string email', async () => {
      const res = await request
        .post('/api/waitlist')
        .send({
          name: 'Test Parent',
          email: 12345,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Please enter a valid email address.');
    });

    it('should not leak database record or internal error details to client', async () => {
      const res = await request
        .post('/api/waitlist')
        .send({
          name: 'Secure Parent',
          email: 'secure@example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeUndefined();
      expect(res.body.id).toBeUndefined();
      expect(res.body.createdAt).toBeUndefined();
    });
  });

  describe('POST /waitlist (root level alias)', () => {
    it('should handle waitlist requests sent to the root /waitlist endpoint with name and email', async () => {
      const res = await request
        .post('/waitlist')
        .send({
          name: 'Root Parent',
          email: 'root-path@example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        success: true,
        message: "You're on the waitlist!",
      });

      const entry = await prisma.waitlist.findUnique({
        where: { email: 'root-path@example.com' },
      });
      expect(entry?.name).toBe('Root Parent');
      expect(entry?.email).toBe('root-path@example.com');
    });
  });
});
