import { NextRequest, NextResponse } from 'next/server';
import { ALL_SUBREDDITS } from '@/lib/demo-subreddits';
import { cache, CACHE_TTL } from '@/lib/cache';

function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function searchSubreddits(query: string, limit: number) {
  const q = query.toLowerCase().trim();
  const cleanQ = q.replace(/^\/?r\/+/, '');

  const results: any[] = [];
  const seen = new Set<string>();

  // Priority 1: Exact name match
  for (const sub of ALL_SUBREDDITS) {
    if (sub.name.toLowerCase() === cleanQ && !seen.has(sub.name)) {
      results.push({ ...sub, priority: 1 });
      seen.add(sub.name);
    }
  }

  // Priority 2: Name starts with query
  for (const sub of ALL_SUBREDDITS) {
    if (sub.name.toLowerCase().startsWith(cleanQ) && !seen.has(sub.name)) {
      results.push({ ...sub, priority: 2 });
      seen.add(sub.name);
    }
  }

  // Priority 3: Name contains query
  for (const sub of ALL_SUBREDDITS) {
    if (sub.name.toLowerCase().includes(cleanQ) && !seen.has(sub.name)) {
      results.push({ ...sub, priority: 3 });
      seen.add(sub.name);
    }
  }

  // Priority 4: Niche/tags match
  for (const sub of ALL_SUBREDDITS) {
    if (
      sub.niches?.some((n: string) => n.includes(cleanQ) || cleanQ.includes(n)) &&
      !seen.has(sub.name)
    ) {
      results.push({ ...sub, priority: 4 });
      seen.add(sub.name);
    }
  }

  // Priority 5: Display name or description contains query
  for (const sub of ALL_SUBREDDITS) {
    if (
      (sub.displayName.toLowerCase().includes(cleanQ) || sub.description.toLowerCase().includes(cleanQ)) &&
      !seen.has(sub.name)
    ) {
      results.push({ ...sub, priority: 5 });
      seen.add(sub.name);
    }
  }

  // Sort by priority then by subscribers
  results.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.subscribers - a.subscribers;
  });

  // If the query is a specific subreddit name not in our data, DON'T add a fake 0-member entry
  // The Reddit API will handle it, and the rules endpoint will try to fetch real data

  return results.slice(0, limit).map(({ priority, niches, ...sub }: any) => ({
    ...sub,
    url: `https://reddit.com/r/${sub.name}`,
    iconUrl: null,
  }));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '30');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  const cleanQ = query.toLowerCase().trim().replace(/^\/?r\/+/, '');

  try {
    // Check memory cache first
    const cacheKey = `search:${query}:${limit}`;
    const cached = cache.get<{ subreddits: any[]; total: number; source: string }>(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, source: 'cache' });
    }

    // Try Reddit API with short timeout (5s max)
    const redditUrl = `https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(query)}&limit=${limit}&sort=relevance&include_over_18=on`;
    const response = await fetchWithTimeout(redditUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0',
        'Accept': 'application/json',
      },
    }, 5000);

    if (response.ok) {
      const data = await response.json();
      const redditSubs = data.data.children
        .filter((child: any) => child.kind === 't5')
        .map((child: any) => {
          const sr = child.data;
          return {
            name: sr.display_name,
            displayName: sr.title,
            description: sr.public_description || sr.description?.substring(0, 300),
            subscribers: sr.subscribers || 0,
            over18: sr.over18 || false,
            iconUrl: sr.icon_img || sr.community_icon || null,
            url: `https://reddit.com/r/${sr.display_name}`,
          };
        })
        .sort((a: any, b: any) => b.subscribers - a.subscribers);

      // Merge with demo data: add demo results that Reddit didn't return
      const demoResults = searchSubreddits(query, limit);
      const redditNames = new Set(redditSubs.map((s: any) => s.name.toLowerCase()));
      const extraDemo = demoResults.filter((s: any) => !redditNames.has(s.name.toLowerCase()));

      const merged = [...redditSubs, ...extraDemo].slice(0, limit);
      const result = { subreddits: merged, total: merged.length, source: 'reddit+demo' };
      cache.set(cacheKey, result, CACHE_TTL.search);
      return NextResponse.json(result);
    }

    // Reddit blocked — try fetching specific subreddit info directly
    if (/^[a-zA-Z0-9_]+$/.test(cleanQ)) {
      try {
        const aboutRes = await fetchWithTimeout(`https://www.reddit.com/r/${encodeURIComponent(cleanQ)}/about.json`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0',
            'Accept': 'application/json',
          },
        }, 4000);

        if (aboutRes.ok) {
          const aboutData = await aboutRes.json();
          const sr = aboutData.data;
          if (sr && !sr.banned && !sr.quarantine) {
            const directSub = {
              name: sr.display_name,
              displayName: sr.title,
              description: sr.public_description || '',
              subscribers: sr.subscribers || 0,
              over18: sr.over18 || false,
              iconUrl: sr.icon_img || sr.community_icon || null,
              url: `https://reddit.com/r/${sr.display_name}`,
            };

            // Merge with demo results
            const demoResults = searchSubreddits(query, limit);
            const demoNames = new Set(demoResults.map((s: any) => s.name.toLowerCase()));
            if (!demoNames.has(cleanQ.toLowerCase())) {
              demoResults.unshift(directSub);
            }

            const result = { subreddits: demoResults.slice(0, limit), total: Math.min(demoResults.length, limit), source: 'reddit-direct+demo' };
            cache.set(cacheKey, result, CACHE_TTL.search);
            return NextResponse.json(result);
          }
        }
      } catch (directErr) {
        console.log('Direct subreddit fetch failed:', directErr instanceof Error ? directErr.message : 'unknown');
      }
    }

    // Fallback: use demo data only
    const demoResults = searchSubreddits(query, limit);
    const result = { subreddits: demoResults, total: demoResults.length, source: 'demo' };
    cache.set(cacheKey, result, CACHE_TTL.search);
    return NextResponse.json(result);
  } catch (error: any) {
    // Any error — fall back to demo data instantly
    const demoResults = searchSubreddits(query, limit);
    const cacheKey = `search:${query}:${limit}`;
    const result = { subreddits: demoResults, total: demoResults.length, source: 'demo' };
    cache.set(cacheKey, result, CACHE_TTL.search);
    return NextResponse.json(result);
  }
}
