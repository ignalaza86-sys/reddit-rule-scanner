// Client-side Reddit data fetcher
// STRATEGY (in order of priority):
// 1. Cloudflare Worker cache — if another user already fetched this subreddit, use cached data
// 2. Direct browser fetch to Reddit — user's browser has residential IP, Reddit doesn't block it
//    → Then POST the data to our Worker for caching (other users benefit)
// 3. CORS proxy services as fallback
// 4. Our server-side proxy (/api/reddit-proxy)
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
  source: 'cloudflare_cache' | 'cloudflare_worker' | 'direct' | 'cors_proxy' | 'server_proxy' | 'manual' | 'unknown';
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
 * STRATEGY 1: Check Cloudflare Worker cache
 * If another user already fetched this subreddit's rules, they're cached in the Worker's KV store.
 */
async function fetchFromWorkerCache(subreddit: string): Promise<ClientRedditResult | null> {
  const workerUrl = process.env.NEXT_PUBLIC_REDDIT_PROXY_URL;
  if (!workerUrl) return null;

  const subLower = subreddit.toLowerCase().trim();
  if (!subLower || /[^a-zA-Z0-9_]/.test(subLower)) return null;

  try {
    const url = `${workerUrl}/both?subreddit=${encodeURIComponent(subLower)}`;
    const res = await fetchWithTimeout(url, 10000);
    if (!res.ok) return null;

    const data = await res.json();

    // If cached data exists
    if (data.source === 'cache' && (data.about || (data.rules && data.rules.length > 0))) {
      const about = data.about ? mapWorkerAbout(data.about) : null;
      const rules = (data.rules || []).map(mapWorkerRule);

      console.log(`[reddit-client] Worker cache hit for r/${subLower}!`);
      return { about, rules, fetchedAt: Date.now(), source: 'cloudflare_cache' };
    }

    // No cache — need to fetch from browser
    return null;
  } catch (e) {
    console.log('[reddit-client] Worker cache check failed:', e instanceof Error ? e.message : 'unknown');
    return null;
  }
}

/**
 * Submit browser-fetched data to Worker for caching
 */
async function submitToWorkerCache(subreddit: string, about: any, rules: any[]): Promise<void> {
  const workerUrl = process.env.NEXT_PUBLIC_REDDIT_PROXY_URL;
  if (!workerUrl) return;

  try {
    await fetch(`${workerUrl}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subreddit, about, rules }),
    });
    console.log(`[reddit-client] Cached r/${subreddit} data in Worker`);
  } catch (e) {
    console.log('[reddit-client] Worker cache submit failed (non-critical):', e instanceof Error ? e.message : 'unknown');
  }
}

/**
 * STRATEGY 2: Direct browser fetch to Reddit
 * The USER'S BROWSER has a residential IP → Reddit does NOT block these.
 * This is the MOST RELIABLE way to get real data.
 * After fetching, we cache the data in the Worker for other users.
 */
async function fetchDirectFromReddit(subreddit: string): Promise<ClientRedditResult | null> {
  const subLower = subreddit.toLowerCase().trim();
  if (!subLower || /[^a-zA-Z0-9_]/.test(subLower)) return null;

  try {
    const aboutUrl = `https://www.reddit.com/r/${encodeURIComponent(subLower)}/about.json`;
    const rulesUrl = `https://www.reddit.com/r/${encodeURIComponent(subLower)}/about/rules.json`;

    const [aboutRes, rulesRes] = await Promise.all([
      fetchWithTimeout(aboutUrl, 10000).catch(() => null),
      fetchWithTimeout(rulesUrl, 10000).catch(() => null),
    ]);

    let about: RedditAboutData | null = null;
    let aboutRaw: any = null;
    let rules: RedditRule[] = [];
    let rulesRaw: any[] = [];

    if (aboutRes?.ok) {
      try {
        const json = await aboutRes.json();
        if (json.data && !json.data.banned_by) {
          aboutRaw = json.data;
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
        if (json.data && json.data.rules) {
          rulesRaw = json.data.rules;
          rules = json.data.rules.map((r: any) => ({
            short_name: r.short_name || '',
            description: r.description || '',
            priority: r.priority || 0,
            created_utc: r.created_utc || 0,
            violation_reason: r.violation_reason || '',
          }));
        }
      } catch {}
    }

    if (about || rules.length > 0) {
      // Cache in Worker for other users (fire and forget)
      submitToWorkerCache(subLower, aboutRaw, rulesRaw);

      console.log(`[reddit-client] Direct Reddit fetch succeeded for r/${subLower}! Got ${rules.length} rules`);
      return { about, rules, fetchedAt: Date.now(), source: 'direct' };
    }
  } catch (e) {
    console.log('[reddit-client] Direct Reddit fetch failed:', e instanceof Error ? e.message : 'unknown');
  }
  return null;
}

// CORS proxies — run in the user's BROWSER
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://thingproxy.freeboard.io/fetch/',
];

/**
 * STRATEGY 3: Browser CORS proxies (backup)
 */
async function fetchViaCORSProxy(subreddit: string): Promise<ClientRedditResult | null> {
  const subLower = subreddit.toLowerCase().trim();
  if (!subLower || /[^a-zA-Z0-9_]/.test(subLower)) return null;

  const aboutUrl = `https://www.reddit.com/r/${encodeURIComponent(subLower)}/about.json`;
  const rulesUrl = `https://www.reddit.com/r/${encodeURIComponent(subLower)}/about/rules.json`;

  for (const proxy of CORS_PROXIES) {
    try {
      const [aboutRes, rulesRes] = await Promise.all([
        fetchWithTimeout(proxy + encodeURIComponent(aboutUrl), 10000).catch(() => null),
        fetchWithTimeout(proxy + encodeURIComponent(rulesUrl), 10000).catch(() => null),
      ]);

      let about: RedditAboutData | null = null;
      let rules: RedditRule[] = [];
      let aboutRaw: any = null;
      let rulesRaw: any[] = [];

      if (aboutRes?.ok) {
        try {
          const aboutJson = await aboutRes.json();
          if (aboutJson.data && !aboutJson.data.banned_by) {
            aboutRaw = aboutJson.data;
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
          if (rulesJson.data && rulesJson.data.rules) {
            rulesRaw = rulesJson.data.rules;
            rules = rulesJson.data.rules.map((r: any) => ({
              short_name: r.short_name || '',
              description: r.description || '',
              priority: r.priority || 0,
              created_utc: r.created_utc || 0,
              violation_reason: r.violation_reason || '',
            }));
          }
        } catch {}
      }

      if (about || rules.length > 0) {
        // Cache in Worker for other users
        submitToWorkerCache(subLower, aboutRaw, rulesRaw);

        return { about, rules, fetchedAt: Date.now(), source: 'cors_proxy' };
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * STRATEGY 4: Server-side proxy (our Vercel Edge function)
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

// Map Worker's normalized about format to our RedditAboutData interface
function mapWorkerAbout(a: any): RedditAboutData {
  return {
    title: a.title || '',
    display_name: a.name || a.display_name || '',
    subscribers: a.subscribers || 0,
    over18: a.over18 || false,
    public_description: a.description || a.public_description || '',
    icon_img: a.iconImage || a.icon_img || null,
    community_icon: a.iconImage || a.community_icon || null,
    banner_img: a.bannerImage || a.banner_img || null,
    active_user_count: a.activeUsers || a.active_user_count || null,
    created_utc: a.createdUtc || a.created_utc || 0,
    banned: a.isBanned || false,
    description: a.description || '',
  };
}

// Map Worker's normalized rule format to our RedditRule interface
function mapWorkerRule(r: any): RedditRule {
  return {
    short_name: r.name || r.short_name || '',
    description: r.description || '',
    priority: r.priority || 0,
    created_utc: r.createdUtc || r.created_utc || 0,
    violation_reason: r.reason || r.violation_reason || '',
  };
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

  // STRATEGY 1: Check Worker cache (fastest — another user may have already fetched)
  const cachedResult = await fetchFromWorkerCache(subLower);
  if (cachedResult && (cachedResult.about || cachedResult.rules.length > 0)) {
    return cachedResult;
  }

  // STRATEGY 2: CORS proxies (primary client-side method — Reddit blocks direct browser fetches via CORS)
  console.log(`[reddit-client] No cache, trying CORS proxies for r/${subLower}...`);
  const corsResult = await fetchViaCORSProxy(subLower);
  if (corsResult && (corsResult.about || corsResult.rules.length > 0)) {
    console.log(`[reddit-client] CORS proxy succeeded!`);
    return corsResult;
  }

  // STRATEGY 3: Direct fetch from Reddit (will likely fail due to CORS from browser,
  // but works in some environments like extensions or if Reddit adds CORS headers)
  console.log(`[reddit-client] Trying direct fetch for r/${subLower}...`);
  const directResult = await fetchDirectFromReddit(subLower);
  if (directResult && (directResult.about || directResult.rules.length > 0)) {
    console.log(`[reddit-client] Direct fetch succeeded!`);
    return directResult;
  }

  // STRATEGY 4: Server-side proxy (usually fails from Vercel but worth trying)
  console.log(`[reddit-client] Trying server proxy for r/${subLower}...`);
  const serverResult = await fetchViaServerProxy(subLower);
  if (serverResult && (serverResult.about || serverResult.rules.length > 0)) {
    console.log(`[reddit-client] Server proxy succeeded!`);
    return serverResult;
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
