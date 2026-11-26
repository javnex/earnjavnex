/**
 * Organic Star Rating Balancer for Google Maps Campaigns
 * Computes a natural, human-looking distribution of 3, 4, and 5 star reviews
 * such that the overall campaign average precisely hits the Admin's target rating (e.g. 4.2).
 */

export interface StarDistribution {
  total: number;
  targetRating: number;
  actualAverage: number;
  counts: { 3: number; 4: number; 5: number };
  ratings: number[];
}

/**
 * Calculates the exact counts of 3, 4, and 5 star reviews required
 * to achieve the target average rating across totalReviews.
 */
export function computeStarDistribution(
  totalReviews: number,
  targetRating: number = 4.5
): StarDistribution {
  const N = Math.max(1, totalReviews);
  const target = Math.min(5.0, Math.max(3.0, Number(targetRating) || 4.5));
  const targetSum = Math.round(N * target);

  let bestN3 = 0,
    bestN4 = 0,
    bestN5 = 0;
  let bestScore = -Infinity;

  for (let n5 = 0; n5 <= N; n5++) {
    for (let n4 = 0; n4 <= N - n5; n4++) {
      const n3 = N - n5 - n4;
      const currentSum = 3 * n3 + 4 * n4 + 5 * n5;
      const diff = Math.abs(currentSum - targetSum);

      if (diff === 0) {
        // Natural distribution scoring:
        // Realistic campaigns have a balanced presence of 3, 4, and 5 stars.
        let score = 1000;
        if (n3 > 0) score += 50;
        if (n4 > 0) score += 100;
        if (n5 > 0) score += 100;

        if (target >= 4.0) {
          if (n5 >= n4 && n4 >= n3) score += 250;
          score += n5 * 3 + n4;
        } else {
          score += n4 * 2 + n3;
        }

        if (score > bestScore) {
          bestScore = score;
          bestN3 = n3;
          bestN4 = n4;
          bestN5 = n5;
        }
      }
    }
  }

  // Fallback for rare rounding mismatches
  if (bestScore === -Infinity) {
    bestN3 = Math.round(N * 0.2);
    bestN4 = Math.round(N * 0.4);
    bestN5 = Math.max(0, N - bestN3 - bestN4);
  }

  const ratings = [
    ...Array(bestN3).fill(3),
    ...Array(bestN4).fill(4),
    ...Array(bestN5).fill(5),
  ];

  const actualAvg = (3 * bestN3 + 4 * bestN4 + 5 * bestN5) / N;

  return {
    total: N,
    targetRating: target,
    actualAverage: Number(actualAvg.toFixed(2)),
    counts: { 3: bestN3, 4: bestN4, 5: bestN5 },
    ratings,
  };
}

/**
 * Deterministic pseudo-random string hash (djb2)
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash >>> 0);
}

/**
 * Shuffles an array deterministically using a seed string (Fisher-Yates)
 */
function seededShuffle<T>(array: T[], seed: string): T[] {
  const result = [...array];
  let currentSeed = hashString(seed);

  for (let i = result.length - 1; i > 0; i--) {
    // Linear congruential generator step
    currentSeed = (currentSeed * 1664525 + 1013904223) >>> 0;
    const j = currentSeed % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Assigns an exact star rating (3, 4, or 5) to a specific user for a given task.
 * The overall assignment across all slots in the task will perfectly hit the targetRating.
 */
export function getAssignedStarRating(params: {
  taskId: string;
  userId: string;
  totalReviews: number;
  targetRating: number;
}): {
  rating: 3 | 4 | 5;
  targetRating: number;
  distribution: { 3: number; 4: number; 5: number };
} {
  const { taskId, userId, totalReviews, targetRating } = params;
  const dist = computeStarDistribution(totalReviews, targetRating);
  const shuffledRatings = seededShuffle(dist.ratings, taskId);

  // Compute a deterministic slot index for this user
  const userHash = hashString(`${taskId}-${userId}`);
  const slotIndex = userHash % shuffledRatings.length;
  const assigned = (shuffledRatings[slotIndex] as 3 | 4 | 5) || 5;

  return {
    rating: assigned,
    targetRating: dist.targetRating,
    distribution: dist.counts,
  };
}

/**
 * Extracts the target rating configured for a task.
 * Checks instructions prefix [TargetRating: X.X] or returns default 4.5.
 */
export function extractTaskTargetRating(task?: {
  instructions?: string;
  targetRating?: number;
}): number {
  if (task?.targetRating && task.targetRating >= 3.0 && task.targetRating <= 5.0) {
    return task.targetRating;
  }

  if (task?.instructions) {
    const match = task.instructions.match(/\[TargetRating:\s*([0-9.]+)\]/i);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val >= 3.0 && val <= 5.0) {
        return val;
      }
    }
  }

  return 4.5;
}

/**
 * Formats task instructions with target rating and daily velocity limit prefixes for storage.
 */
export function formatTaskInstructions(
  rawInstructions: string,
  targetRating: number = 4.5,
  dailyLimit: number = 2
): string {
  const clean = rawInstructions
    .replace(/\[TargetRating:\s*[0-9.]+\]\s*/gi, "")
    .replace(/\[DailyLimit:\s*[0-9]+\]\s*/gi, "")
    .trim();
  const validRating = Math.min(5.0, Math.max(3.0, Number(targetRating) || 4.5));
  const validDailyLimit = Math.max(1, Number(dailyLimit) || 2);
  return `[TargetRating: ${validRating.toFixed(1)}] [DailyLimit: ${validDailyLimit}] ${clean}`;
}

/**
 * Extracts the daily velocity limit (drip-feed cap) configured for a task.
 * For businesses with 50-200 reviews, defaults to 2 reviews/day to prevent Google spam locks.
 */
export function extractTaskDailyLimit(task?: {
  instructions?: string;
  dailyLimit?: number;
}): number {
  if (task?.dailyLimit && task.dailyLimit >= 1) {
    return task.dailyLimit;
  }

  if (task?.instructions) {
    const match = task.instructions.match(/\[DailyLimit:\s*([0-9]+)\]/i);
    if (match && match[1]) {
      const val = parseInt(match[1], 10);
      if (!isNaN(val) && val >= 1) {
        return val;
      }
    }
  }

  // Safe natural velocity default for 50-200 review profiles: 2 reviews/day
  return 2;
}

/**
 * Strips internal metadata tags ([TargetRating: X.X] [DailyLimit: X]) from instructions for clean user display.
 */
export function cleanTaskInstructions(instructions?: string): string {
  if (!instructions) return "";
  return instructions
    .replace(/\[TargetRating:\s*[0-9.]+\]\s*/gi, "")
    .replace(/\[DailyLimit:\s*[0-9]+\]\s*/gi, "")
    .trim();
}
