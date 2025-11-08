import { Router } from 'express';
import prisma from '../db.js';
import { CreateVoiceNoteSchema } from '../types.js';

export const createVoiceNotesRouter = () => {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const patientId = req.query.patientId as string | undefined;

      const voiceNotes = await prisma.voiceNote.findMany({
        ...(patientId ? { where: { patientId } } : {}),
        include: {
          patient: true,
        },
        orderBy: { recordedAt: 'desc' },
      });

      res.json({ data: voiceNotes, count: voiceNotes.length });
    } catch (error) {
      req.log.error(error, 'Failed to fetch voice notes');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const voiceNote = await prisma.voiceNote.findUnique({
        where: { id: req.params.id },
        include: {
          patient: true,
          summaries: true,
        },
      });

      if (!voiceNote) {
        return res.status(404).json({ error: 'Voice note not found' });
      }

      res.json({ data: voiceNote });
    } catch (error) {
      req.log.error(error, 'Failed to fetch voice note');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const validated = CreateVoiceNoteSchema.parse(req.body);

      // Check if patient exists
      const patient = await prisma.patient.findUnique({
        where: { id: validated.patientId },
      });

      if (!patient) {
        return res.status(400).json({ error: 'Patient does not exist' });
      }

      const voiceNote = await prisma.voiceNote.create({
        data: {
          ...validated,
          recordedAt: new Date(validated.recordedAt),
        },
        include: {
          patient: true,
        },
      });

      res.status(201).json({ data: voiceNote });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return res
          .status(400)
          .json({ error: 'Validation failed', details: error });
      }
      req.log.error(error, 'Failed to create voice note');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.patch('/:id', async (req, res) => {
    try {
      const voiceNote = await prisma.voiceNote.update({
        where: { id: req.params.id },
        data: req.body,
        include: {
          patient: true,
        },
      });

      res.json({ data: voiceNote });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Record to update not found')
      ) {
        return res.status(404).json({ error: 'Voice note not found' });
      }
      req.log.error(error, 'Failed to update voice note');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
