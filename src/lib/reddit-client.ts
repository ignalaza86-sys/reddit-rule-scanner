// Client-side Reddit data fetcher
// STRATEGY:
// 1. Our own server-side proxy (/api/reddit-proxy) — tries from Vercel Edge + Node
// 2. Direct browser fetch to Reddit — usually fails (CORS) but worth trying  
// 3. Multiple CORS proxy services as fallback
// 4. If all fail, user can manually paste rules from Reddit

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
  source: 'server_proxy' | 'direct' | 'cors_proxy' | 'manual' | 'unknown';
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
 * Fetch Reddit data using our own server-side proxy.
 * The server tries multiple strategies (Edge + CORS proxies).
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
  // corsproxy.io — free tier, works from browser
  'https://corsproxy.io/?',
  // allorigins — alternative
  'https://api.allorigins.win/raw?url=',
  // thingproxy
  'https://thingproxy.freeboard.io/fetch/',
];

/**
 * Try fetching Reddit directly from browser via CORS proxies.
 * Works when user is on residential IP (not a cloud server).
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
 * Try fetching Reddit directly (no proxy).
 * This works if Reddit has enabled CORS for their JSON endpoints.
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
 * Parse manually pasted rules text into structured format.
 * User can paste the rules from Reddit's rules page.
 */
export function parseManualRules(text: string): { name: string; textOriginal: string }[] {
  if (!text.trim()) return [];
  
  // Try to parse structured text (numbered rules, or rules separated by blank lines)
  const rules: { name: string; textOriginal: string }[] = [];
  
  // Split by common rule separators
  const lines = text.split('\n');
  let currentRule: { name: string; textOriginal: string } | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check if this is a rule header (numbered, or starts with common patterns)
    const ruleMatch = trimmed.match(/^(\d+)\.\s*(.+)/) || 
                      trimmed.match(/^Rule\s*(\d+)[:.]\s*(.+)/i) ||
                      trimmed.match(/^[-•]\s*(.+)/);
    
    if (ruleMatch) {
      // Save previous rule
      if (currentRule) rules.push(currentRule);
      
      const ruleText = ruleMatch[2] || ruleMatch[1] || trimmed;
      currentRule = { name: ruleText.substring(0, 80), textOriginal: trimmed };
    } else if (currentRule) {
      // Continuation of previous rule
      currentRule.textOriginal += '\n' + trimmed;
    } else {
      // First rule without number
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

  // STRATEGY 1: Direct fetch (Reddit sometimes allows CORS from browsers)
  console.log(`[reddit-client] Trying direct fetch for r/${subLower}...`);
  const directResult = await fetchDirect(subLower);
  if (directResult && (directResult.about || directResult.rules.length > 0)) {
    console.log(`[reddit-client] Direct fetch succeeded!`);
    return directResult;
  }

  // STRATEGY 2: Our server-side proxy (Edge + CORS intermediaries)
  console.log(`[reddit-client] Trying server proxy for r/${subLower}...`);
  const serverResult = await fetchViaServerProxy(subLower);
  if (serverResult && (serverResult.about || serverResult.rules.length > 0)) {
    console.log(`[reddit-client] Server proxy succeeded!`);
    return serverResult;
  }

  // STRATEGY 3: Browser CORS proxies
  console.log(`[reddit-client] Trying CORS proxies for r/${subLower}...`);
  const corsResult = await fetchViaCORSProxy(subLower);
  if (corsResult && (corsResult.about || corsResult.rules.length > 0)) {
    console.log(`[reddit-client] CORS proxy succeeded!`);
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
