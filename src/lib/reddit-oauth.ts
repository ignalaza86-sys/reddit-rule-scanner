/**
 * Reddit OAuth API Client
 * 
 * Uses Reddit's official API with OAuth authentication (script app type).
 * This is the ONLY reliable way to get real subreddit rules from a server.
 * 
 * How it works:
 * 1. Authenticate with client_id + client_secret + username + password
 * 2. Get an access_token valid for 1 hour
 * 3. Use that token to call Reddit's API endpoints
 * 4. Token is cached in memory and auto-refreshed when expired
 * 
 * Required env vars:
 * - REDDIT_CLIENT_ID
 * - REDDIT_CLIENT_SECRET
 * - REDDIT_USERNAME
 * - REDDIT_PASSWORD
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface RedditOAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  fetchedAt: number; // when we got this token
}

export interface RedditSubredditAbout {
  title: string;
  display_name: string;
  subscribers: number;
  over18: boolean;
  public_description: string;
  description: string;
  icon_img: string | null;
  community_icon: string | null;
  banner_img: string | null;
  active_user_count: number | null;
  created_utc: number;
  submit_text: string;
  banned: boolean;
  quarantine: boolean;
  [key: string]: any; // allow extra fields
}

export interface RedditRuleData {
  short_name: string;
  description: string;
  priority: number;
  created_utc: number;
  violation_reason: string;
  link_flair_template_id: string | null;
  [key: string]: any;
}

export interface RedditSubredditData {
  about: RedditSubredditAbout | null;
  rules: RedditRuleData[];
  source: 'reddit_oauth' | 'reddit_oauth_no_rules';
  fetchedAt: number;
}

// ── OAuth Token Cache ────────────────────────────────────────────────────────

let cachedToken: RedditOAuthToken | null = null;

function isTokenValid(): boolean {
  if (!cachedToken) return false;
  // Consider token expired 5 minutes before actual expiry to be safe
  const expiresAt = cachedToken.fetchedAt + (cachedToken.expires_in - 300) * 1000;
  return Date.now() < expiresAt;
}

/**
 * Get a fresh OAuth access token from Reddit.
 * Caches the token in memory and reuses it until it expires.
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (isTokenValid() && cachedToken) {
    return cachedToken.access_token;
  }

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;

  if (!clientId || !clientSecret || !username || !password) {
    throw new Error(
      'Reddit OAuth credentials not configured. Set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD env vars.'
    );
  }

  console.log('[reddit-oauth] Fetching new access token...');

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'linux:reddit-rule-scanner:v1.0 (by /u/reddit-rule-scanner)',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username,
        password,
      }).toString(),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown');
      throw new Error(`Reddit OAuth failed with status ${response.status}: ${errorText}`);
    }

    const tokenData = await response.json();

    if (!tokenData.access_token) {
      throw new Error(`Reddit OAuth returned no access_token: ${JSON.stringify(tokenData)}`);
    }

    cachedToken = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || 'bearer',
      expires_in: tokenData.expires_in || 3600,
      scope: tokenData.scope || '*',
      fetchedAt: Date.now(),
    };

    console.log('[reddit-oauth] New access token obtained, expires in', cachedToken.expires_in, 'seconds');
    return cachedToken.access_token;
  } catch (error) {
    clearTimeout(timer);
    cachedToken = null; // Clear any stale token
    throw error;
  }
}

// ── API Methods ──────────────────────────────────────────────────────────────

/**
 * Fetch subreddit data (about + rules) using Reddit OAuth API.
 * This is the PRIMARY and most reliable way to get real data from Reddit.
 * Works from any server, including Vercel.
 */
export async function fetchSubredditWithOAuth(subreddit: string): Promise<RedditSubredditData> {
  const subLower = subreddit.toLowerCase().trim();

  if (!/^[a-zA-Z0-9_]+$/.test(subLower)) {
    throw new Error(`Invalid subreddit name: ${subLower}`);
  }

  const token = await getAccessToken();

  const aboutUrl = `https://oauth.reddit.com/r/${encodeURIComponent(subLower)}/about`;
  const rulesUrl = `https://oauth.reddit.com/r/${encodeURIComponent(subLower)}/about/rules`;

  // Fetch both about and rules in parallel
  const controller1 = new AbortController();
  const controller2 = new AbortController();
  const timer1 = setTimeout(() => controller1.abort(), 15000);
  const timer2 = setTimeout(() => controller2.abort(), 15000);

  try {
    const [aboutRes, rulesRes] = await Promise.all([
      fetch(aboutUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'linux:reddit-rule-scanner:v1.0 (by /u/reddit-rule-scanner)',
          'Accept': 'application/json',
        },
        signal: controller1.signal,
      }).finally(() => clearTimeout(timer1)),
      fetch(rulesUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'linux:reddit-rule-scanner:v1.0 (by /u/reddit-rule-scanner)',
          'Accept': 'application/json',
        },
        signal: controller2.signal,
      }).finally(() => clearTimeout(timer2)),
    ]);

    let about: RedditSubredditAbout | null = null;
    let rules: RedditRuleData[] = [];

    // Parse about data
    if (aboutRes.ok) {
      try {
        const aboutJson = await aboutRes.json();
        if (aboutJson.data && !aboutJson.data.banned && !aboutJson.data.quarantine) {
          about = {
            title: aboutJson.data.title || '',
            display_name: aboutJson.data.display_name || subLower,
            subscribers: aboutJson.data.subscribers || 0,
            over18: aboutJson.data.over18 || false,
            public_description: aboutJson.data.public_description || '',
            description: aboutJson.data.description || '',
            icon_img: aboutJson.data.icon_img || null,
            community_icon: aboutJson.data.community_icon || null,
            banner_img: aboutJson.data.banner_img || null,
            active_user_count: aboutJson.data.active_user_count || null,
            created_utc: aboutJson.data.created_utc || 0,
            submit_text: aboutJson.data.submit_text || '',
            banned: false,
            quarantine: false,
            ...aboutJson.data,
          };
        } else if (aboutJson.data?.banned) {
          throw new Error(`r/${subLower} is banned`);
        } else if (aboutJson.data?.quarantine) {
          throw new Error(`r/${subLower} is quarantined`);
        }
      } catch (parseErr) {
        if (parseErr instanceof Error && (parseErr.message.includes('banned') || parseErr.message.includes('quarantined'))) {
          throw parseErr;
        }
        console.error('[reddit-oauth] Error parsing about data:', parseErr);
      }
    }

    // Parse rules data
    if (rulesRes.ok) {
      try {
        const rulesJson = await rulesRes.json();
        if (rulesJson.rules && Array.isArray(rulesJson.rules)) {
          rules = rulesJson.rules.map((r: any) => ({
            short_name: r.short_name || '',
            description: r.description || '',
            priority: r.priority || 0,
            created_utc: r.created_utc || 0,
            violation_reason: r.violation_reason || '',
            link_flair_template_id: r.link_flair_template_id || null,
            ...r,
          }));
        }
      } catch (parseErr) {
        console.error('[reddit-oauth] Error parsing rules data:', parseErr);
      }
    }

    const hasData = about !== null || rules.length > 0;
    return {
      about,
      rules,
      source: hasData ? 'reddit_oauth' : 'reddit_oauth_no_rules',
      fetchedAt: Date.now(),
    };
  } catch (error) {
    // If token is expired/invalid, clear cache and retry once
    if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
      console.log('[reddit-oauth] Token may be invalid, clearing cache and retrying...');
      cachedToken = null;
      const newToken = await getAccessToken();
      
      // Retry the fetch with new token
      const retryController = new AbortController();
      const retryTimer = setTimeout(() => retryController.abort(), 15000);
      
      try {
        const [aboutRes2, rulesRes2] = await Promise.all([
          fetch(aboutUrl, {
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'User-Agent': 'linux:reddit-rule-scanner:v1.0 (by /u/reddit-rule-scanner)',
              'Accept': 'application/json',
            },
            signal: retryController.signal,
          }).finally(() => clearTimeout(retryTimer)),
          fetch(rulesUrl, {
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'User-Agent': 'linux:reddit-rule-scanner:v1.0 (by /u/reddit-rule-scanner)',
              'Accept': 'application/json',
            },
            signal: retryController.signal,
          }).finally(() => clearTimeout(retryTimer)),
        ]);

        let about: RedditSubredditAbout | null = null;
        let rules: RedditRuleData[] = [];

        if (aboutRes2.ok) {
          try {
            const aboutJson = await aboutRes2.json();
            if (aboutJson.data && !aboutJson.data.banned) {
              about = { ...aboutJson.data, banned: false, quarantine: false };
            }
          } catch {}
        }

        if (rulesRes2.ok) {
          try {
            const rulesJson = await rulesRes2.json();
            rules = (rulesJson.rules || []).map((r: any) => ({
              short_name: r.short_name || '',
              description: r.description || '',
              priority: r.priority || 0,
              created_utc: r.created_utc || 0,
              violation_reason: r.violation_reason || '',
              ...r,
            }));
          } catch {}
        }

        return {
          about,
          rules,
          source: (about || rules.length > 0) ? 'reddit_oauth' : 'reddit_oauth_no_rules',
          fetchedAt: Date.now(),
        };
      } catch (retryErr) {
        throw retryErr;
      }
    }
    
    throw error;
  }
}

/**
 * Check if Reddit OAuth is configured (has all required env vars).
 */
export function isOAuthConfigured(): boolean {
  return !!(
    process.env.REDDIT_CLIENT_ID &&
    process.env.REDDIT_CLIENT_SECRET &&
    process.env.REDDIT_USERNAME &&
    process.env.REDDIT_PASSWORD
  );
}

/**
 * Clear the cached OAuth token (useful after credential changes).
 */
export function clearOAuthToken(): void {
  cachedToken = null;
}
