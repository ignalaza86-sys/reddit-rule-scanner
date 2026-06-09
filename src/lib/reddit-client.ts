// Client-side Reddit data fetcher
// The user's browser CAN access Reddit, unlike Vercel servers which get blocked.
// We try direct fetch first, then fall back to CORS proxies.

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
  source: 'direct' | 'proxy' | 'unknown';
}

// CORS proxies to try if direct fetch fails
const CORS_PROXIES = [
  // Try direct fetch first (Reddit sometimes allows CORS for .json endpoints)
  '',
  // Free CORS proxies as fallback
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

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
 * Fetch Reddit subreddit data directly from the browser.
 * The browser can access Reddit - Vercel servers cannot.
 * Tries direct fetch first, then CORS proxies as fallback.
 */
export async function fetchRedditFromBrowser(subreddit: string): Promise<ClientRedditResult | null> {
  const subLower = subreddit.toLowerCase().trim();
  if (!subLower || /[^a-zA-Z0-9_]/.test(subLower)) return null;

  const aboutUrl = `https://www.reddit.com/r/${encodeURIComponent(subLower)}/about.json`;
  const rulesUrl = `https://www.reddit.com/r/${encodeURIComponent(subLower)}/about/rules.json`;

  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const proxy = CORS_PROXIES[i];
    try {
      const fullAboutUrl = proxy ? proxy + encodeURIComponent(aboutUrl) : aboutUrl;
      const fullRulesUrl = proxy ? proxy + encodeURIComponent(rulesUrl) : rulesUrl;

      // Fetch both endpoints in parallel, but don't fail if one errors
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
        } catch (e) {
          // JSON parse error, skip
        }
      }

      if (rulesRes?.ok) {
        try {
          const rulesJson = await rulesRes.json();
          rules = rulesJson.rules || [];
        } catch (e) {
          // JSON parse error, skip
        }
      }

      // If we got ANY data from this proxy, return it
      if (about || rules.length > 0) {
        const source: 'direct' | 'proxy' | 'unknown' = proxy === '' ? 'direct' : 'proxy';
        return { about, rules, fetchedAt: Date.now(), source };
      }
    } catch (e) {
      // This proxy failed, try next one
      continue;
    }
  }

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
