import { Router } from 'express';
import prisma from '../db.js';
import { CreatePatientSchema, UpdatePatientSchema } from '../types.js';

export const createPatientsRouter = () => {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const patients = await prisma.patient.findMany({
        orderBy: { createdAt: 'desc' },
      });
      res.json({ data: patients, count: patients.length });
    } catch (error) {
      req.log.error(error, 'Failed to fetch patients');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const patient = await prisma.patient.findUnique({
        where: { id: req.params.id },
        include: {
          voiceNotes: {
            orderBy: { recordedAt: 'desc' },
          },
        },
      });

      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      res.json({ data: patient });
    } catch (error) {
      req.log.error(error, 'Failed to fetch patient');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const validated = CreatePatientSchema.parse(req.body);

      const patient = await prisma.patient.create({
        data: {
          firstName: validated.firstName,
          lastName: validated.lastName,
          dateOfBirth: validated.dateOfBirth.toISOString(),
          email: validated.email ?? null,
          phone: validated.phone ?? null,
        },
      });

      res.status(201).json({ data: patient });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return res
          .status(400)
          .json({ error: 'Validation failed', details: error });
      }
      req.log.error(error, 'Failed to create patient');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.patch('/:id', async (req, res) => {
    try {
      const validated = UpdatePatientSchema.parse(req.body);

      const patient = await prisma.patient.update({
        where: { id: req.params.id },
        data: {
          ...(validated.firstName ? { firstName: validated.firstName } : {}),
          ...(validated.lastName ? { lastName: validated.lastName } : {}),
          ...(validated.dateOfBirth
            ? { dateOfBirth: validated.dateOfBirth.toISOString() }
            : {}),
          ...(validated.email ? { email: validated.email } : {}),
          ...(validated.phone ? { phone: validated.phone } : {}),
        },
      });

      res.json({ data: patient });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return res
          .status(400)
          .json({ error: 'Validation failed', details: error });
      }
      if (
        error instanceof Error &&
        error.message.includes('Record to update not found')
      ) {
        return res.status(404).json({ error: 'Patient not found' });
      }
      req.log.error(error, 'Failed to update patient');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await prisma.patient.delete({
        where: { id: req.params.id },
      });

      res.status(204).send();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Record to delete does not exist')
      ) {
        return res.status(404).json({ error: 'Patient not found' });
      }
      req.log.error(error, 'Failed to delete patient');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
