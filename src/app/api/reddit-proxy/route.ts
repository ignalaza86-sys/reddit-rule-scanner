import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side Reddit proxy — tries MULTIPLE strategies to fetch real Reddit data.
 * This bypasses CORS (server-to-server) and uses various User-Agents and endpoints.
 * 
 * Strategies:
 * 1. www.reddit.com with Chrome User-Agent
 * 2. old.reddit.com with Chrome User-Agent  
 * 3. www.reddit.com with Firefox User-Agent
 * 4. api.reddit.com with bot User-Agent
 * 5. Each with retries and increasing timeouts
 */

function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

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
}

async function tryFetchAbout(subreddit: string, baseUrl: string, userAgent: string, timeoutMs: number): Promise<any | null> {
  try {
    const res = await fetchWithTimeout(
      `${baseUrl}/r/${encodeURIComponent(subreddit)}/about.json`,
      {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
      },
      timeoutMs
    );
    if (res.ok) {
      const json = await res.json();
      if (json.data && !json.data.banned && !json.data.quarantine) {
        return json.data;
      }
    }
  } catch {}
  return null;
}

async function tryFetchRules(subreddit: string, baseUrl: string, userAgent: string, timeoutMs: number): Promise<any[]> {
  try {
    const res = await fetchWithTimeout(
      `${baseUrl}/r/${encodeURIComponent(subreddit)}/about/rules.json`,
      {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
      },
      timeoutMs
    );
    if (res.ok) {
      const json = await res.json();
      if (json.rules && Array.isArray(json.rules)) {
        return json.rules;
      }
    }
  } catch {}
  return [];
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

  console.log(`[reddit-proxy] Fetching data for r/${subLower}...`);

  // Strategies to try in order — most likely to work first
  const strategies = [
    { baseUrl: 'https://www.reddit.com', userAgent: USER_AGENTS.chrome, timeout: 8000, label: 'www+chrome' },
    { baseUrl: 'https://old.reddit.com', userAgent: USER_AGENTS.chrome, timeout: 8000, label: 'old+chrome' },
    { baseUrl: 'https://www.reddit.com', userAgent: USER_AGENTS.firefox, timeout: 8000, label: 'www+firefox' },
    { baseUrl: 'https://api.reddit.com', userAgent: USER_AGENTS.bot, timeout: 8000, label: 'api+bot' },
    { baseUrl: 'https://www.reddit.com', userAgent: USER_AGENTS.bot, timeout: 10000, label: 'www+bot' },
    { baseUrl: 'https://old.reddit.com', userAgent: USER_AGENTS.generic, timeout: 10000, label: 'old+generic' },
  ];

  let about: any = null;
  let rules: any[] = [];
  let source = '';

  for (const strategy of strategies) {
    console.log(`[reddit-proxy] Trying strategy: ${strategy.label}`);
    
    // Try to fetch both about and rules in parallel
    const [aboutResult, rulesResult] = await Promise.all([
      tryFetchAbout(subLower, strategy.baseUrl, strategy.userAgent, strategy.timeout),
      tryFetchRules(subLower, strategy.baseUrl, strategy.userAgent, strategy.timeout),
    ]);

    if (aboutResult || rulesResult.length > 0) {
      about = aboutResult || about;
      rules = rulesResult.length > 0 ? rulesResult : rules;
      source = strategy.label;
      console.log(`[reddit-proxy] Strategy ${strategy.label} got: about=${!!aboutResult}, rules=${rulesResult.length}`);
      
      // If we got both, we're done
      if (about && rules.length > 0) break;
    }
  }

  // If first round didn't get both, try one more time with longer timeout
  if (!about || rules.length === 0) {
    const retryStrategy = { baseUrl: 'https://www.reddit.com', userAgent: USER_AGENTS.chrome, timeout: 12000, label: 'www+chrome+retry' };
    console.log(`[reddit-proxy] Retrying with: ${retryStrategy.label}`);
    const [aboutResult, rulesResult] = await Promise.all([
      about ? Promise.resolve(about) : tryFetchAbout(subLower, retryStrategy.baseUrl, retryStrategy.userAgent, retryStrategy.timeout),
      rules.length > 0 ? Promise.resolve(rules) : tryFetchRules(subLower, retryStrategy.baseUrl, retryStrategy.userAgent, retryStrategy.timeout),
    ]);
    if (aboutResult) about = aboutResult;
    if (rulesResult.length > 0) { rules = rulesResult; source = retryStrategy.label; }
  }

  const gotData = !!(about || rules.length > 0);
  console.log(`[reddit-proxy] Result for r/${subLower}: about=${!!about}, rules=${rules.length}, source=${source}, gotData=${gotData}`);

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
  };

  return NextResponse.json(result);
}
