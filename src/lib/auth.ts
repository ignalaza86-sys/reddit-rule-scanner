/**
 * Simple authentication & usage-tracking system for the Reddit Rule Scanner.
 *
 * This module works WITHOUT a real auth provider (Clerk, etc.) by using
 * anonymous IDs generated on the client and stored in localStorage.
 *
 * Usage limits:
 *   Free tier — 5 searches/day, 3 rules loads/day, 0 exports
 *   Pro tier  — unlimited everything
 */

import { db } from '@/lib/db';

// ── Tier definitions ────────────────────────────────────────────────────────

export type Plan = 'free' | 'pro';
export type Action = 'search' | 'rules' | 'export' | 'trends';

interface TierLimit {
  daily: number; // max actions per day (Infinity = unlimited)
}

const FREE_LIMITS: Record<Action, TierLimit> = {
  search: { daily: 5 },
  rules:  { daily: 3 },
  export: { daily: 0 },
  trends: { daily: Infinity }, // no explicit limit for trends on free
};

const PRO_LIMITS: Record<Action, TierLimit> = {
  search: { daily: Infinity },
  rules:  { daily: Infinity },
  export: { daily: Infinity },
  trends: { daily: Infinity },
};

function limitsForPlan(plan: Plan): Record<Action, TierLimit> {
  return plan === 'pro' ? PRO_LIMITS : FREE_LIMITS;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Return the start of today (midnight UTC) as a Date for querying.
 */
function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Validate that an action string is one of the known actions.
 */
function isValidAction(action: string): action is Action {
  return ['search', 'rules', 'export', 'trends'].includes(action);
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Find an existing user by their anonymous ID, or create a new one.
 * This is the main entry-point called from the API route when the client
 * sends its localStorage-generated `anonId`.
 */
export async function getOrCreateUser(anonId: string) {
  // Try to find existing user
  const existing = await db.user.findUnique({ where: { anonId } });
  if (existing) return existing;

  // Create a new user with the free plan
  return db.user.create({
    data: {
      anonId,
      plan: 'free',
    },
  });
}

/**
 * Check whether a user can perform the given action today.
 * Returns `{ allowed: boolean, remaining: number, limit: number }`.
 */
export async function checkUsageLimit(
  userId: string,
  action: string,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  if (!isValidAction(action)) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  const plan = user.plan as Plan;
  const limits = limitsForPlan(plan);
  const limit = limits[action].daily;

  // Pro users have no limits
  if (limit === Infinity) {
    return { allowed: true, remaining: Infinity, limit: Infinity };
  }

  // Count today's usage for this action
  const todayStart = startOfToday();
  const todayCount = await db.usage.count({
    where: {
      userId,
      action,
      createdAt: { gte: todayStart },
    },
  });

  const remaining = Math.max(0, limit - todayCount);
  const allowed = todayCount < limit;

  return { allowed, remaining, limit };
}

/**
 * Record a usage action for the given user.
 * Callers should check `checkUsageLimit` first; this function does NOT
 * enforce the limit itself (that happens at the API layer).
 */
export async function recordUsage(
  userId: string,
  action: string,
  detail?: string,
) {
  if (!isValidAction(action)) {
    throw new Error(`Invalid action: ${action}`);
  }

  return db.usage.create({
    data: {
      userId,
      action,
      detail: detail ?? null,
    },
  });
}

/**
 * Get the user's current plan.
 */
export async function getUserPlan(userId: string): Promise<Plan> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return 'free';
  return user.plan as Plan;
}

/**
 * Upgrade a user to the pro plan.
 */
export async function upgradeToPro(userId: string, email?: string) {
  const data: { plan: string; email?: string } = { plan: 'pro' };
  if (email) data.email = email;

  return db.user.update({
    where: { id: userId },
    data,
  });
}

/**
 * Get a summary of today's usage for a user, including limits.
 */
export async function getUsageSummary(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const plan = user.plan as Plan;
  const limits = limitsForPlan(plan);
  const todayStart = startOfToday();

  const actions: Action[] = ['search', 'rules', 'export', 'trends'];

  const usageCounts = await Promise.all(
    actions.map(async (action) => {
      const count = await db.usage.count({
        where: { userId, action, createdAt: { gte: todayStart } },
      });
      const limit = limits[action].daily;
      return {
        action,
        count,
        limit,
        remaining: limit === Infinity ? Infinity : Math.max(0, limit - count),
        allowed: limit === Infinity ? true : count < limit,
      };
    }),
  );

  return {
    userId: user.id,
    anonId: user.anonId,
    plan,
    email: user.email,
    usage: usageCounts,
  };
}
