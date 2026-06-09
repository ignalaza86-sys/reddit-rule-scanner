// Reddit Rule Scanner - Cloudflare Worker Proxy
// 
// This Worker proxies requests to Reddit's public JSON API.
// Reddit blocks requests from Vercel/AWS cloud IPs, but Cloudflare Workers
// run on Cloudflare's edge network which Reddit doesn't block.
//
// Deploy: npx wrangler deploy (after creating a Cloudflare account)
// Free tier: 100,000 requests/day

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const url = new URL(request.url);
    const subreddit = url.searchParams.get('subreddit');

    if (!subreddit) {
      return jsonResponse({ error: 'Parameter "subreddit" is required' }, 400);
    }

    const subLower = subreddit.toLowerCase().trim();
    if (!/^[a-zA-Z0-9_]+$/.test(subLower)) {
      return jsonResponse({ error: 'Invalid subreddit name' }, 400);
    }

    const aboutUrl = `https://www.reddit.com/r/${encodeURIComponent(subLower)}/about.json`;
    const rulesUrl = `https://www.reddit.com/r/${encodeURIComponent(subLower)}/about/rules.json`;
    const userAgent = 'linux:reddit-rule-scanner:v1.0 (by /u/reddit-rule-scanner)';

    try {
      const [aboutRes, rulesRes] = await Promise.all([
        fetchReddit(aboutUrl, userAgent),
        fetchReddit(rulesUrl, userAgent),
      ]);

      let about: any = null;
      let rules: any[] = [];

      if (aboutRes) {
        try {
          const j = await aboutRes.json();
          if (j.data && !j.data.banned && !j.data.quarantine) {
            about = {
              title: j.data.title || '',
              display_name: j.data.display_name || subLower,
              subscribers: j.data.subscribers || 0,
              over18: j.data.over18 || false,
              public_description: j.data.public_description || '',
              description: j.data.description || '',
              icon_img: j.data.icon_img || null,
              community_icon: j.data.community_icon || null,
              banner_img: j.data.banner_img || null,
              active_user_count: j.data.active_user_count || null,
              created_utc: j.data.created_utc || 0,
              submit_text: j.data.submit_text || '',
            };
          }
        } catch (e) { console.error('Parse about error:', e); }
      }

      if (rulesRes) {
        try {
          const j = await rulesRes.json();
          if (j.rules && Array.isArray(j.rules)) {
            rules = j.rules.map((r: any) => ({
              short_name: r.short_name || '',
              description: r.description || '',
              priority: r.priority || 0,
              created_utc: r.created_utc || 0,
              violation_reason: r.violation_reason || '',
            }));
          }
        } catch (e) { console.error('Parse rules error:', e); }
      }

      return jsonResponse({
        about, rules,
        subreddit: subLower,
        source: 'cloudflare_worker',
        fetchedAt: Date.now(),
      }, 200);
    } catch (error) {
      return jsonResponse({ error: 'Failed to fetch Reddit data', subreddit: subLower }, 500);
    }
  },
};

async function fetchReddit(url: string, ua: string): Promise<Response | null> {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 12000);
    const r = await fetch(url, {
      headers: { 'User-Agent': ua, 'Accept': 'application/json' },
      signal: c.signal,
    });
    clearTimeout(t);
    return r.ok ? r : null;
  } catch { return null; }
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
