/**
 * Cloudflare Worker: Reddit Rule Scanner Proxy
 * 
 * STRATEGY CHANGE: Reddit 403-blocks ALL cloud IPs (Vercel, AWS, Cloudflare).
 * This Worker CANNOT fetch Reddit directly. Instead, it works as:
 * 
 * 1. CORS-safe relay: The USER'S BROWSER fetches Reddit data (residential IP = not blocked)
 *    and POSTs it to this Worker, which stores it in KV and serves it to all other users.
 * 2. Cache layer: Once one user fetches rules for a subreddit, they're cached for all users.
 * 3. Redirect helper: Generates the Reddit URLs for the browser to fetch.
 * 
 * Flow:
 *   Browser → fetches reddit.com/r/X/about/rules.json (works! residential IP)
 *          → POSTs to this Worker with the data
 *          → Worker stores in KV cache, returns success
 *          → Next user → GET from Worker → gets cached data (no Reddit request needed)
 */

const CACHE_TTL = 3600; // 1 hour cache in KV

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders();

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // ─── HEALTH CHECK ───────────────────────────────────
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        service: 'reddit-rule-scanner-proxy',
        mode: 'browser-relay',
        timestamp: new Date().toISOString(),
      }), { headers: { ...JSON_HEADERS, ...cors } });
    }

    // ─── GET REDDIT URLS ────────────────────────────────
    // Returns the Reddit URLs the browser should fetch
    if (url.pathname === '/urls') {
      const subreddit = url.searchParams.get('subreddit')?.trim().replace(/^r\//, '');
      if (!subreddit) {
        return new Response(JSON.stringify({ error: 'Missing subreddit' }), { status: 400, headers: { ...JSON_HEADERS, ...cors } });
      }
      return new Response(JSON.stringify({
        aboutUrl: `https://www.reddit.com/r/${subreddit}/about.json`,
        rulesUrl: `https://www.reddit.com/r/${subreddit}/about/rules.json`,
        subreddit,
      }), { headers: { ...JSON_HEADERS, ...cors } });
    }

    // ─── GET CACHED RULES ───────────────────────────────
    if (request.method === 'GET' && (url.pathname === '/about' || url.pathname === '/rules' || url.pathname === '/both')) {
      const subreddit = url.searchParams.get('subreddit')?.trim().replace(/^r\//, '');
      if (!subreddit) {
        return new Response(JSON.stringify({ error: 'Missing subreddit' }), { status: 400, headers: { ...JSON_HEADERS, ...cors } });
      }

      // Try to get from KV cache
      const cacheKey = `subreddit:${subreddit.toLowerCase()}`;
      let cached = null;
      
      if (env.CACHE) {
        try {
          cached = await env.CACHE.get(cacheKey, { type: 'json' });
        } catch (e) {
          console.error('KV read error:', e);
        }
      }

      if (cached) {
        const age = Date.now() - (cached.cachedAt || 0);
        const isFresh = age < CACHE_TTL * 1000;

        if (url.pathname === '/about') {
          return new Response(JSON.stringify({ about: cached.about, source: 'cache', age, fresh: isFresh }), { headers: { ...JSON_HEADERS, ...cors } });
        }
        if (url.pathname === '/rules') {
          return new Response(JSON.stringify({ rules: cached.rules, source: 'cache', age, fresh: isFresh }), { headers: { ...JSON_HEADERS, ...cors } });
        }
        // /both
        return new Response(JSON.stringify({ 
          about: cached.about, rules: cached.rules, source: 'cache', 
          age, fresh: isFresh, fetchedAt: cached.fetchedAt, cachedAt: cached.cachedAt 
        }), { headers: { ...JSON_HEADERS, ...cors } });
      }

      // No cache — tell the client to fetch from browser
      return new Response(JSON.stringify({ 
        about: null, rules: [], source: 'none',
        message: 'No cached data. Fetch from browser and POST to /submit.',
        fetchUrls: {
          aboutUrl: `https://www.reddit.com/r/${subreddit}/about.json`,
          rulesUrl: `https://www.reddit.com/r/${subreddit}/about/rules.json`,
        }
      }), { headers: { ...JSON_HEADERS, ...cors } });
    }

    // ─── SUBMIT REDDIT DATA (from browser) ──────────────
    if (request.method === 'POST' && url.pathname === '/submit') {
      try {
        const body = await request.json();
        const { subreddit, about, rules } = body;

        if (!subreddit) {
          return new Response(JSON.stringify({ error: 'Missing subreddit' }), { status: 400, headers: { ...JSON_HEADERS, ...cors } });
        }

        const cacheKey = `subreddit:${subreddit.toLowerCase()}`;
        const cacheData = {
          subreddit: subreddit.toLowerCase(),
          about: about || null,
          rules: rules || [],
          fetchedAt: new Date().toISOString(),
          cachedAt: Date.now(),
        };

        // Store in KV cache
        if (env.CACHE) {
          try {
            await env.CACHE.put(cacheKey, JSON.stringify(cacheData), { expirationTtl: CACHE_TTL });
          } catch (e) {
            console.error('KV write error:', e);
          }
        }

        return new Response(JSON.stringify({ 
          status: 'ok', 
          message: `Cached data for r/${subreddit}`,
          rulesCount: (rules || []).length,
        }), { headers: { ...JSON_HEADERS, ...cors } });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...JSON_HEADERS, ...cors } });
      }
    }

    // ─── DIRECT PROXY (fallback, will likely get 403) ───
    // Try to fetch Reddit directly. This MIGHT work sometimes.
    if (request.method === 'GET' && url.pathname === '/direct') {
      const subreddit = url.searchParams.get('subreddit')?.trim().replace(/^r\//, '');
      const type = url.searchParams.get('type') || 'both'; // about | rules | both
      if (!subreddit) {
        return new Response(JSON.stringify({ error: 'Missing subreddit' }), { status: 400, headers: { ...JSON_HEADERS, ...cors } });
      }

      const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
      
      async function tryFetch(path) {
        // Try www.reddit.com first
        try {
          const res = await fetch(`https://www.reddit.com${path}`, {
            headers: { 'User-Agent': UA, 'Accept': 'text/html,application/json', 'Accept-Language': 'en-US,en;q=0.9' },
            redirect: 'follow',
          });
          if (res.ok) {
            const json = await res.json();
            return { data: json, source: 'www.reddit.com' };
          }
        } catch (e) {}

        // Try old.reddit.com
        try {
          const res = await fetch(`https://old.reddit.com${path}`, {
            headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Accept-Language': 'en-US,en;q=0.9' },
            redirect: 'follow',
          });
          if (res.ok) {
            const json = await res.json();
            return { data: json, source: 'old.reddit.com' };
          }
        } catch (e) {}

        return null;
      }

      try {
        let result = {};
        
        if (type === 'about' || type === 'both') {
          const aboutResult = await tryFetch(`/r/${subreddit}/about.json`);
          if (aboutResult) {
            result.about = extractAbout(aboutResult.data);
            result.aboutSource = aboutResult.source;
          }
        }

        if (type === 'rules' || type === 'both') {
          const rulesResult = await tryFetch(`/r/${subreddit}/about/rules.json`);
          if (rulesResult) {
            result.rules = extractRules(rulesResult.data);
            result.rulesSource = rulesResult.source;
          }
        }

        if (result.about || (result.rules && result.rules.length > 0)) {
          // Cache successful direct fetches too
          const cacheKey = `subreddit:${subreddit.toLowerCase()}`;
          if (env.CACHE) {
            try {
              await env.CACHE.put(cacheKey, JSON.stringify({
                subreddit: subreddit.toLowerCase(),
                about: result.about,
                rules: result.rules,
                fetchedAt: new Date().toISOString(),
                cachedAt: Date.now(),
              }), { expirationTtl: CACHE_TTL });
            } catch (e) {}
          }
          return new Response(JSON.stringify({ ...result, fetchedAt: new Date().toISOString() }), { headers: { ...JSON_HEADERS, ...cors } });
        }

        return new Response(JSON.stringify({ 
          error: 'Reddit blocked direct access. Use browser relay instead.',
          fetchUrls: {
            aboutUrl: `https://www.reddit.com/r/${subreddit}/about.json`,
            rulesUrl: `https://www.reddit.com/r/${subreddit}/about/rules.json`,
          }
        }), { status: 502, headers: { ...JSON_HEADERS, ...cors } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 502, headers: { ...JSON_HEADERS, ...cors } });
      }
    }

    // 404
    return new Response(JSON.stringify({ 
      error: 'Not found',
      endpoints: [
        'GET /health',
        'GET /urls?subreddit=name',
        'GET /both?subreddit=name (cached)',
        'POST /submit (save browser-fetched data)',
        'GET /direct?subreddit=name (try direct, may fail)',
      ],
    }), { status: 404, headers: { ...JSON_HEADERS, ...cors } });
  },
};

function extractRules(rulesData) {
  if (!rulesData?.data?.rules) return [];
  return rulesData.data.rules.map((rule, i) => ({
    index: i + 1,
    name: rule.short_name || `Rule ${i + 1}`,
    description: rule.description || '',
    reason: rule.violation_reason || '',
    priority: rule.priority || 0,
    createdUtc: rule.created_utc || null,
  }));
}

function extractAbout(aboutData) {
  if (!aboutData?.data) return null;
  const d = aboutData.data;
  return {
    name: d.display_name || d.name || '',
    title: d.title || '',
    description: d.public_description || d.description || '',
    subscribers: d.subscribers || 0,
    activeUsers: d.accounts_active || 0,
    over18: d.over18 || false,
    iconImage: d.icon_img || d.community_icon || null,
    bannerImage: d.banner_background_image || d.banner_img || null,
    createdUtc: d.created_utc || null,
    isBanned: d.banned_by !== null,
  };
}
