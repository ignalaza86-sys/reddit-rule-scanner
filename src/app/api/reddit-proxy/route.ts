import { NextRequest, NextResponse } from 'next/server';

// RUN ON EDGE RUNTIME — different network/IPs than regular Vercel functions
// This might bypass Reddit's IP blocks for cloud hosting providers
export const runtime = 'edge';

/**
 * Edge-based Reddit proxy — runs on Cloudflare's network (not Vercel's).
 * Tries MULTIPLE strategies to fetch real Reddit data.
 */

const USER_AGENTS = {
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  bot: 'linux:reddit-rule-scanner:v1.0 (by /u/reddit-rule-scanner)',
  generic: 'Mozilla/5.0 (compatible; RedditRuleScanner/1.0)',
};

interface RedditProxyResult {
  about: any | null;
  rules: any[];
  source: string;
  subreddit: string;
  runtime: string;
}

async function tryFetch(url: string, userAgent: string, timeoutMs: number): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });
    clearTimeout(timer);
    return res;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const subreddit = searchParams.get('subreddit');

  if (!subreddit) {
    return NextResponse.json({ error: 'Parameter "subreddit" is required' }, { status: 400 });
  }

  const subLower = subreddit.toLowerCase().trim();
  if (!/^[a-zA-Z0-9_]+$/.test(subLower)) {
    return NextResponse.json({ error: 'Invalid subreddit name' }, { status: 400 });
  }

  // Strategies to try in order
  const strategies = [
    { aboutUrl: `https://www.reddit.com/r/${subLower}/about.json`, rulesUrl: `https://www.reddit.com/r/${subLower}/about/rules.json`, ua: USER_AGENTS.chrome, timeout: 8000, label: 'www+chrome' },
    { aboutUrl: `https://old.reddit.com/r/${subLower}/about.json`, rulesUrl: `https://old.reddit.com/r/${subLower}/about/rules.json`, ua: USER_AGENTS.chrome, timeout: 8000, label: 'old+chrome' },
    { aboutUrl: `https://www.reddit.com/r/${subLower}/about.json`, rulesUrl: `https://www.reddit.com/r/${subLower}/about/rules.json`, ua: USER_AGENTS.firefox, timeout: 8000, label: 'www+firefox' },
    { aboutUrl: `https://api.reddit.com/r/${subLower}/about`, rulesUrl: `https://api.reddit.com/r/${subLower}/about/rules`, ua: USER_AGENTS.bot, timeout: 8000, label: 'api+bot' },
    { aboutUrl: `https://www.reddit.com/r/${subLower}/about.json`, rulesUrl: `https://www.reddit.com/r/${subLower}/about/rules.json`, ua: USER_AGENTS.bot, timeout: 10000, label: 'www+bot' },
  ];

  let about: any = null;
  let rules: any[] = [];
  let source = '';

  for (const strategy of strategies) {
    // Fetch both endpoints in parallel
    const [aboutRes, rulesRes] = await Promise.all([
      tryFetch(strategy.aboutUrl, strategy.ua, strategy.timeout),
      tryFetch(strategy.rulesUrl, strategy.ua, strategy.timeout),
    ]);

    let aboutData: any = null;
    let rulesData: any[] = [];

    if (aboutRes?.ok) {
      try {
        const json = await aboutRes.json();
        if (json.data && !json.data.banned && !json.data.quarantine) {
          aboutData = json.data;
        }
      } catch {}
    }

    if (rulesRes?.ok) {
      try {
        const json = await rulesRes.json();
        if (json.rules && Array.isArray(json.rules)) {
          rulesData = json.rules;
        }
      } catch {}
    }

    if (aboutData || rulesData.length > 0) {
      about = aboutData || about;
      rules = rulesData.length > 0 ? rulesData : rules;
      source = strategy.label;
      
      // If we got both, we're done
      if (about && rules.length > 0) break;
    }
  }

  const gotData = !!(about || rules.length > 0);

  const result: RedditProxyResult = {
    about: about ? {
      title: about.title || '',
      display_name: about.display_name || subLower,
      subscribers: about.subscribers || 0,
      over18: about.over18 || false,
      public_description: about.public_description || '',
      icon_img: about.icon_img || null,
      community_icon: about.community_icon || null,
      banner_img: about.banner_img || null,
      active_user_count: about.active_user_count || null,
      created_utc: about.created_utc || 0,
      description: about.description || '',
      submit_text: about.submit_text || '',
    } : null,
    rules: rules.map((r: any) => ({
      short_name: r.short_name || '',
      description: r.description || '',
      priority: r.priority || 0,
      created_utc: r.created_utc || 0,
      violation_reason: r.violation_reason || '',
    })),
    source,
    subreddit: subLower,
    runtime: 'edge',
  };

  return NextResponse.json(result);
}
