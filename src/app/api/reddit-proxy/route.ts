import { NextRequest, NextResponse } from 'next/server';

// Edge runtime — runs on Cloudflare's network
export const runtime = 'edge';

/**
 * Edge-based Reddit proxy that uses CORS proxy services as intermediaries.
 * Since Reddit blocks direct requests from cloud servers, we route through
 * CORS proxy services which run on residential-like IPs.
 * 
 * Flow: Vercel Edge → CORS Proxy → Reddit API
 */

interface RedditProxyResult {
  about: any | null;
  rules: any[];
  source: string;
  subreddit: string;
  runtime: string;
}

async function tryFetch(url: string, timeoutMs: number): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timer);
    return res;
  } catch {
    return null;
  }
}

// CORS proxy services to use as intermediaries
const CORS_PROXIES = [
  { prefix: 'https://api.allorigins.win/raw?url=', name: 'allorigins' },
  { prefix: 'https://corsproxy.io/?', name: 'corsproxy' },
  { prefix: 'https://thingproxy.freeboard.io/fetch/', name: 'thingproxy' },
];

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

  const aboutUrl = `https://www.reddit.com/r/${encodeURIComponent(subLower)}/about.json`;
  const rulesUrl = `https://www.reddit.com/r/${encodeURIComponent(subLower)}/about/rules.json`;

  let about: any = null;
  let rules: any[] = [];
  let source = '';

  // Try each CORS proxy
  for (const proxy of CORS_PROXIES) {
    const fullAboutUrl = proxy.prefix + encodeURIComponent(aboutUrl);
    const fullRulesUrl = proxy.prefix + encodeURIComponent(rulesUrl);

    const [aboutRes, rulesRes] = await Promise.all([
      tryFetch(fullAboutUrl, 12000),
      tryFetch(fullRulesUrl, 12000),
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
      source = `edge+${proxy.name}`;
      if (about && rules.length > 0) break;
    }
  }

  // Also try direct fetch as a last resort (probably won't work but worth trying)
  if (!about && rules.length === 0) {
    const [aboutRes, rulesRes] = await Promise.all([
      tryFetch(aboutUrl, 10000),
      tryFetch(rulesUrl, 10000),
    ]);

    if (aboutRes?.ok) {
      try {
        const json = await aboutRes.json();
        if (json.data && !json.data.banned) {
          about = json.data;
          source = 'edge+direct';
        }
      } catch {}
    }

    if (rulesRes?.ok) {
      try {
        const json = await rulesRes.json();
        if (json.rules && Array.isArray(json.rules)) {
          rules = json.rules;
          source = source || 'edge+direct';
        }
      } catch {}
    }
  }

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
