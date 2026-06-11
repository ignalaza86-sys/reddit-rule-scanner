/**
 * Cloudflare Worker: Reddit Rule Scanner Proxy
 * 
 * STRATEGY: HTML Scraping + Browser Relay
 * 
 * Reddit 403-blocks ALL API (.json) requests from cloud IPs.
 * BUT Reddit's HTML pages on old.reddit.com often work from cloud IPs!
 * 
 * Approach:
 * 1. FIRST: Try scraping old.reddit.com HTML pages (rules page)
 * 2. SECOND: Try www.reddit.com with mobile UA (sometimes works)
 * 3. Cache everything in KV for all users
 * 4. Fallback: Accept browser-submitted data via POST /submit
 */

const CACHE_TTL = 7200; // 2 hours cache in KV

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Browser-like User Agents to rotate
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
];

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

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
        mode: 'html-scraper',
        timestamp: new Date().toISOString(),
      }), { headers: { ...JSON_HEADERS, ...cors } });
    }

    // ─── GET CACHED RULES ───────────────────────────────
    if (request.method === 'GET' && (url.pathname === '/about' || url.pathname === '/rules' || url.pathname === '/both')) {
      const subreddit = url.searchParams.get('subreddit')?.trim().replace(/^r\//, '');
      if (!subreddit) {
        return new Response(JSON.stringify({ error: 'Missing subreddit' }), { status: 400, headers: { ...JSON_HEADERS, ...cors } });
      }

      const subLower = subreddit.toLowerCase();

      // Try KV cache first
      let cached = null;
      if (env.CACHE) {
        try {
          cached = await env.CACHE.get(`subreddit:${subLower}`, { type: 'json' });
        } catch (e) {
          console.error('KV read error:', e);
        }
      }

      if (cached && cached.rules && cached.rules.length > 0) {
        const age = Date.now() - (cached.cachedAt || 0);
        if (url.pathname === '/about') {
          return new Response(JSON.stringify({ about: cached.about, source: 'cache', age }), { headers: { ...JSON_HEADERS, ...cors } });
        }
        if (url.pathname === '/rules') {
          return new Response(JSON.stringify({ rules: cached.rules, source: 'cache', age }), { headers: { ...JSON_HEADERS, ...cors } });
        }
        return new Response(JSON.stringify({ 
          about: cached.about, rules: cached.rules, source: 'cache', 
          age, fetchedAt: cached.fetchedAt, cachedAt: cached.cachedAt 
        }), { headers: { ...JSON_HEADERS, ...cors } });
      }

      // No cache — try to scrape Reddit HTML
      console.log(`[worker] No cache for r/${subLower}, trying HTML scrape...`);
      
      const scraped = await scrapeSubreddit(subLower, env);
      
      if (scraped && (scraped.about || (scraped.rules && scraped.rules.length > 0))) {
        // Cache the scraped data
        await cacheData(env, subLower, scraped);
        
        if (url.pathname === '/about') {
          return new Response(JSON.stringify({ about: scraped.about, source: scraped.source }), { headers: { ...JSON_HEADERS, ...cors } });
        }
        if (url.pathname === '/rules') {
          return new Response(JSON.stringify({ rules: scraped.rules, source: scraped.source }), { headers: { ...JSON_HEADERS, ...cors } });
        }
        return new Response(JSON.stringify({ 
          about: scraped.about, rules: scraped.rules, source: scraped.source,
          fetchedAt: scraped.fetchedAt,
        }), { headers: { ...JSON_HEADERS, ...cors } });
      }

      // Nothing worked
      return new Response(JSON.stringify({ 
        about: null, rules: [], source: 'none',
        message: 'Could not fetch from Reddit. Browser relay needed.',
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

        const subLower = subreddit.toLowerCase();
        
        const cacheData = {
          subreddit: subLower,
          about: about || null,
          rules: rules || [],
          fetchedAt: new Date().toISOString(),
          cachedAt: Date.now(),
          source: 'browser-relay',
        };

        await cacheData(env, subLower, cacheData);

        return new Response(JSON.stringify({ 
          status: 'ok', 
          message: `Cached data for r/${subLower}`,
          rulesCount: (rules || []).length,
        }), { headers: { ...JSON_HEADERS, ...cors } });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...JSON_HEADERS, ...cors } });
      }
    }

    // ─── DELETE CACHED DATA ─────────────────────────────
    if (request.method === 'DELETE' && url.pathname === '/cache') {
      const subreddit = url.searchParams.get('subreddit')?.trim().replace(/^r\//, '');
      if (!subreddit) {
        return new Response(JSON.stringify({ error: 'Missing subreddit' }), { status: 400, headers: { ...JSON_HEADERS, ...cors } });
      }
      const subLower = subreddit.toLowerCase();
      if (env.CACHE) {
        try {
          await env.CACHE.delete(`subreddit:${subLower}`);
        } catch (e) {}
      }
      return new Response(JSON.stringify({ status: 'ok', message: `Cache cleared for r/${subLower}` }), { headers: { ...JSON_HEADERS, ...cors } });
    }

    // ─── DEBUG ENDPOINT — shows raw HTML Worker receives ─
    if (url.pathname === '/debug') {
      const subreddit = url.searchParams.get('subreddit') || 'funny';
      const subLower = subreddit.toLowerCase();
      const ua = getRandomUA();
      
      try {
        const res = await fetch(`https://old.reddit.com/r/${subLower}/about/rules/`, {
          headers: {
            'User-Agent': ua,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          redirect: 'follow',
        });
        
        const html = await res.text();
        const isBlocked = html.includes('whoa there') || html.includes('blocked due to') || html.includes('network policy');
        
        // Return first 3000 chars of HTML + analysis
        return new Response(JSON.stringify({
          subreddit: subLower,
          status: res.status,
          contentType: res.headers.get('content-type'),
          isBlocked,
          htmlLength: html.length,
          htmlPreview: html.substring(0, 3000),
          // Check for rule-related content
          hasRulesPage: html.includes('rulespage') || html.includes('rules-list') || html.includes('rule-item'),
          hasRuleClass: html.includes('class="rule') || html.includes("class='rule"),
          hasShortName: html.includes('short_name') || html.includes('shortName'),
          hasDataRules: html.includes('"rules"'),
          // Check if it's a redirect/login page
          isLoginPage: html.includes('login') && html.length < 5000,
        }, null, 2), { headers: { ...JSON_HEADERS, ...cors } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { headers: { ...JSON_HEADERS, ...cors } });
      }
    }

    // ─── TEST ENDPOINT ──────────────────────────────────
    if (url.pathname === '/test') {
      const subreddit = url.searchParams.get('subreddit') || 'funny';
      const subLower = subreddit.toLowerCase();
      
      const results = { subreddit: subLower, attempts: [], finalResult: null };
      
      // Try each method and log results
      const methods = [
        { name: 'old.reddit.com HTML rules', url: `https://old.reddit.com/r/${subLower}/about/rules/`, type: 'html' },
        { name: 'old.reddit.com HTML main', url: `https://old.reddit.com/r/${subLower}/`, type: 'html' },
        { name: 'www.reddit.com .json rules', url: `https://www.reddit.com/r/${subLower}/about/rules.json`, type: 'json' },
        { name: 'www.reddit.com .json about', url: `https://www.reddit.com/r/${subLower}/about.json`, type: 'json' },
        { name: 'api.reddit.com rules', url: `https://api.reddit.com/r/${subLower}/about/rules`, type: 'json' },
      ];
      
      for (const method of methods) {
        try {
          const ua = getRandomUA();
          const res = await fetch(method.url, {
            headers: {
              'User-Agent': ua,
              'Accept': method.type === 'html' ? 'text/html,application/xhtml+xml' : 'application/json',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            redirect: 'follow',
          });
          results.attempts.push({
            method: method.name,
            status: res.status,
            contentType: res.headers.get('content-type'),
            contentLength: res.headers.get('content-length'),
            ok: res.ok,
          });
        } catch (e) {
          results.attempts.push({
            method: method.name,
            error: e.message,
            ok: false,
          });
        }
      }
      
      return new Response(JSON.stringify(results, null, 2), { headers: { ...JSON_HEADERS, ...cors } });
    }

    // 404
    return new Response(JSON.stringify({ 
      error: 'Not found',
      endpoints: [
        'GET /health',
        'GET /both?subreddit=name (auto: cache → scrape → relay)',
        'GET /about?subreddit=name',
        'GET /rules?subreddit=name',
        'POST /submit (save browser-fetched data)',
        'DELETE /cache?subreddit=name',
        'GET /test?subreddit=name (debug endpoint)',
      ],
    }), { status: 404, headers: { ...JSON_HEADERS, ...cors } });
  },
};

// ═══════════════════════════════════════════════════════════
// HTML SCRAPER — The core of this Worker
// ═══════════════════════════════════════════════════════════

async function scrapeSubreddit(subreddit, env) {
  let about = null;
  let rules = [];
  let source = 'none';

  // ATTEMPT 1: Scrape old.reddit.com rules page HTML
  try {
    console.log(`[scraper] Attempting old.reddit.com HTML scrape for r/${subreddit}...`);
    const ua = getRandomUA();
    const rulesRes = await fetch(`https://old.reddit.com/r/${subreddit}/about/rules/`, {
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    });

    if (rulesRes.ok) {
      const html = await rulesRes.text();
      const scrapedRules = parseRulesHTML(html);
      if (scrapedRules.length > 0) {
        rules = scrapedRules;
        source = 'html-scrape-old';
        console.log(`[scraper] Got ${rules.length} rules from old.reddit.com HTML!`);
      }
    } else {
      console.log(`[scraper] old.reddit.com rules returned status ${rulesRes.status}`);
    }
  } catch (e) {
    console.error('[scraper] old.reddit.com rules error:', e.message);
  }

  // ATTEMPT 2: Scrape www.reddit.com rules page (new UI)
  if (rules.length === 0) {
    try {
      console.log(`[scraper] Trying www.reddit.com HTML scrape for r/${subreddit}...`);
      const ua = getRandomUA();
      const rulesRes = await fetch(`https://www.reddit.com/r/${subreddit}/about/rules/`, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      });

      if (rulesRes.ok) {
        const html = await rulesRes.text();
        // New Reddit embeds data in <script id="data"> or __NEXT_DATA__
        const extractedFromScript = extractFromScriptTag(html);
        if (extractedFromScript.rules && extractedFromScript.rules.length > 0) {
          rules = extractedFromScript.rules;
          about = extractedFromScript.about;
          source = 'html-scrape-www';
          console.log(`[scraper] Got ${rules.length} rules from www.reddit.com script data!`);
        } else {
          // Try parsing HTML directly
          const scrapedRules = parseRulesHTML(html);
          if (scrapedRules.length > 0) {
            rules = scrapedRules;
            source = 'html-scrape-www';
            console.log(`[scraper] Got ${rules.length} rules from www.reddit.com HTML!`);
          }
        }
      }
    } catch (e) {
      console.error('[scraper] www.reddit.com rules error:', e.message);
    }
  }

  // ATTEMPT 3: Try JSON API with browser-like headers (sometimes works)
  if (rules.length === 0) {
    try {
      console.log(`[scraper] Trying JSON API for r/${subreddit}...`);
      const ua = getRandomUA();
      const [aboutRes, rulesRes] = await Promise.all([
        fetch(`https://www.reddit.com/r/${subreddit}/about.json`, {
          headers: { 'User-Agent': ua, 'Accept': 'application/json' },
          redirect: 'follow',
        }).catch(() => null),
        fetch(`https://www.reddit.com/r/${subreddit}/about/rules.json`, {
          headers: { 'User-Agent': ua, 'Accept': 'application/json' },
          redirect: 'follow',
        }).catch(() => null),
      ]);

      if (rulesRes?.ok) {
        const rulesJson = await rulesRes.json();
        if (rulesJson?.data?.rules) {
          rules = rulesJson.data.rules.map((rule, i) => ({
            index: i + 1,
            name: rule.short_name || `Rule ${i + 1}`,
            description: rule.description || '',
            reason: rule.violation_reason || '',
            priority: rule.priority || 0,
            createdUtc: rule.created_utc || null,
          }));
          source = 'json-api';
          console.log(`[scraper] Got ${rules.length} rules from JSON API!`);
        }
      }

      if (aboutRes?.ok) {
        const aboutJson = await aboutRes.json();
        if (aboutJson?.data) {
          about = extractAboutFromJSON(aboutJson.data);
        }
      }
    } catch (e) {
      console.error('[scraper] JSON API error:', e.message);
    }
  }

  // ATTEMPT 4: Get about info from main page if we have rules but no about
  if (rules.length > 0 && !about) {
    try {
      const ua = getRandomUA();
      const mainRes = await fetch(`https://old.reddit.com/r/${subreddit}/`, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      });
      if (mainRes.ok) {
        const html = await mainRes.text();
        about = extractAboutFromHTML(html);
      }
    } catch (e) {}
  }

  if (rules.length > 0 || about) {
    return { about, rules, source, fetchedAt: new Date().toISOString() };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════
// HTML PARSERS
// ═══════════════════════════════════════════════════════════

/**
 * Parse rules from Reddit HTML page (both old and new Reddit)
 * Old Reddit: rules are in <div class="rulespage"> or <ul class="rules-list">
 * New Reddit: rules may be in different elements
 */
function parseRulesHTML(html) {
  const rules = [];
  
  // Method 1: Find rules in old Reddit format
  // Old Reddit uses: <div class="rule"> or <li class="rule-item">
  // Pattern: short_name in a heading, description in a paragraph
  
  // Try to find rule entries with regex
  // Old Reddit pattern: <div class="rule-title">Name</div> <div class="rule-description">Desc</div>
  // Also: <h3 class="h4"> or <div class="md">
  
  // Pattern for old.reddit.com rules page
  const ruleBlockRegex = /<div[^>]*class="[^"]*rule[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="[^"]*md[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let match;
  let index = 1;
  
  while ((match = ruleBlockRegex.exec(html)) !== null && index <= 30) {
    const name = cleanHTML(match[1]).trim();
    const description = cleanHTML(match[2]).trim();
    if (name || description) {
      rules.push({
        index,
        name: name || `Rule ${index}`,
        description: description || '',
        reason: '',
        priority: 0,
        createdUtc: null,
      });
      index++;
    }
  }
  
  // Method 2: Try different patterns if Method 1 found nothing
  if (rules.length === 0) {
    // Look for "Rules" section in the sidebar (common on old Reddit main page)
    const rulesSectionRegex = /<div[^>]*class="[^"]*rules[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>)/gi;
    
    // Pattern: numbered rules like "1. Rule name" or rule items in a list
    const ruleListRegex = /<li[^>]*class="[^"]*rule[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
    while ((match = ruleListRegex.exec(html)) !== null && rules.length < 30) {
      const content = match[1];
      // Try to extract name and description
      const nameMatch = content.match(/<[^>]*class="[^"]*(?:title|name|heading)[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);
      const descMatch = content.match(/<[^>]*class="[^"]*(?:description|text|body|md)[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);
      
      const name = nameMatch ? cleanHTML(nameMatch[1]).trim() : '';
      const description = descMatch ? cleanHTML(descMatch[1]).trim() : cleanHTML(content).trim();
      
      if (name || description) {
        rules.push({
          index: rules.length + 1,
          name: name || `Rule ${rules.length + 1}`,
          description,
          reason: '',
          priority: 0,
          createdUtc: null,
        });
      }
    }
  }
  
  // Method 3: Generic extraction - look for any structured rule-like content
  if (rules.length === 0) {
    // Try to find rules in new Reddit's embedded JSON data
    // New Reddit sometimes has <script id="data"> or window.___r = {...}
    const scriptData = extractFromScriptTag(html);
    if (scriptData.rules && scriptData.rules.length > 0) {
      return scriptData.rules;
    }
  }

  // Method 4: Look for rule text patterns in plain text
  if (rules.length === 0) {
    // Remove all HTML tags and look for numbered rules
    const plainText = html.replace(/<script[\s\S]*?<\/script>/gi, '')
                          .replace(/<style[\s\S]*?<\/style>/gi, '')
                          .replace(/<[^>]+>/g, '\n')
                          .replace(/&nbsp;/g, ' ')
                          .replace(/&amp;/g, '&')
                          .replace(/&lt;/g, '<')
                          .replace(/&gt;/g, '>')
                          .replace(/&quot;/g, '"');
    
    // Find lines that look like rules
    const ruleRegex = /^\s*(\d+)\.\s+(.+)$/gm;
    let ruleMatch;
    while ((ruleMatch = ruleRegex.exec(plainText)) !== null && rules.length < 20) {
      const text = ruleMatch[2].trim();
      if (text.length > 5 && text.length < 2000) {
        rules.push({
          index: rules.length + 1,
          name: text.substring(0, 100),
          description: text,
          reason: '',
          priority: 0,
          createdUtc: null,
        });
      }
    }
  }

  return rules;
}

/**
 * Extract data from new Reddit's embedded script tags
 * New Reddit embeds subreddit data in window.___r or <script id="data">
 */
function extractFromScriptTag(html) {
  const result = { about: null, rules: [] };
  
  // Try window.___r = {...} pattern
  try {
    const rDataMatch = html.match(/window\.___r\s*=\s*({[\s\S]*?});?\s*<\/script>/);
    if (rDataMatch) {
      const data = JSON.parse(rDataMatch[1]);
      // Navigate the data structure to find rules
      const models = data?.data?.subredditAboutInfo || data?.subredditAboutRules;
      if (models) {
        // Try to extract rules
        if (models.rules?.rules) {
          result.rules = models.rules.rules.map((r, i) => ({
            index: i + 1,
            name: r.shortName || r.name || `Rule ${i + 1}`,
            description: r.description || '',
            reason: r.violationReason || '',
            priority: r.priority || 0,
            createdUtc: r.createdUtc || null,
          }));
        }
        // Try to extract about
        if (models.subreddit) {
          const s = models.subreddit;
          result.about = {
            name: s.name || s.displayText || '',
            title: s.title || '',
            description: s.publicDescription || s.description || '',
            subscribers: s.subscribers || 0,
            activeUsers: s.accountsActive || 0,
            over18: s.isNSFW || false,
            iconImage: s.icon?.url || s.communityIcon || null,
            bannerImage: s.banner?.url || null,
            createdUtc: s.createdAt || null,
            isBanned: false,
          };
        }
      }
    }
  } catch (e) {
    // Failed to parse ___r data
  }

  // Try <script id="data"> pattern
  if (result.rules.length === 0) {
    try {
      const dataScriptMatch = html.match(/<script\s+id="data"\s+type="text\/javascript"[^>]*>([\s\S]*?)<\/script>/i);
      if (dataScriptMatch) {
        const content = dataScriptMatch[1];
        const jsonMatch = content.match(/=\s*({[\s\S]*});?\s*$/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[1]);
          // Navigate structure to find rules
          const subs = data?.data?.subreddit || data?.subreddit;
          if (subs?.rules) {
            result.rules = subs.rules.map((r, i) => ({
              index: i + 1,
              name: r.shortName || r.short_name || r.name || `Rule ${i + 1}`,
              description: r.description || '',
              reason: r.violationReason || r.violation_reason || '',
              priority: r.priority || 0,
              createdUtc: r.createdUtc || r.created_utc || null,
            }));
          }
        }
      }
    } catch (e) {
      // Failed to parse data script
    }
  }

  return result;
}

/**
 * Extract about info from old Reddit HTML main page
 */
function extractAboutFromHTML(html) {
  const about = {
    name: '',
    title: '',
    description: '',
    subscribers: 0,
    activeUsers: 0,
    over18: false,
    iconImage: null,
    bannerImage: null,
    createdUtc: null,
    isBanned: false,
  };

  // Extract subreddit name
  const nameMatch = html.match(/<a[^>]*href="\/r\/([^\/"]+)"[^>]*class="[^"]*title[^"]*"/i) ||
                    html.match(/class="[^"]*hover[^"]*"[^>]*>r\/([^<]+)</i);
  if (nameMatch) about.name = nameMatch[1];

  // Extract subscribers count
  const subMatch = html.match(/([\d,]+)\s*(?:subscribers?|members?|readers?)/i) ||
                   html.match(/class="[^"]*subscribers[^"]*"[^>]*>([\d,]+)/i) ||
                   html.match(/class="[^"]*number[^"]*"[^>]*>([\d,]+)<\/span>\s*<span[^>]*>(?:subscribers?|members?)/i);
  if (subMatch) about.subscribers = parseInt(subMatch[1].replace(/,/g, '')) || 0;

  // Extract description
  const descMatch = html.match(/<div[^>]*class="[^"]*md[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                    html.match(/<p[^>]*class="[^"]*(?:description|tagline)[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
  if (descMatch) about.description = cleanHTML(descMatch[1]).trim().substring(0, 500);

  // Check if NSFW
  about.over18 = /nsfw|over18|adult.content/i.test(html);

  return about;
}

/**
 * Extract about info from Reddit JSON API response
 */
function extractAboutFromJSON(data) {
  return {
    name: data.display_name || data.name || '',
    title: data.title || '',
    description: data.public_description || data.description || '',
    subscribers: data.subscribers || 0,
    activeUsers: data.accounts_active || data.active_user_count || 0,
    over18: data.over18 || false,
    iconImage: data.icon_img || data.community_icon || null,
    bannerImage: data.banner_background_image || data.banner_img || null,
    createdUtc: data.created_utc || null,
    isBanned: data.banned_by !== null && data.banned_by !== undefined,
  };
}

/**
 * Clean HTML tags from text
 */
function cleanHTML(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Cache data in KV
 */
async function cacheData(env, subreddit, data) {
  if (!env.CACHE) return;
  try {
    await env.CACHE.put(`subreddit:${subreddit}`, JSON.stringify(data), { expirationTtl: CACHE_TTL });
  } catch (e) {
    console.error('KV write error:', e);
  }
}
