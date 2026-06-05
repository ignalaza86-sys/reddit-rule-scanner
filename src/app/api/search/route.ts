import { NextRequest, NextResponse } from 'next/server';
import { ALL_SUBREDDITS } from '@/lib/demo-subreddits';

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

  // If the query is a specific subreddit name not in our data, add it
  if (/^[a-zA-Z0-9_]+$/.test(cleanQ) && !seen.has(cleanQ)) {
    results.unshift({
      name: cleanQ,
      displayName: `r/${cleanQ}`,
      description: `Subreddit r/${cleanQ} — hacé clic para cargar y traducir sus reglas con IA.`,
      subscribers: 0,
      over18: true,
      priority: 0,
      niches: [],
    });
  }

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

  try {
    // Try Reddit API
    const redditUrl = `https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(query)}&limit=${limit}&sort=relevance`;
    const response = await fetch(redditUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0',
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const subreddits = data.data.children
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
      return NextResponse.json({ subreddits, total: subreddits.length, source: 'reddit' });
    }

    // Reddit blocked — use demo data
    const demoResults = searchSubreddits(query, limit);
    return NextResponse.json({ subreddits: demoResults, total: demoResults.length, source: 'demo' });
  } catch (error: any) {
    const demoResults = searchSubreddits(query, limit);
    return NextResponse.json({ subreddits: demoResults, total: demoResults.length, source: 'demo' });
  }
}
