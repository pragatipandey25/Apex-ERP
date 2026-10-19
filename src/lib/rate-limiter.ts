interface AttemptRecord {
  count: number;
  resetAt: number;
}

const attemptsMap = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Checks if the key (e.g. IP or email) has exceeded rate limits.
 * Returns { allowed: boolean, remainingAttempts: number, retryAfterSec: number }
 */
export function checkRateLimit(key: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSec: number;
} {
  const now = Date.now();
  const record = attemptsMap.get(key);

  if (!record || now > record.resetAt) {
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
      retryAfterSec: 0,
    };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSec,
    };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - record.count,
    retryAfterSec: 0,
  };
}

/**
 * Records a failed attempt for a given key.
 */
export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const record = attemptsMap.get(key);

  if (!record || now > record.resetAt) {
    attemptsMap.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
  } else {
    record.count += 1;
  }
}

/**
 * Resets rate limit records upon successful login.
 */
export function resetRateLimit(key: string): void {
  attemptsMap.delete(key);
}
