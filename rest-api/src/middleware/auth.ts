import { Request, Response, NextFunction } from 'express';

const VALID_API_KEYS = new Set(['demo-key-12345', 'test-key-67890']);

export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey || !VALID_API_KEYS.has(apiKey)) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  next();
};
