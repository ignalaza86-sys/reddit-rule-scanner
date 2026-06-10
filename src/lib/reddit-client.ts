// Client-side Reddit data fetcher
// STRATEGY (in order of priority):
// 1. Cloudflare Worker proxy — dedicated, reliable, NOT blocked by Reddit
// 2. Direct browser fetch to Reddit — usually fails (CORS) but worth trying
// 3. Our server-side proxy (/api/reddit-proxy) — tries from Vercel Edge + Node
// 4. Multiple CORS proxy services as fallback
// 5. If all fail, user can manually paste rules from Reddit

export interface RedditAboutData {
  title: string;
  display_name: string;
  subscribers: number;
  over18: boolean;
  public_description: string;
  icon_img: string | null;
  community_icon: string | null;
  banner_img: string | null;
  active_user_count: number | null;
  created_utc: number;
  banned?: boolean;
  description?: string;
  submit_text?: string;
  submit_link_label?: string;
  submit_text_label?: string;
}

export interface RedditRule {
  short_name: string;
  description: string;
  priority: number;
  created_utc: number;
  violation_reason?: string;
  link_flair_template_id?: string;
}

export interface ClientRedditResult {
  about: RedditAboutData | null;
  rules: RedditRule[];
  fetchedAt: number;
  source: 'cloudflare_worker' | 'server_proxy' | 'direct' | 'cors_proxy' | 'manual' | 'unknown';
}

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timer);
    return response;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

/**
 * STRATEGY 1: Cloudflare Worker proxy
 * This is the MOST RELIABLE way to fetch Reddit data from the browser.
 * The Worker runs on Cloudflare's edge network, which Reddit doesn't block.
 * Set NEXT_PUBLIC_REDDIT_PROXY_URL env var to your Worker URL.
 */
async function fetchViaCloudflareWorker(subreddit: string): Promise<ClientRedditResult | null> {
  const workerUrl = process.env.NEXT_PUBLIC_REDDIT_PROXY_URL;
  if (!workerUrl) {
    console.log('[reddit-client] No Cloudflare Worker URL configured, skipping');
    return null;
  }

  const subLower = subreddit.toLowerCase().trim();
  if (!subLower || /[^a-zA-Z0-9_]/.test(subLower)) return null;

  try {
    // Use the /both endpoint to get about + rules in one call
    const url = `${workerUrl}/both?subreddit=${encodeURIComponent(subLower)}`;
    console.log(`[reddit-client] Trying Cloudflare Worker for r/${subLower}...`);
    
    const res = await fetchWithTimeout(url, 15000);
    if (!res.ok) {
      console.log(`[reddit-client] Cloudflare Worker returned ${res.status}`);
      return null;
    }

    const data = await res.json();

    if (!data.about && (!data.rules || data.rules.length === 0)) return null;

    // Worker returns normalized fields; map back to our RedditAboutData interface
    const about: RedditAboutData | null = data.about ? {
      title: data.about.title || '',
      display_name: data.about.name || data.about.display_name || subreddit,
      subscribers: data.about.subscribers || 0,
      over18: data.about.over18 || false,
      public_description: data.about.description || data.about.public_description || '',
      icon_img: data.about.iconImage || data.about.icon_img || null,
      community_icon: data.about.iconImage || data.about.community_icon || null,
      banner_img: data.about.bannerImage || data.about.banner_img || null,
      active_user_count: data.about.activeUsers || data.about.active_user_count || null,
      created_utc: data.about.createdUtc || data.about.created_utc || 0,
      banned: data.about.isBanned || false,
      description: data.about.description || '',
      submit_text: '',
    } : null;

    // Worker returns { index, name, description, reason, priority, createdUtc }
    const rules: RedditRule[] = (data.rules || []).map((r: any) => ({
      short_name: r.name || r.short_name || '',
      description: r.description || '',
      priority: r.priority || 0,
      created_utc: r.createdUtc || r.created_utc || 0,
      violation_reason: r.reason || r.violation_reason || '',
    }));

    console.log(`[reddit-client] Cloudflare Worker succeeded! Got ${rules.length} rules for r/${subLower}`);
    return { about, rules, fetchedAt: Date.now(), source: 'cloudflare_worker' };
  } catch (e) {
    console.log('[reddit-client] Cloudflare Worker failed:', e instanceof Error ? e.message : 'unknown');
    return null;
  }
}

/**
 * STRATEGY 2: Direct browser fetch to Reddit
 * Usually fails due to CORS, but worth trying (Reddit sometimes allows it)
 */
async function fetchDirect(subreddit: string): Promise<ClientRedditResult | null> {
  const subLower = subreddit.toLowerCase().trim();
  try {
    const aboutUrl = `https://www.reddit.com/r/${encodeURIComponent(subLower)}/about.json`;
    const rulesUrl = `https://www.reddit.com/r/${encodeURIComponent(subLower)}/about/rules.json`;
    
    const [aboutRes, rulesRes] = await Promise.all([
      fetchWithTimeout(aboutUrl, 8000).catch(() => null),
      fetchWithTimeout(rulesUrl, 8000).catch(() => null),
    ]);

    let about: RedditAboutData | null = null;
    let rules: RedditRule[] = [];

    if (aboutRes?.ok) {
      try {
        const json = await aboutRes.json();
        if (json.data && !json.data.banned) {
          about = {
            title: json.data.title || '',
            display_name: json.data.display_name || subLower,
            subscribers: json.data.subscribers || 0,
            over18: json.data.over18 || false,
            public_description: json.data.public_description || '',
            icon_img: json.data.icon_img || null,
            community_icon: json.data.community_icon || null,
            banner_img: json.data.banner_img || null,
            active_user_count: json.data.active_user_count || null,
            created_utc: json.data.created_utc || 0,
            banned: false,
            description: json.data.description || '',
          };
        }
      } catch {}
    }

    if (rulesRes?.ok) {
      try {
        const json = await rulesRes.json();
        rules = json.rules || [];
      } catch {}
    }

    if (about || rules.length > 0) {
      return { about, rules, fetchedAt: Date.now(), source: 'direct' };
    }
  } catch {}
  return null;
}

/**
 * STRATEGY 3: Server-side proxy (our Vercel Edge function)
 */
async function fetchViaServerProxy(subreddit: string): Promise<ClientRedditResult | null> {
  try {
    const res = await fetchWithTimeout(`/api/reddit-proxy?subreddit=${encodeURIComponent(subreddit)}`, 35000);
    if (!res.ok) return null;
    
    const data = await res.json();
    
    if (!data.about && (!data.rules || data.rules.length === 0)) return null;
    
    const about: RedditAboutData | null = data.about ? {
      title: data.about.title || '',
      display_name: data.about.display_name || subreddit,
      subscribers: data.about.subscribers || 0,
      over18: data.about.over18 || false,
      public_description: data.about.public_description || '',
      icon_img: data.about.icon_img || null,
      community_icon: data.about.community_icon || null,
      banner_img: data.about.banner_img || null,
      active_user_count: data.about.active_user_count || null,
      created_utc: data.about.created_utc || 0,
      banned: false,
      description: data.about.description || '',
      submit_text: data.about.submit_text || '',
    } : null;
    
    const rules: RedditRule[] = (data.rules || []).map((r: any) => ({
      short_name: r.short_name || '',
      description: r.description || '',
      priority: r.priority || 0,
      created_utc: r.created_utc || 0,
      violation_reason: r.violation_reason || '',
    }));
    
    return { about, rules, fetchedAt: Date.now(), source: 'server_proxy' };
  } catch (e) {
    console.log('[reddit-client] Server proxy failed:', e instanceof Error ? e.message : 'unknown');
    return null;
  }
}

// CORS proxies — these run in the user's BROWSER and may work from residential IPs
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://thingproxy.freeboard.io/fetch/',
];

/**
 * STRATEGY 4: Browser CORS proxies (least reliable)
 */
async function fetchViaCORSProxy(subreddit: string): Promise<ClientRedditResult | null> {
  const subLower = subreddit.toLowerCase().trim();
  if (!subLower || /[^a-zA-Z0-9_]/.test(subLower)) return null;

  const aboutUrl = `https://www.reddit.com/r/${encodeURIComponent(subLower)}/about.json`;
  const rulesUrl = `https://www.reddit.com/r/${encodeURIComponent(subLower)}/about/rules.json`;

  for (const proxy of CORS_PROXIES) {
    try {
      const fullAboutUrl = proxy + encodeURIComponent(aboutUrl);
      const fullRulesUrl = proxy + encodeURIComponent(rulesUrl);

      const [aboutRes, rulesRes] = await Promise.all([
        fetchWithTimeout(fullAboutUrl, 10000).catch(() => null),
        fetchWithTimeout(fullRulesUrl, 10000).catch(() => null),
      ]);

      let about: RedditAboutData | null = null;
      let rules: RedditRule[] = [];

      if (aboutRes?.ok) {
        try {
          const aboutJson = await aboutRes.json();
          if (aboutJson.data && !aboutJson.data.banned) {
            about = {
              title: aboutJson.data.title || '',
              display_name: aboutJson.data.display_name || subLower,
              subscribers: aboutJson.data.subscribers || 0,
              over18: aboutJson.data.over18 || false,
              public_description: aboutJson.data.public_description || '',
              icon_img: aboutJson.data.icon_img || null,
              community_icon: aboutJson.data.community_icon || null,
              banner_img: aboutJson.data.banner_img || null,
              active_user_count: aboutJson.data.active_user_count || null,
              created_utc: aboutJson.data.created_utc || 0,
              banned: aboutJson.data.banned || false,
              description: aboutJson.data.description || '',
            };
          }
        } catch {}
      }

      if (rulesRes?.ok) {
        try {
          const rulesJson = await rulesRes.json();
          rules = rulesJson.rules || [];
        } catch {}
      }

      if (about || rules.length > 0) {
        return { about, rules, fetchedAt: Date.now(), source: 'cors_proxy' };
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Parse manually pasted rules text into structured format.
 */
export function parseManualRules(text: string): { name: string; textOriginal: string }[] {
  if (!text.trim()) return [];
  
  const rules: { name: string; textOriginal: string }[] = [];
  const lines = text.split('\n');
  let currentRule: { name: string; textOriginal: string } | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const ruleMatch = trimmed.match(/^(\d+)\.\s*(.+)/) || 
                      trimmed.match(/^Rule\s*(\d+)[:.]\s*(.+)/i) ||
                      trimmed.match(/^[-•]\s*(.+)/);
    
    if (ruleMatch) {
      if (currentRule) rules.push(currentRule);
      const ruleText = ruleMatch[2] || ruleMatch[1] || trimmed;
      currentRule = { name: ruleText.substring(0, 80), textOriginal: trimmed };
    } else if (currentRule) {
      currentRule.textOriginal += '\n' + trimmed;
    } else {
      currentRule = { name: trimmed.substring(0, 80), textOriginal: trimmed };
    }
  }
  
  if (currentRule) rules.push(currentRule);
  return rules;
}

/**
 * Main entry point: Fetch Reddit subreddit data.
 * Tries multiple strategies in order of reliability.
 */
export async function fetchRedditFromBrowser(subreddit: string): Promise<ClientRedditResult | null> {
  const subLower = subreddit.toLowerCase().trim();
  if (!subLower || /[^a-zA-Z0-9_]/.test(subLower)) return null;

  // STRATEGY 1: Cloudflare Worker proxy (MOST RELIABLE)
  const workerResult = await fetchViaCloudflareWorker(subLower);
  if (workerResult && (workerResult.about || workerResult.rules.length > 0)) {
    console.log(`[reddit-client] Cloudflare Worker succeeded for r/${subLower}!`);
    return workerResult;
  }

  // STRATEGY 2: Direct fetch (Reddit sometimes allows CORS from browsers)
  console.log(`[reddit-client] Trying direct fetch for r/${subLower}...`);
  const directResult = await fetchDirect(subLower);
  if (directResult && (directResult.about || directResult.rules.length > 0)) {
    console.log(`[reddit-client] Direct fetch succeeded!`);
    return directResult;
  }

  // STRATEGY 3: Our server-side proxy (Edge + CORS intermediaries)
  console.log(`[reddit-client] Trying server proxy for r/${subLower}...`);
  const serverResult = await fetchViaServerProxy(subLower);
  if (serverResult && (serverResult.about || serverResult.rules.length > 0)) {
    console.log(`[reddit-client] Server proxy succeeded!`);
    return serverResult;
  }

  // STRATEGY 4: Browser CORS proxies
  console.log(`[reddit-client] Trying CORS proxies for r/${subLower}...`);
  const corsResult = await fetchViaCORSProxy(subLower);
  if (corsResult && (corsResult.about || corsResult.rules.length > 0)) {
    console.log(`[reddit-client] CORS proxy succeeded!`);
    return corsResult;
  }

  console.log(`[reddit-client] All fetch strategies failed for r/${subLower}`);
  return null;
}

export function extractRulesFromReddit(rules: RedditRule[]): { name: string; textOriginal: string }[] {
  return rules
    .filter(r => r.short_name || r.description)
    .map(r => ({
      name: r.short_name || 'Regla',
      textOriginal: r.description || '',
    }));
}

export function isSubredditValid(result: ClientRedditResult | null): boolean {
  if (!result) return false;
  if (result.about?.banned) return false;
  if (!result.about && result.rules.length === 0) return false;
  return true;
}
