import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser, upgradeToPro } from '@/lib/auth';

/**
 * GET /api/auth?anonId=<string>
 * Get or create a user by their anonymous ID.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const anonId = searchParams.get('anonId');

    if (!anonId) {
      return NextResponse.json(
        { error: 'Missing anonId query parameter' },
        { status: 400 },
      );
    }

    const user = await getOrCreateUser(anonId);

    return NextResponse.json({
      id: user.id,
      anonId: user.anonId,
      email: user.email,
      name: user.name,
      plan: user.plan,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('[Auth API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get or create user' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/auth
 * Upgrade a user to pro plan.
 *
 * Body: { userId: string, email?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email } = body as { userId?: string; email?: string };

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId in request body' },
        { status: 400 },
      );
    }

    const updatedUser = await upgradeToPro(userId, email);

    return NextResponse.json({
      id: updatedUser.id,
      anonId: updatedUser.anonId,
      email: updatedUser.email,
      name: updatedUser.name,
      plan: updatedUser.plan,
      updatedAt: updatedUser.updatedAt,
    });
  } catch (error) {
    console.error('[Auth API] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to upgrade user' },
      { status: 500 },
    );
  }
}
