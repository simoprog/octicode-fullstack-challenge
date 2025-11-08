import { Router } from 'express';
import prisma from '../db';
import { CreateSummarySchema } from '../types';

export const createSummariesRouter = () => {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const voiceNoteId = req.query.voiceNoteId as string | undefined;

      const summaries = await prisma.summary.findMany({
        ...(voiceNoteId ? { where: { voiceNoteId } } : {}),
        include: {
          voiceNote: {
            include: {
              patient: true,
            },
          },
        },
        orderBy: { generatedAt: 'desc' },
      });

      // Parse JSON fields
      const parsedSummaries = summaries.map((s) => ({
        ...s,
        keyPoints: s.keyPoints ? JSON.parse(s.keyPoints) : null,
        recommendations: s.recommendations
          ? JSON.parse(s.recommendations)
          : null,
      }));

      res.json({ data: parsedSummaries, count: parsedSummaries.length });
    } catch (error) {
      req.log.error(error, 'Failed to fetch summaries');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const summary = await prisma.summary.findUnique({
        where: { id: req.params.id },
        include: {
          voiceNote: {
            include: {
              patient: true,
            },
          },
        },
      });

      if (!summary) {
        return res.status(404).json({ error: 'Summary not found' });
      }

      // Parse JSON fields
      const parsedSummary = {
        ...summary,
        keyPoints: summary.keyPoints ? JSON.parse(summary.keyPoints) : null,
        recommendations: summary.recommendations
          ? JSON.parse(summary.recommendations)
          : null,
      };

      res.json({ data: parsedSummary });
    } catch (error) {
      req.log.error(error, 'Failed to fetch summary');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const validated = CreateSummarySchema.parse(req.body);

      // Check if voice note exists
      const voiceNote = await prisma.voiceNote.findUnique({
        where: { id: validated.voiceNoteId },
      });

      if (!voiceNote) {
        return res.status(400).json({ error: 'Voice note does not exist' });
      }

      const summary = await prisma.summary.create({
        data: {
          voiceNoteId: validated.voiceNoteId,
          content: validated.content,
          keyPoints: validated.keyPoints
            ? JSON.stringify(validated.keyPoints)
            : null,
          recommendations: validated.recommendations
            ? JSON.stringify(validated.recommendations)
            : null,
          generatedAt: new Date(validated.generatedAt),
        },
        include: {
          voiceNote: {
            include: {
              patient: true,
            },
          },
        },
      });

      // Parse JSON fields for response
      const parsedSummary = {
        ...summary,
        keyPoints: summary.keyPoints ? JSON.parse(summary.keyPoints) : null,
        recommendations: summary.recommendations
          ? JSON.parse(summary.recommendations)
          : null,
      };

      res.status(201).json({ data: parsedSummary });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return res
          .status(400)
          .json({ error: 'Validation failed', details: error });
      }
      req.log.error(error, 'Failed to create summary');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
