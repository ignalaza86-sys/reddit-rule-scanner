/**
 * Cloudflare Worker: Reddit API Proxy
 * 
 * Proxies requests to Reddit's public JSON API, bypassing CORS restrictions
 * and server-side IP blocks that affect Vercel deployments.
 * 
 * Endpoints:
 *   GET /about?subreddit=name  → Reddit /r/name/about.json
 *   GET /rules?subreddit=name  → Reddit /r/name/about/rules.json
 *   GET /both?subreddit=name   → Both about + rules in one call
 *   GET /health                → Health check
 * 
 * Deploy: wrangler deploy
 * 
 * Environment Variables (set via wrangler secret or dashboard):
 *   ALLOWED_ORIGINS - Comma-separated allowed origins (optional, defaults to *)
 *   API_KEY         - Optional API key for authentication (optional)
 */

const REDDIT_BASE = 'https://www.reddit.com';
const CACHE_TTL = 300; // 5 minutes in Cloudflare CDN cache

// User-Agent rotation to avoid Reddit rate limiting
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:126.0) Gecko/20100101 Firefox/126.0',
];

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = env.ALLOWED_ORIGINS || '*';
  
  if (allowedOrigins === '*') {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
      'Access-Control-Max-Age': '86400',
    };
  }
  
  const allowed = allowedOrigins.split(',').map(o => o.trim());
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || '*';
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    'Access-Control-Max-Age': '86400',
  };
}

async function fetchReddit(path, cache) {
  const url = `${REDDIT_BASE}${path}`;
  
  // Try cache first (Cloudflare CDN)
  const cacheKey = new Request(url, { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': getRandomUA(),
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Reddit API ${response.status}: ${text.substring(0, 200)}`);
  }
  
  const data = await response.json();
  
  // Cache successful responses
  const cacheResponse = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_TTL}`,
    },
  });
  
  // Store in Cloudflare cache (fire and forget)
  try {
    await cache.put(cacheKey, cacheResponse.clone());
  } catch (e) {
    // Cache write failures are non-critical
  }
  
  return data;
}

function extractRules(rulesData) {
  if (!rulesData || !rulesData.data || !rulesData.data.rules) {
    return [];
  }
  
  return rulesData.data.rules.map((rule, index) => ({
    index: index + 1,
    name: rule.short_name || `Rule ${index + 1}`,
    description: rule.description || '',
    reason: rule.violation_reason || '',
    priority: rule.priority || 0,
    createdUtc: rule.created_utc || null,
  }));
}

function extractAbout(aboutData) {
  if (!aboutData || !aboutData.data) {
    return null;
  }
  
  const d = aboutData.data;
  return {
    name: d.display_name || d.name || '',
    title: d.title || '',
    description: d.public_description || d.description || '',
    subscribers: d.subscribers || 0,
    activeUsers: d.accounts_active || 0,
    over18: d.over18 || false,
    headerImage: d.header_img || null,
    iconImage: d.icon_img || d.community_icon || null,
    bannerImage: d.banner_background_image || d.banner_img || null,
    primaryColor: d.primary_color || null,
    createdUtc: d.created_utc || null,
    submissionType: d.submission_type || 'any',
    allowImages: d.allow_images || false,
    allowVideo: d.allow_videocasts || false,
    isQuarantined: d.quarantine || false,
    isBanned: d.banned_by !== null,
    spoilerSelftext: d.spoilers_enabled || false,
    suggestedCommentSort: d.suggested_comment_sort || null,
    wikiEnabled: d.wiki_enabled || false,
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const cors = corsHeaders(request, env);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    
    // Only allow GET
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }
    
    // Health check
    if (path === '/health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        service: 'reddit-proxy-worker',
        timestamp: new Date().toISOString(),
      }), {
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }
    
    // Optional API key check
    if (env.API_KEY) {
      const apiKey = url.searchParams.get('key') || request.headers.get('X-API-Key');
      if (apiKey !== env.API_KEY) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...cors },
        });
      }
    }
    
    // Get subreddit name
    const subreddit = url.searchParams.get('subreddit')?.trim().replace(/^r\//, '');
    if (!subreddit && path !== '/health') {
      return new Response(JSON.stringify({ 
        error: 'Missing subreddit parameter',
        usage: '?subreddit=name',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }
    
    const cache = caches.default;
    
    try {
      // Route: /about
      if (path === '/about') {
        const data = await fetchReddit(`/r/${subreddit}/about.json`, cache);
        const about = extractAbout(data);
        return new Response(JSON.stringify({ about, source: 'reddit_public_api' }), {
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${CACHE_TTL}`,
            ...cors 
          },
        });
      }
      
      // Route: /rules
      if (path === '/rules') {
        const data = await fetchReddit(`/r/${subreddit}/about/rules.json`, cache);
        const rules = extractRules(data);
        return new Response(JSON.stringify({ rules, source: 'reddit_public_api' }), {
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${CACHE_TTL}`,
            ...cors 
          },
        });
      }
      
      // Route: /both (about + rules in one call)
      if (path === '/both') {
        const [aboutData, rulesData] = await Promise.all([
          fetchReddit(`/r/${subreddit}/about.json`, cache),
          fetchReddit(`/r/${subreddit}/about/rules.json`, cache),
        ]);
        
        const about = extractAbout(aboutData);
        const rules = extractRules(rulesData);
        
        return new Response(JSON.stringify({ 
          about, 
          rules, 
          source: 'reddit_public_api',
          fetchedAt: new Date().toISOString(),
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${CACHE_TTL}`,
            ...cors 
          },
        });
      }
      
      // Unknown route
      return new Response(JSON.stringify({ 
        error: 'Not found',
        endpoints: ['/about?subreddit=name', '/rules?subreddit=name', '/both?subreddit=name', '/health'],
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
      
    } catch (error) {
      // Check if it's a 404 from Reddit (subreddit doesn't exist)
      if (error.message.includes('404') || error.message.includes('403')) {
        return new Response(JSON.stringify({ 
          error: 'Subreddit not found or private',
          subreddit,
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...cors },
        });
      }
      
      // Rate limit
      if (error.message.includes('429')) {
        return new Response(JSON.stringify({ 
          error: 'Reddit rate limit hit, try again later',
          subreddit,
        }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', ...cors },
        });
      }
      
      console.error('Reddit proxy error:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch from Reddit',
        details: error.message,
        subreddit,
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }
  },
};
