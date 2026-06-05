import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

// Demo trend data for when Reddit blocks the request
const DEMO_TRENDS = [
  { fetishName: 'Feet ASMR', category: 'Feet + ASMR', growthPercent: 285, competitionLevel: 'baja', opportunityScore: 92, isEmerging: true, subredditName: 'feetasmr' },
  { fetishName: 'Sensory Deprivation', category: 'Bondage', growthPercent: 180, competitionLevel: 'baja', opportunityScore: 88, isEmerging: true, subredditName: 'sensorydeprivation' },
  { fetishName: 'Shoe Dangling', category: 'Feet', growthPercent: 165, competitionLevel: 'baja', opportunityScore: 85, isEmerging: true, subredditName: 'shoedangling' },
  { fetishName: 'Crypto Findom', category: 'Findom + Crypto', growthPercent: 220, competitionLevel: 'media', opportunityScore: 78, isEmerging: true, subredditName: 'cryptofindom' },
  { fetishName: 'Giantess POV', category: 'Roleplay', growthPercent: 145, competitionLevel: 'media', opportunityScore: 74, isEmerging: true, subredditName: 'giantesspov' },
  { fetishName: 'Mouth Sounds', category: 'ASMR', growthPercent: 130, competitionLevel: 'media', opportunityScore: 71, isEmerging: true, subredditName: 'mouthsounds' },
  { fetishName: 'Pedicure Content', category: 'Feet', growthPercent: 95, competitionLevel: 'media', opportunityScore: 68, isEmerging: false, subredditName: 'pedicure' },
  { fetishName: 'Cosplay Findom', category: 'Cosplay + Findom', growthPercent: 110, competitionLevel: 'baja', opportunityScore: 82, isEmerging: true, subredditName: 'cosplayfindom' },
  { fetishName: 'Smoking Fetish', category: 'Smoking', growthPercent: 88, competitionLevel: 'alta', opportunityScore: 55, isEmerging: false, subredditName: 'smokingfetish' },
  { fetishName: 'Yoga Pants Worship', category: 'Fitness', growthPercent: 75, competitionLevel: 'alta', opportunityScore: 48, isEmerging: false, subredditName: 'yogapantsworship' },
  { fetishName: 'Body Paint', category: 'Art + NSFW', growthPercent: 120, competitionLevel: 'baja', opportunityScore: 79, isEmerging: true, subredditName: 'bodypaint' },
  { fetishName: 'Latex Fashion', category: 'Latex', growthPercent: 65, competitionLevel: 'media', opportunityScore: 62, isEmerging: false, subredditName: 'latexfashion' },
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category') || '';
  const limit = parseInt(searchParams.get('limit') || '12');

  try {
    // Check for cached trends (less than 6h old)
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
      return NextResponse.json({ trends: cachedTrends, cached: true });
    }

    // Try Reddit API first
    let redditWorked = false;
    let allResults: any[] = [];
    
    const searchTerms = category ? [category] : ['feet asmr', 'findom crypto', 'shoe dangling', 'giantess pov', 'sensory deprivation', 'mouth sounds asmr', 'body paint nsfw', 'latex fashion', 'pedicure content', 'cosplay findom'];
    
    for (const term of searchTerms) {
      try {
        const redditUrl = `https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(term)}&limit=3&sort=new`;
        const response = await fetch(redditUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          redditWorked = true;
          const data = await response.json();
          const subs = data.data.children
            .filter((child: any) => child.kind === 't5' && child.data.over18)
            .map((child: any) => ({
              name: child.data.display_name,
              subscribers: child.data.subscribers || 0,
              description: child.data.public_description || '',
              searchTerm: term,
            }));
          allResults.push(...subs);
        }
      } catch (e) {
        // Continue
      }
    }

    // Use AI to analyze if Reddit worked, otherwise use demo data
    let trendsToSave: any[];

    if (redditWorked && allResults.length > 3) {
      const zai = await ZAI.create();
      
      const subList = allResults
        .slice(0, 30)
        .map((s: any) => `r/${s.name} (${s.subscribers} members, term: ${s.searchTerm}) - ${s.description?.substring(0, 100)}`)
        .join('\n');

      const aiPrompt = `Sos un experto en tendencias de contenido adulto en Reddit. Analizá esta lista de subreddits y identificá fetiches emergentes o en tendencia.

Subreddits encontrados:
${subList}

Para cada fetiche/nicho emergente que detectes, indicá:
1. Nombre del fetiche/nicho
2. Categoría madre
3. Porcentaje estimado de crecimiento
4. Nivel de competencia: "baja", "media", "alta", "saturada"
5. Score de oportunidad del 1 al 100
6. Si es emergente
7. subreddit asociado

Respondé SOLO en JSON:
{
  "trends": [
    {
      "fetishName": "nombre",
      "category": "categoría madre",
      "growthPercent": 150,
      "competitionLevel": "baja",
      "opportunityScore": 85,
      "isEmerging": true,
      "subredditName": "nombre_del_sub"
    }
  ]
}`;

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'Sos un analista de tendencias de contenido adulto. Respondé SOLO en JSON válido, sin markdown ni backticks.' },
          { role: 'user', content: aiPrompt },
        ],
        temperature: 0.4,
      });

      try {
        const content = completion.choices[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        trendsToSave = aiResult?.trends || DEMO_TRENDS;
      } catch (e) {
        trendsToSave = DEMO_TRENDS;
      }
    } else {
      // Use demo data filtered by category if provided
      trendsToSave = category
        ? DEMO_TRENDS.filter(t => 
            t.fetishName.toLowerCase().includes(category.toLowerCase()) || 
            t.category.toLowerCase().includes(category.toLowerCase())
          )
        : DEMO_TRENDS;
      
      // If filter returned nothing, return all
      if (trendsToSave.length === 0) trendsToSave = DEMO_TRENDS;
    }

    // Save trends to database
    const savedTrends: any[] = [];
    
    for (const trend of trendsToSave.slice(0, limit)) {
      try {
        // Ensure subreddit exists
        let sub = await db.subreddit.findUnique({
          where: { name: trend.subredditName?.toLowerCase() },
        });

        if (!sub) {
          sub = await db.subreddit.create({
            data: {
              name: trend.subredditName?.toLowerCase() || `unknown_${Date.now()}`,
              displayName: trend.fetishName,
              subscribers: 0,
              over18: true,
            },
          });
        }

        const saved = await db.trend.create({
          data: {
            subredditId: sub.id,
            fetishName: trend.fetishName,
            category: trend.category,
            growthPercent: trend.growthPercent || 0,
            memberCount: sub.subscribers,
            opportunityScore: trend.opportunityScore || 50,
            competitionLevel: trend.competitionLevel || 'unknown',
            isEmerging: trend.isEmerging || false,
            weekDetected: new Date().toISOString().split('T')[0],
          },
        });

        savedTrends.push({ ...saved, subreddit: sub });
      } catch (e) {
        // Skip on error
      }
    }

    return NextResponse.json({
      trends: savedTrends,
      totalScanned: allResults.length,
      cached: false,
    });
  } catch (error: any) {
    console.error('Trends error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trends', details: error.message },
      { status: 500 }
    );
  }
}
