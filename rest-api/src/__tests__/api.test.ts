import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import prisma from '../db';
import app from '../server';

const API_KEY = 'demo-key-12345';

beforeAll(async () => {
  // Clean database before tests
  await prisma.summary.deleteMany();
  await prisma.voiceNote.deleteMany();
  await prisma.patient.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('API Integration Tests', () => {
  describe('Health Endpoints', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Patients', () => {
    let patientId: string;

    beforeAll(async () => {
      const patient = await request(app)
        .post('/api/patients')
        .set('x-api-key', API_KEY)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-15',
        });
      patientId = patient.body.data.id;
    });

    it('should get a patient by id', async () => {
      const res = await request(app)
        .get(`/api/patients/${patientId}`)
        .set('x-api-key', API_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(patientId);
    });

    it('should update a patient', async () => {
      const res = await request(app)
        .patch(`/api/patients/${patientId}`)
        .set('x-api-key', API_KEY)
        .send({
          email: 'john.updated@example.com',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('john.updated@example.com');
    });

    it('should validate patient data', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('x-api-key', API_KEY)
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          dateOfBirth: 'invalid-date',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should delete a patient', async () => {
      const patient = await request(app)
        .post('/api/patients')
        .set('x-api-key', API_KEY)
        .send({
          firstName: 'ToDelete',
          lastName: 'Patient',
          dateOfBirth: '1995-03-10',
        });

      const res = await request(app)
        .delete(`/api/patients/${patient.body.data.id}`)
        .set('x-api-key', API_KEY);

      expect(res.status).toBe(204);
    });
  });

  describe('Voice Notes', () => {
    let patientId: string;
    let voiceNoteId: string;

    beforeAll(async () => {
      const patient = await request(app)
        .post('/api/patients')
        .set('x-api-key', API_KEY)
        .send({
          firstName: 'Test',
          lastName: 'Patient',
          dateOfBirth: '1985-05-20',
        });
      patientId = patient.body.data.id;
    });

    it('should create a voice note for a patient', async () => {
      const res = await request(app)
        .post('/api/voice-notes')
        .set('x-api-key', API_KEY)
        .send({
          patientId,
          doctorId: '123e4567-e89b-12d3-a456-426614174000',
          duration: 180,
          recordedAt: new Date().toISOString(),
          status: 'pending',
          fileSize: 2048,
          format: 'wav',
          location: 'storage/test.wav',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.patientId).toBe(patientId);
      expect(res.body.data.patient).toBeDefined();
      voiceNoteId = res.body.data.id;
    });

    it('should reject voice note for non-existent patient', async () => {
      const res = await request(app)
        .post('/api/voice-notes')
        .set('x-api-key', API_KEY)
        .send({
          patientId: '123e4567-e89b-12d3-a456-426614174999',
          doctorId: '123e4567-e89b-12d3-a456-426614174000',
          duration: 180,
          recordedAt: new Date().toISOString(),
          status: 'pending',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Patient does not exist');
    });

    it('should filter voice notes by patient', async () => {
      const res = await request(app)
        .get(`/api/voice-notes?patientId=${patientId}`)
        .set('x-api-key', API_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data.every((vn: any) => vn.patientId === patientId)).toBe(
        true
      );
    });

    it('should get voice note with relations', async () => {
      const res = await request(app)
        .get(`/api/voice-notes/${voiceNoteId}`)
        .set('x-api-key', API_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data.patient).toBeDefined();
      expect(res.body.data.summaries).toBeDefined();
    });

    it('should update voice note status', async () => {
      const res = await request(app)
        .patch(`/api/voice-notes/${voiceNoteId}`)
        .set('x-api-key', API_KEY)
        .send({
          status: 'transcribed',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('transcribed');
    });
  });

  describe('Summaries', () => {
    let voiceNoteId: string;
    let summaryId: string;

    beforeAll(async () => {
      const patient = await request(app)
        .post('/api/patients')
        .set('x-api-key', API_KEY)
        .send({
          firstName: 'Summary',
          lastName: 'Test',
          dateOfBirth: '1980-03-10',
        });

      const voiceNote = await request(app)
        .post('/api/voice-notes')
        .set('x-api-key', API_KEY)
        .send({
          patientId: patient.body.data.id,
          doctorId: '123e4567-e89b-12d3-a456-426614174000',
          duration: 300,
          recordedAt: new Date().toISOString(),
          status: 'transcribed',
        });
      voiceNoteId = voiceNote.body.data.id;
    });

    it('should create a summary for a voice note', async () => {
      const res = await request(app)
        .post('/api/summaries')
        .set('x-api-key', API_KEY)
        .send({
          voiceNoteId,
          content:
            'Patient reports headache and fatigue. Prescribed rest and hydration.',
          keyPoints: ['Headache', 'Fatigue'],
          recommendations: ['Rest', 'Hydration', 'Follow-up in 1 week'],
          generatedAt: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.voiceNoteId).toBe(voiceNoteId);
      expect(res.body.data.keyPoints).toHaveLength(2);
      expect(res.body.data.recommendations).toHaveLength(3);
      expect(res.body.data.voiceNote).toBeDefined();
      summaryId = res.body.data.id;
    });

    it('should validate summary content length', async () => {
      const res = await request(app)
        .post('/api/summaries')
        .set('x-api-key', API_KEY)
        .send({
          voiceNoteId,
          content: 'Short',
          generatedAt: new Date().toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should reject summary for non-existent voice note', async () => {
      const res = await request(app)
        .post('/api/summaries')
        .set('x-api-key', API_KEY)
        .send({
          voiceNoteId: '123e4567-e89b-12d3-a456-426614174999',
          content: 'This should fail because voice note does not exist',
          generatedAt: new Date().toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Voice note does not exist');
    });

    it('should filter summaries by voice note', async () => {
      const res = await request(app)
        .get(`/api/summaries?voiceNoteId=${voiceNoteId}`)
        .set('x-api-key', API_KEY);

      expect(res.status).toBe(200);
      expect(
        res.body.data.every((s: any) => s.voiceNoteId === voiceNoteId)
      ).toBe(true);
    });

    it('should get summary with nested relations', async () => {
      const res = await request(app)
        .get(`/api/summaries/${summaryId}`)
        .set('x-api-key', API_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data.voiceNote).toBeDefined();
      expect(res.body.data.voiceNote.patient).toBeDefined();
    });
  });

  describe('Cascade Deletion', () => {
    it('should cascade delete voice notes when patient is deleted', async () => {
      const patient = await request(app)
        .post('/api/patients')
        .set('x-api-key', API_KEY)
        .send({
          firstName: 'Cascade',
          lastName: 'Test',
          dateOfBirth: '1992-07-15',
        });

      const voiceNote = await request(app)
        .post('/api/voice-notes')
        .set('x-api-key', API_KEY)
        .send({
          patientId: patient.body.data.id,
          doctorId: '123e4567-e89b-12d3-a456-426614174000',
          duration: 120,
          recordedAt: new Date().toISOString(),
          status: 'pending',
        });

      // Delete patient
      await request(app)
        .delete(`/api/patients/${patient.body.data.id}`)
        .set('x-api-key', API_KEY);

      // Voice note should also be deleted
      const res = await request(app)
        .get(`/api/voice-notes/${voiceNote.body.data.id}`)
        .set('x-api-key', API_KEY);

      expect(res.status).toBe(404);
    });
  });
});
