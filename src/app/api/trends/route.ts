import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CACHE_TTL } from '@/lib/cache';

// Demo trend data — ALL subreddits verified active 2025
const DEMO_TRENDS = [
  { fetishName: 'Chastity Tease & Denial', category: 'Femdom + Chastity', growthPercent: 195, memberCount: 486000, competitionLevel: 'media', opportunityScore: 92, isEmerging: true, subredditName: 'chastity' },
  { fetishName: 'Goth NSFW Content', category: 'Goth + Alt', growthPercent: 180, memberCount: 2679000, competitionLevel: 'media', opportunityScore: 88, isEmerging: true, subredditName: 'gothsluts' },
  { fetishName: 'Hotwife Lifestyle', category: 'Hotwife', growthPercent: 165, memberCount: 1961000, competitionLevel: 'alta', opportunityScore: 75, isEmerging: false, subredditName: 'Hotwife' },
  { fetishName: 'Verified Feet Content', category: 'Feet', growthPercent: 155, memberCount: 514000, competitionLevel: 'baja', opportunityScore: 85, isEmerging: true, subredditName: 'VerifiedFeet' },
  { fetishName: 'Chastity Training', category: 'Femdom + Chastity', growthPercent: 150, memberCount: 143000, competitionLevel: 'baja', opportunityScore: 82, isEmerging: true, subredditName: 'chastitytraining' },
  { fetishName: 'OnlyFans Promo Strategy', category: 'OnlyFans', growthPercent: 145, memberCount: 2924000, competitionLevel: 'alta', opportunityScore: 70, isEmerging: false, subredditName: 'OnlyFans101' },
  { fetishName: 'Audio JOI & ASMR', category: 'ASMR + JOI', growthPercent: 130, memberCount: 2160000, competitionLevel: 'media', opportunityScore: 78, isEmerging: true, subredditName: 'GoneWildAudio' },
  { fetishName: 'Smoking Fetish', category: 'Smoking', growthPercent: 88, memberCount: 150000, competitionLevel: 'baja', opportunityScore: 80, isEmerging: true, subredditName: 'smokingfetish' },
  { fetishName: 'Latex Fetish', category: 'Latex', growthPercent: 75, memberCount: 137000, competitionLevel: 'baja', opportunityScore: 76, isEmerging: true, subredditName: 'latexfetish' },
  { fetishName: 'BBW Creator Content', category: 'BBW', growthPercent: 70, memberCount: 1092000, competitionLevel: 'media', opportunityScore: 72, isEmerging: false, subredditName: 'BBW' },
  { fetishName: 'NSFW Cosplay', category: 'Cosplay', growthPercent: 95, memberCount: 1677000, competitionLevel: 'alta', opportunityScore: 65, isEmerging: false, subredditName: 'nsfwcosplay' },
  { fetishName: 'Financial Domination', category: 'Findom', growthPercent: 85, memberCount: 210000, competitionLevel: 'media', opportunityScore: 68, isEmerging: false, subredditName: 'findom' },
  { fetishName: 'JOI Content', category: 'Femdom + JOI', growthPercent: 120, memberCount: 549000, competitionLevel: 'media', opportunityScore: 74, isEmerging: true, subredditName: 'joi' },
  { fetishName: 'Cuckold & Hotwife', category: 'Hotwife + Cuckold', growthPercent: 90, memberCount: 2178000, competitionLevel: 'alta', opportunityScore: 60, isEmerging: false, subredditName: 'cuckold' },
  { fetishName: 'Lingerie Showcase', category: 'Lingerie', growthPercent: 65, memberCount: 806000, competitionLevel: 'media', opportunityScore: 66, isEmerging: false, subredditName: 'lingerie' },
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
