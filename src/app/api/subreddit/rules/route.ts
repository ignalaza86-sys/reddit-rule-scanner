import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CACHE_TTL } from '@/lib/cache';
import { getSubredditData, getSubscriberCount } from '@/lib/demo-subreddits';

// Timeout wrapper for fetch calls
function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// Safe JSON parser for AI responses
function safeParseAIResponse(content: string): any | null {
  try { return JSON.parse(content); } catch {}
  try {
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) return JSON.parse(codeBlockMatch[1].trim());
  } catch {}
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  return null;
}

// Data source types for transparency
type DataSource = 'reddit_real' | 'reddit_real_no_translate' | 'ai_translation' | 'ai_estimated' | 'fallback';

// ============================================================================
// POST handler: Accept client-fetched Reddit data, translate with AI, cache
// This is the REAL DATA path — the browser fetches Reddit directly (bypassing
// Vercel server blocks) and sends the raw data here for AI translation.
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subreddit, about, rules: rawRules } = body;

    if (!subreddit) {
      return NextResponse.json({ error: 'Parameter "subreddit" is required' }, { status: 400 });
    }

    const subLower = subreddit.toLowerCase();
    const curatedData = getSubredditData(subLower);

    // Build subreddit data from client-fetched Reddit data
    let subData: any = {
      name: subLower,
      displayName: about?.title || about?.display_name || curatedData?.displayName || `r/${subLower}`,
      description: about?.public_description || curatedData?.description || '',
      subscribers: about?.subscribers || curatedData?.subscribers || 0,
      over18: about?.over18 ?? true,
      iconUrl: about?.icon_img || about?.community_icon || null,
    };

    // Enrich subscriber count from curated data if Reddit gave us 0
    if (curatedData && (subData.subscribers === 0 || subData.subscribers == null)) {
      subData.subscribers = curatedData.subscribers;
    }

    // Extract rules from client-fetched Reddit data
    const extractedRules: { name: string; textOriginal: string }[] = (rawRules || [])
      .filter((r: any) => r.short_name || r.description)
      .map((r: any) => ({
        name: r.short_name || 'Regla',
        textOriginal: r.description || '',
      }));

    // If we have rules from Reddit, translate with AI
    if (extractedRules.length > 0) {
      try {
        const ZAI = (await import('z-ai-web-dev-sdk')).default;
        const zai = await ZAI.create();
        const rulesText = extractedRules.map((r: any, i: number) => `Rule ${i + 1}: "${r.name}"\n${r.textOriginal}`).join('\n\n---\n\n');

        const completion = await Promise.race([
          zai.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: 'Sos un experto en Reddit y OnlyFans. Respondé SOLO en JSON válido. No markdown. Estas son reglas REALES de Reddit — traducilas fielmente, no las inventes.',
              },
              {
                role: 'user',
                content: `Analizá estas REGLAS REALES de r/${subLower}. Traducí al español rioplatense, identificá reglas clave para creadores de OF. Reglas:\n${rulesText}\n\nJSON: { "rules": [{ "name": "original name", "textEs": "traduccion fiel al español rioplatense", "isKeyRule": bool, "keyRuleType": "promo|verification|post_limit|restricted_days|flair|title_format|other", "aiExplanation": "explicacion practica para creadores de OF" }], "allowPromo": bool|null, "requiresVerify": bool|null, "postLimit": "string|null", "promoDays": "string|null", "summaryEs": "resumen en español" }`,
              },
            ],
            temperature: 0.2,
          }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('AI timeout')), 20000)),
        ]) as any;

        const content = completion.choices[0]?.message?.content || '';
        const aiResult = safeParseAIResponse(content);

        if (aiResult?.rules?.length > 0) {
          // Build the full subreddit record
          const upsertData: any = {
            name: subLower,
            displayName: subData.displayName,
            description: subData.description,
            subscribers: subData.subscribers,
            over18: subData.over18,
            allowPromo: aiResult.allowPromo ?? null,
            requiresVerify: aiResult.requiresVerify ?? null,
            postLimit: aiResult.postLimit ?? null,
            promoDays: aiResult.promoDays ?? null,
            iconUrl: subData.iconUrl,
          };

          try {
            const savedSub = await db.subreddit.upsert({ where: { name: subLower }, update: upsertData, create: upsertData });
            await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
            for (const rule of aiResult.rules) {
              const matchingRaw = extractedRules.find((r: any) => r.name === rule.name);
              await db.rule.create({
                data: {
                  subredditId: savedSub.id,
                  ruleName: rule.name || 'Regla',
                  ruleTextOriginal: matchingRaw?.textOriginal || rule.textOriginal || '',
                  ruleTextEs: rule.textEs || '',
                  category: rule.keyRuleType || null,
                  isKeyRule: rule.isKeyRule || false,
                  keyRuleType: rule.keyRuleType || null,
                  aiExplanation: rule.aiExplanation || '',
                },
              });
            }
            const savedRules = await db.rule.findMany({ where: { subredditId: savedSub.id } });
            const fullSub = await db.subreddit.findUnique({ where: { id: savedSub.id } });
            const result = {
              subreddit: fullSub,
              rules: savedRules,
              summaryEs: aiResult.summaryEs || '',
              dataSource: 'reddit_real' as DataSource,
              cached: false,
            };
            cache.set(`rules:${subLower}`, result, CACHE_TTL.rules);
            return NextResponse.json(result);
          } catch (dbErr) {
            console.error('DB save error (returning without cache):', dbErr);
            const rules = aiResult.rules.map((r: any, i: number) => ({
              id: `ai-${i}`,
              ruleName: r.name || 'Regla',
              ruleTextOriginal: extractedRules.find((er: any) => er.name === r.name)?.textOriginal || r.textOriginal || '',
              ruleTextEs: r.textEs || '',
              category: r.keyRuleType || null,
              isKeyRule: r.isKeyRule || false,
              keyRuleType: r.keyRuleType || null,
              aiExplanation: r.aiExplanation || '',
            }));
            const result = {
              subreddit: { ...subData, allowPromo: aiResult.allowPromo ?? null, requiresVerify: aiResult.requiresVerify ?? null },
              rules,
              summaryEs: aiResult.summaryEs || '',
              dataSource: 'reddit_real' as DataSource,
              cached: false,
            };
            cache.set(`rules:${subLower}`, result, CACHE_TTL.rules);
            return NextResponse.json(result);
          }
        }
      } catch (e) {
        console.error('AI translation failed for client data:', e instanceof Error ? e.message : 'unknown');
      }

      // AI failed — save raw rules from Reddit (untranslated but REAL)
      try {
        const upsertData: any = {
          name: subLower,
          displayName: subData.displayName,
          description: subData.description,
          subscribers: subData.subscribers,
          over18: subData.over18,
          iconUrl: subData.iconUrl,
        };
        const savedSub = await db.subreddit.upsert({ where: { name: subLower }, update: upsertData, create: upsertData });
        await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
        for (const rule of extractedRules) {
          await db.rule.create({
            data: {
              subredditId: savedSub.id,
              ruleName: rule.name,
              ruleTextOriginal: rule.textOriginal,
              ruleTextEs: rule.textOriginal, // No translation available, show original
              isKeyRule: false,
              keyRuleType: 'other',
            },
          });
        }
        const savedRules = await db.rule.findMany({ where: { subredditId: savedSub.id } });
        const result = {
          subreddit: savedSub,
          rules: savedRules,
          summaryEs: 'Reglas reales de Reddit sin traducción de IA.',
          dataSource: 'reddit_real_no_translate' as DataSource,
          cached: false,
        };
        cache.set(`rules:${subLower}`, result, CACHE_TTL.rules);
        return NextResponse.json(result);
      } catch (dbErr) {
        const rules = extractedRules.map((r: any, i: number) => ({
          id: `raw-${i}`,
          ruleName: r.name,
          ruleTextOriginal: r.textOriginal,
          ruleTextEs: r.textOriginal,
          isKeyRule: false,
          keyRuleType: 'other',
        }));
        const result = {
          subreddit: subData,
          rules,
          summaryEs: 'Reglas reales de Reddit sin traducción.',
          dataSource: 'reddit_real_no_translate' as DataSource,
          cached: false,
        };
        cache.set(`rules:${subLower}`, result, CACHE_TTL.rules);
        return NextResponse.json(result);
      }
    }

    // Client fetched about data but no rules — save what we have and try AI generation
    if (about) {
      try {
        const ZAI = (await import('z-ai-web-dev-sdk')).default;
        const zai = await ZAI.create();
        const contextInfo = `Este subreddit tiene ${subData.subscribers} suscriptores, es ${subData.over18 ? 'NSFW' : 'SFW'}. Descripción: ${about.public_description || 'N/A'}. ${curatedData ? `Nicho: ${curatedData.niches.join(', ')}.` : ''}`;

        const completion = await Promise.race([
          zai.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: 'Sos un experto en Reddit y OnlyFans. Respondé SOLO en JSON válido. No markdown. Aclará que las reglas son ESTIMADAS porque no se pudieron obtener de Reddit.',
              },
              {
                role: 'user',
                content: `No pudimos obtener las reglas oficiales de r/${subLower}. ${contextInfo} Generá 6-8 reglas PROBABLES basándote en el tipo de comunidad. JSON: { "rules": [{ "name": "english name", "textOriginal": "english description", "textEs": "español rioplatense", "isKeyRule": bool, "keyRuleType": "promo|verification|post_limit|restricted_days|flair|title_format|other", "aiExplanation": "explicacion" }], "allowPromo": bool|null, "requiresVerify": bool|null, "postLimit": "string|null", "promoDays": "string|null", "summaryEs": "resumen. Aclará que son estimadas." }`,
              },
            ],
            temperature: 0.3,
          }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('AI gen timeout')), 15000)),
        ]) as any;

        const aiContent = completion.choices[0]?.message?.content || '';
        const aiResult = safeParseAIResponse(aiContent);

        if (aiResult?.rules?.length > 0) {
          const upsertData: any = {
            name: subLower,
            displayName: subData.displayName,
            description: subData.description,
            subscribers: subData.subscribers,
            over18: subData.over18,
            allowPromo: aiResult.allowPromo ?? null,
            requiresVerify: aiResult.requiresVerify ?? null,
            postLimit: aiResult.postLimit ?? null,
            promoDays: aiResult.promoDays ?? null,
            iconUrl: subData.iconUrl,
          };
          try {
            const savedSub = await db.subreddit.upsert({ where: { name: subLower }, update: upsertData, create: upsertData });
            await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
            for (const rule of aiResult.rules) {
              await db.rule.create({
                data: {
                  subredditId: savedSub.id,
                  ruleName: rule.name || 'Regla',
                  ruleTextOriginal: rule.textOriginal || '',
                  ruleTextEs: rule.textEs || '',
                  category: rule.keyRuleType || null,
                  isKeyRule: rule.isKeyRule || false,
                  keyRuleType: rule.keyRuleType || null,
                  aiExplanation: rule.aiExplanation || '',
                },
              });
            }
            const savedRules = await db.rule.findMany({ where: { subredditId: savedSub.id } });
            const fullSub = await db.subreddit.findUnique({ where: { id: savedSub.id } });
            const result = {
              subreddit: fullSub,
              rules: savedRules,
              summaryEs: aiResult.summaryEs || '',
              dataSource: 'ai_estimated' as DataSource,
              cached: false,
            };
            cache.set(`rules:${subLower}`, result, CACHE_TTL.rules);
            return NextResponse.json(result);
          } catch (dbErr) {
            const rules = aiResult.rules.map((r: any, i: number) => ({
              id: `gen-${i}`,
              ruleName: r.name || 'Regla',
              ruleTextOriginal: r.textOriginal || '',
              ruleTextEs: r.textEs || '',
              category: r.keyRuleType || null,
              isKeyRule: r.isKeyRule || false,
              keyRuleType: r.keyRuleType || null,
              aiExplanation: r.aiExplanation || '',
            }));
            const result = {
              subreddit: { ...subData, allowPromo: aiResult.allowPromo ?? null, requiresVerify: aiResult.requiresVerify ?? null },
              rules,
              summaryEs: aiResult.summaryEs || '',
              dataSource: 'ai_estimated' as DataSource,
              cached: false,
            };
            cache.set(`rules:${subLower}`, result, CACHE_TTL.rules);
            return NextResponse.json(result);
          }
        }
      } catch (e) {
        console.error('AI generation failed for client about data:', e instanceof Error ? e.message : 'unknown');
      }
    }

    // Client couldn't get anything from Reddit — return what we know
    return NextResponse.json({
      subreddit: subData,
      rules: [],
      summaryEs: '',
      dataSource: 'fallback' as DataSource,
      error: 'No se pudieron obtener datos de Reddit desde tu navegador.',
    });
  } catch (e) {
    console.error('POST handler error:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ============================================================================
// GET handler: Server-side rules fetching (fallback when client can't fetch)
// No longer uses DEMO_RULES_ES — all data comes from Reddit API or AI.
// ============================================================================
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const subreddit = searchParams.get('subreddit');
  const force = searchParams.get('force') === 'true';

  if (!subreddit) {
    return NextResponse.json({ error: 'Parameter "subreddit" is required' }, { status: 400 });
  }

  const subLower = subreddit.toLowerCase();

  try {
    // 0. Check memory cache first (fastest path) — skip if force=true
    if (!force) {
      const cacheKey = `rules:${subLower}`;
      const cachedResult = cache.get<{ subreddit: any; rules: any[]; summaryEs?: string; cached: boolean; dataSource?: DataSource }>(cacheKey);
      if (cachedResult) {
        return NextResponse.json({ ...cachedResult, source: 'cache' });
      }
    }

    // 1. Check DB cache — skip if force=true
    if (!force) {
      try {
        const existingSub = await db.subreddit.findUnique({
          where: { name: subLower },
          include: { rules: true },
        });
        if (existingSub && existingSub.rules.length > 0) {
          const cacheAge = Date.now() - existingSub.updatedAt.getTime();
          if (cacheAge < 24 * 60 * 60 * 1000) {
            // Enrich subscriber count from curated data if DB has 0
            const curatedSubs = getSubscriberCount(subLower);
            if (curatedSubs > 0 && (existingSub.subscribers === 0 || existingSub.subscribers < curatedSubs)) {
              existingSub.subscribers = curatedSubs;
            }
            // Determine data source from DB — if it has ruleTextOriginal that looks like real Reddit rules, mark as reddit_real
            const hasRealRules = existingSub.rules.some(r => r.ruleTextOriginal && r.ruleTextOriginal.length > 50);
            const dataSource: DataSource = hasRealRules ? 'reddit_real' : 'ai_estimated';
            const dbResult = { subreddit: existingSub, rules: existingSub.rules, cached: true, dataSource };
            cache.set(`rules:${subLower}`, dbResult, CACHE_TTL.rules);
            return NextResponse.json(dbResult);
          }
        }
      } catch (dbErr) {
        console.error('DB read error (non-fatal):', dbErr);
      }
    }

    // 2. Check curated data for subscriber count (even if we don't have pre-built rules)
    const curatedData = getSubredditData(subLower);

    // 3. Try Reddit API with short timeout (probably fails from Vercel, but worth trying)
    let subData: any = {
      title: `r/${subLower}`,
      subscribers: curatedData?.subscribers || 0,
      over18: true,
      public_description: curatedData?.description || '',
    };
    let rawRules: any[] = [];
    let redditWorked = false;

    try {
      const [aboutRes, rulesRes] = await Promise.all([
        fetchWithTimeout(`https://www.reddit.com/r/${encodeURIComponent(subLower)}/about.json`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        }, 5000),
        fetchWithTimeout(`https://www.reddit.com/r/${encodeURIComponent(subLower)}/about/rules.json`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
        }, 5000),
      ]);
      if (aboutRes.ok) {
        const aboutJson = await aboutRes.json();
        if (aboutJson.data && !aboutJson.data.banned) {
          subData = { ...subData, ...aboutJson.data };
          redditWorked = true;
        }
      }
      if (rulesRes.ok) {
        const rulesJson = await rulesRes.json();
        rawRules = rulesJson.rules || [];
        redditWorked = true;
      }
    } catch (e) {
      console.log('Reddit API failed (expected from Vercel):', e instanceof Error ? e.message : 'unknown');
    }

    // Enrich subscriber count from curated data if Reddit gave us 0
    if (curatedData && (subData.subscribers === 0 || subData.subscribers == null)) {
      subData.subscribers = curatedData.subscribers;
    }

    // 4. Extract rules if Reddit worked
    const extractedRules = rawRules.map((rule: any) => ({
      name: rule.short_name || 'Regla',
      textOriginal: rule.description || '',
    }));

    // 5. If we have rules from Reddit, try AI translation (with timeout)
    if (extractedRules.length > 0) {
      try {
        const ZAI = (await import('z-ai-web-dev-sdk')).default;
        const zai = await ZAI.create();
        const rulesText = extractedRules.map((r: any, i: number) => `Rule ${i + 1}: "${r.name}"\n${r.textOriginal}`).join('\n\n---\n\n');

        const completion = await Promise.race([
          zai.chat.completions.create({
            messages: [
              { role: 'system', content: 'Sos un experto en Reddit y OnlyFans. Respondé SOLO en JSON válido. No markdown.' },
              { role: 'user', content: `Analizá estas reglas de r/${subLower}. Traducí al español rioplatense, identificá reglas clave para creadores de OF. Reglas:\n${rulesText}\n\nJSON: { "rules": [{ "name": "original", "textEs": "traduccion", "isKeyRule": bool, "keyRuleType": "promo|verification|post_limit|restricted_days|flair|title_format|other", "aiExplanation": "explicacion" }], "allowPromo": bool|null, "requiresVerify": bool|null, "postLimit": "string|null", "promoDays": "string|null", "summaryEs": "resumen" }` },
            ],
            temperature: 0.3,
          }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('AI timeout')), 15000)),
        ]) as any;

        const content = completion.choices[0]?.message?.content || '';
        const aiResult = safeParseAIResponse(content);

        if (aiResult?.rules?.length > 0) {
          try {
            const upsertData: any = {
              name: subLower,
              displayName: subData.title || subData.display_name || curatedData?.displayName || `r/${subLower}`,
              description: subData.public_description || curatedData?.description || '',
              subscribers: subData.subscribers || curatedData?.subscribers || 0,
              over18: subData.over18 || true,
              allowPromo: aiResult.allowPromo ?? null,
              requiresVerify: aiResult.requiresVerify ?? null,
              postLimit: aiResult.postLimit ?? null,
              promoDays: aiResult.promoDays ?? null,
              iconUrl: subData.icon_img || subData.community_icon || null,
            };
            const savedSub = await db.subreddit.upsert({ where: { name: subLower }, update: upsertData, create: upsertData });
            await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
            for (const rule of aiResult.rules) {
              const matchingRaw = extractedRules.find((r: any) => r.name === rule.name);
              await db.rule.create({
                data: { subredditId: savedSub.id, ruleName: rule.name || 'Regla', ruleTextOriginal: matchingRaw?.textOriginal || rule.textOriginal || '', ruleTextEs: rule.textEs || '', category: rule.keyRuleType || null, isKeyRule: rule.isKeyRule || false, keyRuleType: rule.keyRuleType || null, aiExplanation: rule.aiExplanation || '' },
              });
            }
            const savedRules = await db.rule.findMany({ where: { subredditId: savedSub.id } });
            const fullSub = await db.subreddit.findUnique({ where: { id: savedSub.id } });
            const result = { subreddit: fullSub, rules: savedRules, summaryEs: aiResult.summaryEs || '', dataSource: 'reddit_real' as DataSource, cached: false };
            cache.set(`rules:${subLower}`, result, CACHE_TTL.rules);
            return NextResponse.json(result);
          } catch (dbErr) {
            console.error('DB save error (returning without cache):', dbErr);
            const rules = aiResult.rules.map((r: any, i: number) => ({
              id: `ai-${i}`, ruleName: r.name || 'Regla', ruleTextOriginal: extractedRules.find((er: any) => er.name === r.name)?.textOriginal || r.textOriginal || '', ruleTextEs: r.textEs || '', category: r.keyRuleType || null, isKeyRule: r.isKeyRule || false, keyRuleType: r.keyRuleType || null, aiExplanation: r.aiExplanation || '',
            }));
            const result = { subreddit: { name: subLower, displayName: subData.title || curatedData?.displayName || `r/${subLower}`, subscribers: subData.subscribers || curatedData?.subscribers || 0, over18: subData.over18 || true, allowPromo: aiResult.allowPromo ?? null, requiresVerify: aiResult.requiresVerify ?? null }, rules, summaryEs: aiResult.summaryEs || '', dataSource: 'reddit_real' as DataSource, cached: false };
            cache.set(`rules:${subLower}`, result, CACHE_TTL.rules);
            return NextResponse.json(result);
          }
        }
      } catch (e) {
        console.error('AI translation failed:', e instanceof Error ? e.message : 'unknown');
      }

      // AI failed — save raw rules
      try {
        const upsertData: any = { name: subLower, displayName: subData.title || subData.display_name || curatedData?.displayName || `r/${subLower}`, description: subData.public_description || curatedData?.description || '', subscribers: subData.subscribers || curatedData?.subscribers || 0, over18: subData.over18 || true, iconUrl: subData.icon_img || subData.community_icon || null };
        const savedSub = await db.subreddit.upsert({ where: { name: subLower }, update: upsertData, create: upsertData });
        await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
        for (const rule of extractedRules) {
          await db.rule.create({ data: { subredditId: savedSub.id, ruleName: rule.name, ruleTextOriginal: rule.textOriginal, ruleTextEs: rule.textOriginal, isKeyRule: false, keyRuleType: 'other' } });
        }
        const savedRules = await db.rule.findMany({ where: { subredditId: savedSub.id } });
        const result = { subreddit: savedSub, rules: savedRules, summaryEs: 'Reglas sin traducción de IA.', dataSource: 'reddit_real_no_translate' as DataSource, cached: false };
        cache.set(`rules:${subLower}`, result, CACHE_TTL.rules);
        return NextResponse.json(result);
      } catch (dbErr) {
        const rules = extractedRules.map((r: any, i: number) => ({ id: `raw-${i}`, ruleName: r.name, ruleTextOriginal: r.textOriginal, ruleTextEs: r.textOriginal, isKeyRule: false, keyRuleType: 'other' }));
        const result = { subreddit: { name: subLower, displayName: subData.title || `r/${subLower}`, subscribers: subData.subscribers || curatedData?.subscribers || 0, over18: subData.over18 || true }, rules, summaryEs: 'Reglas sin traducción.', dataSource: 'reddit_real_no_translate' as DataSource, cached: false };
        cache.set(`rules:${subLower}`, result, CACHE_TTL.rules);
        return NextResponse.json(result);
      }
    }

    // 6. No rules from Reddit — try AI generation (with timeout)
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();
      const contextInfo = curatedData
        ? `Este subreddit tiene ${curatedData.subscribers} suscriptores, es NSFW, nicho: ${curatedData.niches.join(', ')}.`
        : '';
      const completion = await Promise.race([
        zai.chat.completions.create({
          messages: [
            { role: 'system', content: 'Sos un experto en Reddit y OnlyFans. Respondé SOLO en JSON válido. No markdown. Aclará SIEMPRE que las reglas son ESTIMADAS.' },
            { role: 'user', content: `Generá 6-8 reglas PROBABLES para r/${subLower}. ${contextInfo} Estas reglas son ESTIMADAS — no pudimos obtener las reales de Reddit. JSON: { "rules": [{ "name": "english name", "textOriginal": "english description", "textEs": "español rioplatense", "isKeyRule": bool, "keyRuleType": "promo|verification|post_limit|restricted_days|flair|title_format|other", "aiExplanation": "explicacion" }], "allowPromo": bool|null, "requiresVerify": bool|null, "postLimit": "string|null", "promoDays": "string|null", "summaryEs": "resumen. Aclará que son estimadas." }` },
          ],
          temperature: 0.3,
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('AI gen timeout')), 15000)),
      ]) as any;
      const content = completion.choices[0]?.message?.content || '';
      const aiResult = safeParseAIResponse(content);

      if (aiResult?.rules?.length > 0) {
        try {
          const upsertData: any = { name: subLower, displayName: subData.title || subData.display_name || curatedData?.displayName || `r/${subLower}`, description: subData.public_description || curatedData?.description || '', subscribers: subData.subscribers || curatedData?.subscribers || 0, over18: subData.over18 || true, allowPromo: aiResult.allowPromo ?? null, requiresVerify: aiResult.requiresVerify ?? null, postLimit: aiResult.postLimit ?? null, promoDays: aiResult.promoDays ?? null, iconUrl: subData.icon_img || subData.community_icon || null };
          const savedSub = await db.subreddit.upsert({ where: { name: subLower }, update: upsertData, create: upsertData });
          await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
          for (const rule of aiResult.rules) {
            await db.rule.create({ data: { subredditId: savedSub.id, ruleName: rule.name || 'Regla', ruleTextOriginal: rule.textOriginal || '', ruleTextEs: rule.textEs || '', category: rule.keyRuleType || null, isKeyRule: rule.isKeyRule || false, keyRuleType: rule.keyRuleType || null, aiExplanation: rule.aiExplanation || '' } });
          }
          const savedRules = await db.rule.findMany({ where: { subredditId: savedSub.id } });
          const fullSub = await db.subreddit.findUnique({ where: { id: savedSub.id } });
          const result = { subreddit: fullSub, rules: savedRules, summaryEs: aiResult.summaryEs || '', dataSource: 'ai_estimated' as DataSource, cached: false };
          cache.set(`rules:${subLower}`, result, CACHE_TTL.rules);
          return NextResponse.json(result);
        } catch (dbErr) {
          const rules = aiResult.rules.map((r: any, i: number) => ({ id: `gen-${i}`, ruleName: r.name || 'Regla', ruleTextOriginal: r.textOriginal || '', ruleTextEs: r.textEs || '', category: r.keyRuleType || null, isKeyRule: r.isKeyRule || false, keyRuleType: r.keyRuleType || null, aiExplanation: r.aiExplanation || '' }));
          const result = { subreddit: { name: subLower, displayName: subData.title || curatedData?.displayName || `r/${subLower}`, subscribers: subData.subscribers || curatedData?.subscribers || 0, over18: subData.over18 || true, allowPromo: aiResult.allowPromo ?? null, requiresVerify: aiResult.requiresVerify ?? null }, rules, summaryEs: aiResult.summaryEs || '', dataSource: 'ai_estimated' as DataSource, cached: false };
          cache.set(`rules:${subLower}`, result, CACHE_TTL.rules);
          return NextResponse.json(result);
        }
      }
    } catch (e) {
      console.error('AI generation failed:', e instanceof Error ? e.message : 'unknown');
    }

    // 7. Final fallback — smart rules from subreddit name
    try {
      const { generateFallbackRules, getRuleTranslation } = await import('@/lib/fallback-rules');
      const fallback = generateFallbackRules(subLower);
      const finalSubs = subData.subscribers || curatedData?.subscribers || 0;
      const upsertData: any = { name: subLower, displayName: subData.title || subData.display_name || curatedData?.displayName || `r/${subLower}`, description: subData.public_description || curatedData?.description || '', subscribers: finalSubs, over18: subData.over18 || fallback.isNSFW, allowPromo: fallback.allowPromo ?? null, requiresVerify: null, iconUrl: subData.icon_img || subData.community_icon || null };
      const savedSub = await db.subreddit.upsert({ where: { name: subLower }, update: upsertData, create: upsertData });
      await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
      for (const rule of fallback.rules) {
        const t = getRuleTranslation(rule.short_name);
        await db.rule.create({ data: { subredditId: savedSub.id, ruleName: rule.short_name as string, ruleTextOriginal: rule.description as string, ruleTextEs: t.textEs, isKeyRule: rule.isKeyRule, keyRuleType: rule.keyRuleType, aiExplanation: t.aiExplanation } });
      }
      const savedRules = await db.rule.findMany({ where: { subredditId: savedSub.id } });
      const fullSub = await db.subreddit.findUnique({ where: { id: savedSub.id } });
      const result = { subreddit: fullSub, rules: savedRules, summaryEs: fallback.summaryEs, dataSource: 'fallback' as DataSource, cached: false };
      cache.set(`rules:${subLower}`, result, CACHE_TTL.rules);
      return NextResponse.json(result);
    } catch (dbErr) {
      const { generateFallbackRules, getRuleTranslation } = await import('@/lib/fallback-rules');
      const fallback = generateFallbackRules(subLower);
      const finalSubs = subData.subscribers || curatedData?.subscribers || 0;
      const rules = fallback.rules.map((rule, i) => {
        const t = getRuleTranslation(rule.short_name);
        return { id: `fallback-${i}`, ruleName: rule.short_name, ruleTextOriginal: rule.description, ruleTextEs: t.textEs, isKeyRule: rule.isKeyRule, keyRuleType: rule.keyRuleType, aiExplanation: t.aiExplanation };
      });
      const result = { subreddit: { name: subLower, displayName: subData.title || `r/${subLower}`, subscribers: finalSubs, over18: subData.over18 || fallback.isNSFW }, rules, summaryEs: fallback.summaryEs, dataSource: 'fallback' as DataSource, cached: false };
      cache.set(`rules:${subLower}`, result, CACHE_TTL.rules);
      return NextResponse.json(result);
    }
  } catch (e) {
    console.error('GET handler error:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
