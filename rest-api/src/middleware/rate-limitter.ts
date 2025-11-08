import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT = 100;
const WINDOW_MS = 15 * 60 * 1000;

export const rateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'] as string;
  const now = Date.now();

  const entry = rateLimitStore.get(apiKey);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(apiKey, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
    return next();
  }

  if (entry.count >= RATE_LIMIT) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    });
  }

  entry.count++;
  next();
};
