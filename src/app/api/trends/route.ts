import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CACHE_TTL } from '@/lib/cache';

// Demo trend data - always available instantly
const DEMO_TRENDS = [
  { fetishName: 'Feet ASMR', category: 'Feet + ASMR', growthPercent: 285, memberCount: 19000, competitionLevel: 'baja', opportunityScore: 92, isEmerging: true, subredditName: 'feetasmr' },
  { fetishName: 'Sensory Deprivation', category: 'Bondage', growthPercent: 180, memberCount: 23000, competitionLevel: 'baja', opportunityScore: 88, isEmerging: true, subredditName: 'sensorydeprivation' },
  { fetishName: 'Shoe Dangling', category: 'Feet', growthPercent: 165, memberCount: 28000, competitionLevel: 'baja', opportunityScore: 85, isEmerging: true, subredditName: 'shoedangling' },
  { fetishName: 'Crypto Findom', category: 'Findom + Crypto', growthPercent: 220, memberCount: 18000, competitionLevel: 'media', opportunityScore: 78, isEmerging: true, subredditName: 'cryptofindom' },
  { fetishName: 'Giantess POV', category: 'Roleplay', growthPercent: 145, memberCount: 34000, competitionLevel: 'media', opportunityScore: 74, isEmerging: true, subredditName: 'giantesspov' },
  { fetishName: 'Mouth Sounds', category: 'ASMR', growthPercent: 130, memberCount: 45000, competitionLevel: 'media', opportunityScore: 71, isEmerging: true, subredditName: 'mouthsounds' },
  { fetishName: 'Pedicure Content', category: 'Feet', growthPercent: 95, memberCount: 89000, competitionLevel: 'media', opportunityScore: 68, isEmerging: false, subredditName: 'paintedtoes' },
  { fetishName: 'Cosplay Findom', category: 'Cosplay + Findom', growthPercent: 110, memberCount: 12000, competitionLevel: 'baja', opportunityScore: 82, isEmerging: true, subredditName: 'cosplayfindom' },
  { fetishName: 'Smoking Fetish', category: 'Smoking', growthPercent: 88, memberCount: 78000, competitionLevel: 'alta', opportunityScore: 55, isEmerging: false, subredditName: 'smokingfetish' },
  { fetishName: 'Yoga Pants Worship', category: 'Fitness', growthPercent: 75, memberCount: 567000, competitionLevel: 'alta', opportunityScore: 48, isEmerging: false, subredditName: 'girlsinyogapants' },
  { fetishName: 'Body Paint', category: 'Art + NSFW', growthPercent: 120, memberCount: 45000, competitionLevel: 'baja', opportunityScore: 79, isEmerging: true, subredditName: 'bodypaint' },
  { fetishName: 'Latex Fashion', category: 'Latex', growthPercent: 65, memberCount: 234000, competitionLevel: 'media', opportunityScore: 62, isEmerging: false, subredditName: 'latex' },
  { fetishName: 'Chastity Tease', category: 'Femdom', growthPercent: 195, memberCount: 145000, competitionLevel: 'media', opportunityScore: 76, isEmerging: true, subredditName: 'chastity' },
  { fetishName: 'Nail Fetish', category: 'Hands + Nails', growthPercent: 140, memberCount: 28000, competitionLevel: 'baja', opportunityScore: 80, isEmerging: true, subredditName: 'nailfetish' },
  { fetishName: 'Hair Fetish', category: 'Hair', growthPercent: 88, memberCount: 34000, competitionLevel: 'baja', opportunityScore: 72, isEmerging: false, subredditName: 'hairfetish' },
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category') || '';
  const limit = parseInt(searchParams.get('limit') || '12');

  try {
    // Check memory cache first (fastest path)
    const cacheKey = `trends:${category || 'all'}:${limit}`;
    const cachedResult = cache.get<{ trends: any[]; cached: boolean }>(cacheKey);
    if (cachedResult) {
      return NextResponse.json({ ...cachedResult, source: 'cache' });
    }

    // 1. Check cached trends first (fast path)
    try {
      const cachedTrends = await db.trend.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
          ...(category ? { category: { contains: category } } : {}),
        },
        include: { subreddit: true },
        orderBy: { growthPercent: 'desc' },
        take: limit,
      });

      if (cachedTrends.length > 0) {
        const dbResult = { trends: cachedTrends, cached: true };
        cache.set(cacheKey, dbResult, CACHE_TTL.trends);
        return NextResponse.json(dbResult);
      }
    } catch (dbErr) {
      console.error('DB read error (non-fatal):', dbErr);
    }

    // 2. Use demo data instantly (no Reddit API or AI call needed)
    let trendsToSave = category
      ? DEMO_TRENDS.filter(t =>
          t.fetishName.toLowerCase().includes(category.toLowerCase()) ||
          t.category.toLowerCase().includes(category.toLowerCase())
        )
      : DEMO_TRENDS;

    // If filter returned nothing, return all
    if (trendsToSave.length === 0) trendsToSave = DEMO_TRENDS;

    // 3. Try to save to DB for caching (non-blocking)
    const savedTrends: any[] = [];
    for (const trend of trendsToSave.slice(0, limit)) {
      try {
        let sub = await db.subreddit.findUnique({ where: { name: trend.subredditName?.toLowerCase() } });
        if (!sub) {
          sub = await db.subreddit.create({
            data: { name: trend.subredditName?.toLowerCase() || `unknown_${Date.now()}`, displayName: trend.fetishName, subscribers: trend.memberCount || 0, over18: true },
          });
        }
        const saved = await db.trend.create({
          data: {
            subredditId: sub.id,
            fetishName: trend.fetishName,
            category: trend.category,
            growthPercent: trend.growthPercent || 0,
            memberCount: trend.memberCount || sub.subscribers,
            opportunityScore: trend.opportunityScore || 50,
            competitionLevel: trend.competitionLevel || 'unknown',
            isEmerging: trend.isEmerging || false,
            weekDetected: new Date().toISOString().split('T')[0],
          },
        });
        savedTrends.push({ ...saved, subreddit: sub });
      } catch (e) {
        // Skip on DB error, just return the raw trend
        savedTrends.push({ ...trend, id: `demo-${Date.now()}-${Math.random()}`, subreddit: { name: trend.subredditName, displayName: trend.fetishName, subscribers: trend.memberCount || 0 } });
      }
    }

    return NextResponse.json({ trends: savedTrends, cached: false });
  } catch (error: any) {
    console.error('Trends error:', error);
    // NEVER return 500 - always return demo data
    const fallbackTrends = DEMO_TRENDS.slice(0, limit).map((t, i) => ({
      ...t, id: `fb-${i}`,
      subreddit: { name: t.subredditName, displayName: t.fetishName, subscribers: t.memberCount || 0 },
    }));
    return NextResponse.json({ trends: fallbackTrends, cached: false });
  }
}
