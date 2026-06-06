import { NextRequest, NextResponse } from 'next/server';
import { checkUsageLimit, recordUsage, getUsageSummary } from '@/lib/auth';

/**
 * GET /api/usage?userId=<string>
 * Get today's usage stats, limits, and plan for a user.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId query parameter' },
        { status: 400 },
      );
    }

    const summary = await getUsageSummary(userId);

    if (!summary) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[Usage API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get usage stats' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/usage
 * Record a usage action for a user. Checks limits first and returns an
 * error if the limit has been exceeded.
 *
 * Body: { userId: string, action: string, detail?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, detail } = body as {
      userId?: string;
      action?: string;
      detail?: string;
    };

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing userId or action in request body' },
        { status: 400 },
      );
    }

    // Check limit first
    const limitCheck = await checkUsageLimit(userId, action);

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Usage limit exceeded',
          action,
          limit: limitCheck.limit,
          remaining: limitCheck.remaining,
        },
        { status: 429 },
      );
    }

    // Record the usage
    const usage = await recordUsage(userId, action, detail);

    return NextResponse.json({
      id: usage.id,
      action: usage.action,
      detail: usage.detail,
      createdAt: usage.createdAt,
      remaining: limitCheck.remaining === Infinity ? Infinity : limitCheck.remaining - 1,
    });
  } catch (error) {
    console.error('[Usage API] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to record usage' },
      { status: 500 },
    );
  }
}
