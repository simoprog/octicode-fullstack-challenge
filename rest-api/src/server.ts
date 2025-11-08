import express from 'express';
import { apiKeyAuth } from './middleware/auth';
import { rateLimiter } from './middleware/rate-limitter';
import { httpLogger, logger } from './middleware/logger';
import { createPatientsRouter } from './routes/patients';
import { createVoiceNotesRouter } from './routes/voiceNotes';
import { createSummariesRouter } from './routes/summaries';
import { createHealthRouter } from './routes/health';
import prisma from './db';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(httpLogger);

// Health endpoints (no auth required)
app.use('/health', createHealthRouter());

// API routes (auth required)
app.use('/api', apiKeyAuth, rateLimiter);
app.use('/api/patients', createPatientsRouter());
app.use('/api/voice-notes', createVoiceNotesRouter());
app.use('/api/summaries', createSummariesRouter());

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error(err, 'Unhandled error');
    res.status(500).json({ error: 'Internal server error' });
  }
);

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server...');
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;
