import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CACHE_TTL } from '@/lib/cache';
import { getSubredditData, getSubscriberCount } from '@/lib/demo-subreddits';

// Timeout wrapper for fetch calls
function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
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
// DELETE handler: Purge cached rules for a subreddit (clear bad data)
// ============================================================================
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const subreddit = searchParams.get('subreddit');
  const purgeAll = searchParams.get('all') === 'true';

  try {
    if (purgeAll) {
      // Purge ALL cached rules from DB
      const deletedRules = await db.rule.deleteMany({});
      const deletedSubs = await db.subreddit.deleteMany({});
      cache.clear();
      return NextResponse.json({ 
        message: 'All cached data purged', 
        deletedRules: deletedRules.count, 
        deletedSubs: deletedSubs.count 
      });
    }

    if (!subreddit) {
      return NextResponse.json({ error: 'Parameter "subreddit" is required (or use ?all=true)' }, { status: 400 });
    }

    const subLower = subreddit.toLowerCase();
    
    // Clear memory cache
    cache.delete(`rules:${subLower}`);
    cache.delete(`search:${subLower}`);
    
    // Clear DB cache
    try {
      const existingSub = await db.subreddit.findUnique({ where: { name: subLower } });
      if (existingSub) {
        await db.rule.deleteMany({ where: { subredditId: existingSub.id } });
        await db.subreddit.delete({ where: { id: existingSub.id } });
      }
    } catch (dbErr) {
      console.error('DB purge error:', dbErr);
    }

    return NextResponse.json({ message: `Cached data purged for r/${subLower}` });
  } catch (e) {
    console.error('DELETE handler error:', e);
    return NextResponse.json({ error: 'Error purging cache' }, { status: 500 });
  }
}

// ============================================================================
// POST handler: Accept client-fetched Reddit data, translate with AI, cache
// This is the REAL DATA path — the browser/server-proxy fetches Reddit 
// and sends the raw data here for AI translation.
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
                content: `Sos un traductor experto en Reddit. Respondé SOLO en JSON válido. No markdown.
REGLAS ESTRICTAS:
- Traducí las reglas FIELMENTE. No inventes ni agregues nada que no esté en el texto original.
- Para requiresVerify: poné true SOLO si alguna regla menciona explícitamente "verification" o "verified" como REQUISITO. Si no se menciona, poné null.
- Para allowPromo: poné true SOLO si alguna regla permite explícitamente self-promotion/OnlyFans links. Poné false SOLO si lo prohíbe explícitamente. Si no se menciona, poné null.
- No asumas nada basándote en el tipo de comunidad. Solo extraé lo que está ESCRITO en las reglas.`,
              },
              {
                role: 'user',
                content: `Traducí estas REGLAS REALES de r/${subLower} al español rioplatense. Identificá reglas clave para creadores de OF. Reglas:\n${rulesText}\n\nJSON: { "rules": [{ "name": "nombre original exacto", "textEs": "traduccion fiel al español rioplatense", "isKeyRule": bool, "keyRuleType": "promo|verification|post_limit|restricted_days|flair|title_format|other", "aiExplanation": "explicacion practica para creadores de OF basada SOLO en lo que dice la regla" }], "allowPromo": bool|null, "requiresVerify": bool|null, "postLimit": "string|null", "promoDays": "string|null", "summaryEs": "resumen en español basado SOLO en las reglas reales" }`,
              },
            ],
            temperature: 0.1,
          }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('AI timeout')), 25000)),
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
                content: `Sos un experto en Reddit. Respondé SOLO en JSON válido. No markdown.
REGLAS ESTRICTAS:
- Aclará SIEMPRE que las reglas son ESTIMADAS porque no se pudieron obtener de Reddit.
- Para requiresVerify: NO asumas que requiere verificación. Poné null si no estás seguro.
- Para allowPromo: NO asumas que permite o prohíbe promo. Poné null si no estás seguro.
- Es mejor decir "no sé" (null) que dar información incorrecta.`,
              },
              {
                role: 'user',
                content: `No pudimos obtener las reglas oficiales de r/${subLower}. ${contextInfo} Generá 6-8 reglas PROBABLES basándote en el tipo de comunidad. Aclará que son ESTIMADAS. JSON: { "rules": [{ "name": "english name", "textOriginal": "english description", "textEs": "español rioplatense", "isKeyRule": bool, "keyRuleType": "promo|verification|post_limit|restricted_days|flair|title_format|other", "aiExplanation": "explicacion" }], "allowPromo": null, "requiresVerify": null, "postLimit": "string|null", "promoDays": "string|null", "summaryEs": "resumen. Aclará que son estimadas y pueden ser incorrectas." }`,
              },
            ],
            temperature: 0.3,
          }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('AI gen timeout')), 20000)),
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
      error: 'No se pudieron obtener datos de Reddit. Intentá de nuevo en unos minutos.',
    });
  } catch (e) {
    console.error('POST handler error:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ============================================================================
// GET handler: Server-side rules fetching
// Tries: memory cache → DB cache → Reddit API → AI generation → fallback
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
            // Determine data source from DB — check if rules have real Reddit text
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

    // 2. Check curated data for subscriber count
    const curatedData = getSubredditData(subLower);

    // 3. Try Reddit API with multiple strategies (using our reddit-proxy logic)
    let subData: any = {
      title: `r/${subLower}`,
      subscribers: curatedData?.subscribers || 0,
      over18: true,
      public_description: curatedData?.description || '',
    };
    let rawRules: any[] = [];
    let redditWorked = false;

    const USER_AGENTS = {
      chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
      bot: 'linux:reddit-rule-scanner:v1.0 (by /u/reddit-rule-scanner)',
    };

    const fetchStrategies = [
      { baseUrl: 'https://www.reddit.com', ua: USER_AGENTS.chrome, timeout: 8000 },
      { baseUrl: 'https://old.reddit.com', ua: USER_AGENTS.chrome, timeout: 8000 },
      { baseUrl: 'https://api.reddit.com', ua: USER_AGENTS.bot, timeout: 8000 },
      { baseUrl: 'https://www.reddit.com', ua: USER_AGENTS.bot, timeout: 10000 },
    ];

    for (const strategy of fetchStrategies) {
      try {
        const [aboutRes, rulesRes] = await Promise.all([
          fetchWithTimeout(`${strategy.baseUrl}/r/${encodeURIComponent(subLower)}/about.json`, {
            headers: {
              'User-Agent': strategy.ua,
              'Accept': 'application/json',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          }, strategy.timeout),
          fetchWithTimeout(`${strategy.baseUrl}/r/${encodeURIComponent(subLower)}/about/rules.json`, {
            headers: {
              'User-Agent': strategy.ua,
              'Accept': 'application/json',
            },
          }, strategy.timeout),
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
        if (redditWorked) break; // Got data, stop trying
      } catch (e) {
        // Strategy failed, try next
      }
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

    // 5. If we have rules from Reddit, try AI translation
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
                content: `Sos un traductor experto en Reddit. Respondé SOLO en JSON válido. No markdown.
REGLAS ESTRICTAS:
- Traducí las reglas FIELMENTE. No inventes ni agregues nada.
- Para requiresVerify: poné true SOLO si alguna regla menciona explícitamente "verification" o "verified" como REQUISITO. Si no se menciona, poné null.
- Para allowPromo: poné true SOLO si alguna regla permite explícitamente self-promotion. Poné false SOLO si lo prohíbe. Si no se menciona, poné null.
- No asumas nada. Solo extraé lo que está ESCRITO en las reglas.`,
              },
              { role: 'user', content: `Traducí estas reglas REALES de r/${subLower} al español rioplatense. Reglas:\n${rulesText}\n\nJSON: { "rules": [{ "name": "nombre original exacto", "textEs": "traduccion fiel", "isKeyRule": bool, "keyRuleType": "promo|verification|post_limit|restricted_days|flair|title_format|other", "aiExplanation": "explicacion basada SOLO en lo que dice la regla" }], "allowPromo": bool|null, "requiresVerify": bool|null, "postLimit": "string|null", "promoDays": "string|null", "summaryEs": "resumen basado SOLO en las reglas reales" }` },
            ],
            temperature: 0.1,
          }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('AI timeout')), 20000)),
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
        const result = { subreddit: savedSub, rules: savedRules, summaryEs: 'Reglas reales de Reddit sin traducción de IA.', dataSource: 'reddit_real_no_translate' as DataSource, cached: false };
        cache.set(`rules:${subLower}`, result, CACHE_TTL.rules);
        return NextResponse.json(result);
      } catch (dbErr) {
        const rules = extractedRules.map((r: any, i: number) => ({ id: `raw-${i}`, ruleName: r.name, ruleTextOriginal: r.textOriginal, ruleTextEs: r.textOriginal, isKeyRule: false, keyRuleType: 'other' }));
        const result = { subreddit: { name: subLower, displayName: subData.title || `r/${subLower}`, subscribers: subData.subscribers || curatedData?.subscribers || 0, over18: subData.over18 || true }, rules, summaryEs: 'Reglas reales sin traducción.', dataSource: 'reddit_real_no_translate' as DataSource, cached: false };
        cache.set(`rules:${subLower}`, result, CACHE_TTL.rules);
        return NextResponse.json(result);
      }
    }

    // 6. No rules from Reddit — try AI generation (clearly marked as estimated)
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();
      const contextInfo = curatedData
        ? `Este subreddit tiene ${curatedData.subscribers} suscriptores, es NSFW, nicho: ${curatedData.niches.join(', ')}.`
        : '';
      const completion = await Promise.race([
        zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `Sos un experto en Reddit. Respondé SOLO en JSON válido. No markdown.
REGLAS ESTRICTAS:
- Aclará SIEMPRE que las reglas son ESTIMADAS.
- Para requiresVerify: poné null. No sabemos si requiere verificación.
- Para allowPromo: poné null. No sabemos si permite promo.
- Es mejor decir null que dar información incorrecta.`,
            },
            { role: 'user', content: `Generá 6-8 reglas PROBABLES para r/${subLower}. ${contextInfo} Aclará que son ESTIMADAS. JSON: { "rules": [{ "name": "english name", "textOriginal": "english description", "textEs": "español rioplatense", "isKeyRule": bool, "keyRuleType": "promo|verification|post_limit|restricted_days|flair|title_format|other", "aiExplanation": "explicacion" }], "allowPromo": null, "requiresVerify": null, "postLimit": "string|null", "promoDays": "string|null", "summaryEs": "resumen. Aclará que son estimadas y pueden ser incorrectas." }` },
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

    // 7. Final fallback — smart rules from subreddit name (clearly marked)
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
