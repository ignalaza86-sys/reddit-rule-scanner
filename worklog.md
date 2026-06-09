---
Task ID: 1
Agent: main
Task: Fix inaccurate Reddit rules data - implement real data fetching

Work Log:
- Analyzed current code: rules route, page.tsx, reddit-client.ts, fallback-rules.ts, demo-subreddits.ts
- Created /api/reddit-proxy with Edge runtime - tries multiple strategies (www, old, api.reddit.com) with different User-Agents
- Improved reddit-client.ts: tries direct fetch → server proxy → CORS proxies in order
- Fixed AI prompts in rules route to NOT fabricate metadata (requiresVerify, allowPromo) - only extract what's literally in the rules
- Removed "Verification required" assumption from latina fallback rules and BASE_RULES
- Added DELETE endpoint to /api/subreddit/rules for purging bad cached data
- Added forceFresh parameter to handleLoadRules (refresh button purges cache first)
- Added manual paste feature: user can paste rules from Reddit and AI translates them
- Added "Abrir reglas en Reddit" button for easy copy-paste workflow
- Better warning UI for estimated rules with "Intentar de nuevo" retry link
- Changed estimated rules toast from success to warning

Key Findings:
- Reddit EXPLICITLY blocks ALL server-side requests from cloud providers (Vercel, edge, etc.)
- Reddit returns "whoa there, pardner!" block page from old.reddit.com
- Free CORS proxies (corsproxy.io, allorigins, thingproxy) are all unreliable/down/paid
- The ONLY reliable way to get real Reddit rules is from the USER'S BROWSER
- Manual paste is the 100% reliable fallback

Stage Summary:
- Server-side proxy deployed but can't reach Reddit (Reddit blocks cloud IPs)
- Edge runtime proxy also can't reach Reddit (same IP blocks)
- Browser-side CORS proxies are unreliable but might work from user's residential IP
- Manual paste feature provides guaranteed real data path
- AI prompts fixed to not fabricate requiresVerify/allowPromo metadata
- Old inaccurate fallback rules fixed to not claim verification is required
