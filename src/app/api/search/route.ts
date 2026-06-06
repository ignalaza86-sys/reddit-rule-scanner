import { NextRequest, NextResponse } from 'next/server';
import { ALL_SUBREDDITS, SUBREDDIT_MAP, getSubscriberCount } from '@/lib/demo-subreddits';
import { cache, CACHE_TTL } from '@/lib/cache';

function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function searchCuratedData(query: string, limit: number) {
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

  return results.slice(0, limit).map(({ priority, niches, allowPromo, requiresVerify, postLimit, promoDays, ...sub }: any) => ({
    ...sub,
    url: `https://reddit.com/r/${sub.name}`,
    iconUrl: null,
    allowPromo,
    requiresVerify,
    postLimit,
    promoDays,
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

    // Step 1: Get curated data results (ALWAYS available, ALWAYS with real subscriber counts)
    const curatedResults = searchCuratedData(query, limit);

    // Step 2: Try Reddit search API (bonus — may add more results)
    let redditSubs: any[] = [];
    try {
      const redditUrl = `https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(query)}&limit=${limit}&sort=relevance&include_over_18=on`;
      const response = await fetchWithTimeout(redditUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      }, 5000);

      if (response.ok) {
        const data = await response.json();
        redditSubs = data.data.children
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
              allowPromo: null,
              requiresVerify: null,
              postLimit: null,
              promoDays: null,
            };
          })
          .filter((s: any) => !s.description?.includes('banned') && s.subscribers > 0)
          .sort((a: any, b: any) => b.subscribers - a.subscribers);
      }
    } catch (e) {
      console.log('Reddit search API failed (expected from Vercel):', e instanceof Error ? e.message : 'unknown');
    }

    // Step 3: Merge — curated data takes priority (has accurate subscriber counts + promo info)
    const curatedNames = new Set(curatedResults.map((s: any) => s.name.toLowerCase()));
    const extraReddit = redditSubs.filter((s: any) => !curatedNames.has(s.name.toLowerCase()));

    // For Reddit results, check if we have curated subscriber data that's more reliable
    const enrichedReddit = extraReddit.map((s: any) => {
      const curatedSubs = getSubscriberCount(s.name);
      if (curatedSubs > 0 && (s.subscribers === 0 || s.subscribers === null)) {
        return { ...s, subscribers: curatedSubs };
      }
      return s;
    });

    const merged = [...curatedResults, ...enrichedReddit].slice(0, limit);

    // Step 4: If we have NO results and the query looks like a subreddit name, 
    // try fetching about.json directly
    if (merged.length === 0 && /^[a-zA-Z0-9_]+$/.test(cleanQ)) {
      let directSub: any = null;
      try {
        const aboutRes = await fetchWithTimeout(`https://www.reddit.com/r/${encodeURIComponent(cleanQ)}/about.json`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
        }, 4000);

        if (aboutRes.ok) {
          const aboutData = await aboutRes.json();
          const sr = aboutData.data;
          if (sr && !sr.banned && !sr.quarantine && sr.subscribers > 0) {
            directSub = {
              name: sr.display_name,
              displayName: sr.title,
              description: sr.public_description || '',
              subscribers: sr.subscribers || 0,
              over18: sr.over18 || false,
              iconUrl: sr.icon_img || sr.community_icon || null,
              url: `https://reddit.com/r/${sr.display_name}`,
              allowPromo: null,
              requiresVerify: null,
              postLimit: null,
              promoDays: null,
            };
          }
        }
      } catch (e) {
        console.log('Direct subreddit fetch failed:', e instanceof Error ? e.message : 'unknown');
      }

      if (directSub) {
        merged.push(directSub);
      } else {
        // Last resort: create a synthetic entry so the user can still try loading rules
        // The rules API will use AI to generate rules
        merged.push({
          name: cleanQ,
          displayName: `r/${cleanQ}`,
          description: `Comunidad de Reddit. Hacé clic para cargar las reglas con IA.`,
          subscribers: getSubscriberCount(cleanQ) || null, // Use curated data if available, null otherwise
          over18: true,
          iconUrl: null,
          url: `https://reddit.com/r/${cleanQ}`,
          allowPromo: null,
          requiresVerify: null,
          postLimit: null,
          promoDays: null,
          isUnverified: true, // Flag to show "unverified" badge
        });
      }
    }

    const source = redditSubs.length > 0 ? 'curated+reddit' : 'curated';
    const result = { subreddits: merged, total: merged.length, source };
    cache.set(cacheKey, result, CACHE_TTL.search);
    return NextResponse.json(result);
  } catch (error: any) {
    // Even on error, return curated data
    const curatedResults = searchCuratedData(query, limit);
    const cacheKey = `search:${query}:${limit}`;
    const result = { subreddits: curatedResults, total: curatedResults.length, source: 'curated' };
    cache.set(cacheKey, result, CACHE_TTL.search);
    return NextResponse.json(result);
  }
}
