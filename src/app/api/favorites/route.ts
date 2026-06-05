import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List all favorites
export async function GET() {
  try {
    const favorites = await db.favorite.findMany({
      include: { subreddit: { include: { rules: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ favorites });
  } catch (error: any) {
    console.error('Favorites GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Add a favorite
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subredditId, note, tags } = body;

    if (!subredditId) {
      return NextResponse.json({ error: 'subredditId is required' }, { status: 400 });
    }

    // Check if already favorited
    const existing = await db.favorite.findFirst({
      where: { subredditId },
    });

    if (existing) {
      // Update note/tags
      const updated = await db.favorite.update({
        where: { id: existing.id },
        data: { note: note || existing.note, tags: tags || existing.tags },
      });
      return NextResponse.json({ favorite: updated, wasUpdate: true });
    }

    const favorite = await db.favorite.create({
      data: { subredditId, note: note || '', tags: tags || '' },
    });

    return NextResponse.json({ favorite, wasUpdate: false });
  } catch (error: any) {
    console.error('Favorites POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add favorite', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove a favorite
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const subredditId = searchParams.get('subredditId');

    if (!id && !subredditId) {
      return NextResponse.json({ error: 'id or subredditId required' }, { status: 400 });
    }

    if (subredditId) {
      await db.favorite.deleteMany({ where: { subredditId } });
    } else if (id) {
      await db.favorite.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Favorites DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to remove favorite', details: error.message },
      { status: 500 }
    );
  }
}
