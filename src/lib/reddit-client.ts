// Client-side Reddit data fetcher
// The user's browser CAN access Reddit, unlike Vercel servers which get blocked.
// We try multiple approaches:
// 1. Our own server-side proxy (/api/reddit-proxy) — MOST RELIABLE, no CORS issues
// 2. Direct browser fetch to Reddit — usually fails (CORS)
// 3. Multiple CORS proxy services as fallback

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
  source: 'server_proxy' | 'direct' | 'cors_proxy' | 'unknown';
}

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
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
 * Fetch Reddit data using our own server-side proxy.
 * This is the MOST RELIABLE method — no CORS issues, server handles retries.
 */
async function fetchViaServerProxy(subreddit: string): Promise<ClientRedditResult | null> {
  try {
    const res = await fetchWithTimeout(`/api/reddit-proxy?subreddit=${encodeURIComponent(subreddit)}`, 30000);
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

// CORS proxies to try if server proxy fails
const CORS_PROXIES = [
  // corsproxy.io — generally the most reliable free proxy
  'https://corsproxy.io/?',
  // allorigins — sometimes works
  'https://api.allorigins.win/raw?url=',
  // cors-anywhere — requires activation but worth trying
  'https://cors-anywhere.herokuapp.com/',
  // thingproxy
  'https://thingproxy.freeboard.io/fetch/',
];

/**
 * Try fetching Reddit directly from browser via CORS proxies.
 * Less reliable than server proxy but worth trying as additional source.
 */
async function fetchViaCORSProxy(subreddit: string): Promise<ClientRedditResult | null> {
  const subLower = subreddit.toLowerCase().trim();
  if (!subLower || /[^a-zA-Z0-9_]/.test(subLower)) return null;

  const aboutUrl = `https://www.reddit.com/r/${encodeURIComponent(subLower)}/about.json`;
  const rulesUrl = `https://www.reddit.com/r/${encodeURIComponent(subLower)}/about/rules.json`;

  for (const proxy of CORS_PROXIES) {
    try {
      const fullAboutUrl = proxy ? proxy + encodeURIComponent(aboutUrl) : aboutUrl;
      const fullRulesUrl = proxy ? proxy + encodeURIComponent(rulesUrl) : rulesUrl;

      const [aboutRes, rulesRes] = await Promise.all([
        fetchWithTimeout(fullAboutUrl, 8000).catch(() => null),
        fetchWithTimeout(fullRulesUrl, 8000).catch(() => null),
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
 * Main entry point: Fetch Reddit subreddit data.
 * Priority: Server proxy → CORS proxies
 */
export async function fetchRedditFromBrowser(subreddit: string): Promise<ClientRedditResult | null> {
  const subLower = subreddit.toLowerCase().trim();
  if (!subLower || /[^a-zA-Z0-9_]/.test(subLower)) return null;

  // STRATEGY 1: Use our own server-side proxy (MOST RELIABLE)
  console.log(`[reddit-client] Fetching r/${subLower} via server proxy...`);
  const serverResult = await fetchViaServerProxy(subLower);
  if (serverResult && (serverResult.about || serverResult.rules.length > 0)) {
    console.log(`[reddit-client] Got data via server proxy: about=${!!serverResult.about}, rules=${serverResult.rules.length}`);
    return serverResult;
  }

  // STRATEGY 2: Try CORS proxies
  console.log(`[reddit-client] Server proxy failed, trying CORS proxies...`);
  const corsResult = await fetchViaCORSProxy(subLower);
  if (corsResult && (corsResult.about || corsResult.rules.length > 0)) {
    console.log(`[reddit-client] Got data via CORS proxy: about=${!!corsResult.about}, rules=${corsResult.rules.length}`);
    return corsResult;
  }

  console.log(`[reddit-client] All fetch strategies failed for r/${subLower}`);
  return null;
}

/**
 * Extract raw rules from Reddit API response into a simpler format
 */
export function extractRulesFromReddit(rules: RedditRule[]): { name: string; textOriginal: string }[] {
  return rules
    .filter(r => r.short_name || r.description)
    .map(r => ({
      name: r.short_name || 'Regla',
      textOriginal: r.description || '',
    }));
}

/**
 * Check if a subreddit appears to exist based on the about data
 */
export function isSubredditValid(result: ClientRedditResult | null): boolean {
  if (!result) return false;
  if (result.about?.banned) return false;
  if (!result.about && result.rules.length === 0) return false;
  return true;
}
