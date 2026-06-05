import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const subreddit = searchParams.get('subreddit');

  if (!subreddit) {
    return NextResponse.json({ error: 'Parameter "subreddit" is required' }, { status: 400 });
  }

  try {
    // 1. Check cache first
    const existingSub = await db.subreddit.findUnique({
      where: { name: subreddit.toLowerCase() },
      include: { rules: true },
    });

    if (existingSub && existingSub.rules.length > 0) {
      const cacheAge = Date.now() - existingSub.updatedAt.getTime();
      if (cacheAge < 24 * 60 * 60 * 1000) {
        return NextResponse.json({ subreddit: existingSub, rules: existingSub.rules, cached: true });
      }
    }

    // 2. Load modules dynamically to reduce initial bundle size
    const { generateFallbackRules, getRuleTranslation } = await import('@/lib/fallback-rules');
    const ZAI = (await import('z-ai-web-dev-sdk')).default;

    // 3. Try Reddit API
    let subData: any = {};
    let rawRules: any[] = [];
    let redditWorked = false;

    try {
      const [aboutRes, rulesRes] = await Promise.all([
        fetch(`https://www.reddit.com/r/${encodeURIComponent(subreddit)}/about.json`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0', 'Accept': 'application/json' },
        }),
        fetch(`https://www.reddit.com/r/${encodeURIComponent(subreddit)}/about/rules.json`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0', 'Accept': 'application/json' },
        }),
      ]);
      if (aboutRes.ok) { subData = (await aboutRes.json()).data || {}; redditWorked = true; }
      if (rulesRes.ok) { rawRules = (await rulesRes.json()).rules || []; redditWorked = true; }
    } catch (e) {
      console.log('Reddit API failed');
    }

    // 4. Demo rules for popular subreddits
    const DEMO_RULES: Record<string, { about: any; rules: any[] }> = {
      feet: { about: { title: 'Feet 👣', subscribers: 1250000, over18: true, public_description: 'A community for foot lovers.' }, rules: [
        { short_name: 'No self-promotion in titles', description: 'Do not include OnlyFans links or promotional text in post titles.' },
        { short_name: 'OC Verification Required', description: 'All original content posters must be verified. Send modmail with verification photos.' },
        { short_name: 'Self-promo in comments only', description: 'OnlyFans links ONLY in comments of your own posts.' },
        { short_name: 'Post limit: 1 per 24 hours', description: 'Maximum 1 post per 24-hour period.' },
        { short_name: 'Minimum account age: 7 days', description: 'Account must be at least 7 days old to post.' },
        { short_name: 'No low-effort content', description: 'Photos must be well-lit and show effort.' },
        { short_name: 'Required flair', description: 'All posts must have appropriate flair.' },
        { short_name: 'Be respectful', description: 'No harassment or disrespectful comments.' },
      ]},
      findom: { about: { title: 'Financial Domination 💰', subscribers: 456000, over18: true, public_description: 'The original findom community.' }, rules: [
        { short_name: 'No free content - tribute required', description: 'All content must involve tribute or payment.' },
        { short_name: 'Verification required for Dommes', description: 'All dominants must be verified before posting.' },
        { short_name: 'Self-promo allowed with flair', description: 'OnlyFans promotion allowed with [Promo] flair.' },
        { short_name: 'No doxxing or sharing subs info', description: 'Never share personal information publicly.' },
        { short_name: 'Post limit: 2 per day', description: 'Maximum 2 posts per 24 hours.' },
        { short_name: 'Title format required', description: 'Titles must include [F4M], [F4F], [F4A] tags.' },
        { short_name: 'No scamming', description: 'Do not promise content and fail to deliver.' },
        { short_name: 'Be respectful of all orientations', description: 'No discrimination.' },
      ]},
      OnlyFansPromotions: { about: { title: 'OnlyFans Promotions 💸', subscribers: 234000, over18: true, public_description: 'The main OnlyFans promo subreddit.' }, rules: [
        { short_name: 'Must have an OnlyFans link', description: 'All posts must include your OnlyFans link.' },
        { short_name: 'Verification required', description: 'You must be verified before posting.' },
        { short_name: 'Post limit: 1 per 24 hours', description: 'One promo post per day.' },
        { short_name: 'No misleading titles', description: 'Titles must accurately represent your content.' },
        { short_name: 'Required title format', description: 'Title format: [F4M] Name - What you offer.' },
        { short_name: 'No hate or discrimination', description: 'All creators welcome.' },
        { short_name: 'Mark paid content clearly', description: 'Mark PPV content with [PPV] in title.' },
        { short_name: 'No selling others content', description: 'Only promote your own OnlyFans.' },
      ]},
    };

    // 5. Use demo data if Reddit failed
    if (!redditWorked || rawRules.length === 0) {
      const subLower = subreddit.toLowerCase();
      let demoKey: string | null = null;
      if (DEMO_RULES[subLower]) { demoKey = subLower; }
      else { for (const key of Object.keys(DEMO_RULES)) { if (key.includes(subLower) || subLower.includes(key)) { demoKey = key; break; } } }

      if (demoKey) {
        const demo = DEMO_RULES[demoKey];
        subData = { ...demo.about, display_name: subreddit };
        rawRules = demo.rules;
      } else {
        subData = { title: `r/${subreddit}`, subscribers: 0, over18: true, public_description: `Community r/${subreddit} on Reddit.` };
        rawRules = [];
      }
    }

    // 6. Extract rules
    const extractedRules = rawRules.map((rule: any) => ({
      name: rule.short_name || 'Regla',
      textOriginal: rule.description || '',
    }));

    // 7. If we have rules, try AI translation
    if (extractedRules.length > 0) {
      try {
        const zai = await ZAI.create();
        const rulesText = extractedRules.map((r: any, i: number) => `Rule ${i + 1}: "${r.name}"\n${r.textOriginal}`).join('\n\n---\n\n');

        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: 'Sos un experto en Reddit y OnlyFans. Respondé SOLO en JSON válido.' },
            { role: 'user', content: `Analizá estas reglas de r/${subreddit}. Traducí al español rioplatense, identificá reglas clave para creadores de OF (promo, verification, post_limit, restricted_days, flair, title_format), y explicá cada una brevemente. Reglas:\n${rulesText}\n\nJSON: { "rules": [{ "name": "original", "textEs": "traducción", "isKeyRule": bool, "keyRuleType": "promo|verification|post_limit|restricted_days|flair|title_format|other", "aiExplanation": "explicación" }], "allowPromo": bool|null, "requiresVerify": bool|null, "postLimit": "string|null", "promoDays": "string|null", "summaryEs": "resumen 2-3 oraciones" }` },
          ],
          temperature: 0.3,
        });

        const content = completion.choices[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

        if (aiResult?.rules?.length > 0) {
          const upsertData: any = {
            name: subreddit.toLowerCase(),
            displayName: subData.title || subData.display_name || `r/${subreddit}`,
            description: subData.public_description || '',
            subscribers: subData.subscribers || 0,
            over18: subData.over18 || false,
            allowPromo: aiResult.allowPromo ?? null,
            requiresVerify: aiResult.requiresVerify ?? null,
            postLimit: aiResult.postLimit ?? null,
            promoDays: aiResult.promoDays ?? null,
            iconUrl: subData.icon_img || subData.community_icon || null,
          };

          const savedSub = await db.subreddit.upsert({ where: { name: subreddit.toLowerCase() }, update: upsertData, create: upsertData });
          await db.rule.deleteMany({ where: { subredditId: savedSub.id } });

          for (const rule of aiResult.rules) {
            const matchingRaw = extractedRules.find((r: any) => r.name === rule.name);
            await db.rule.create({
              data: { subredditId: savedSub.id, ruleName: rule.name || 'Regla', ruleTextOriginal: matchingRaw?.textOriginal || '', ruleTextEs: rule.textEs || '', category: rule.keyRuleType || null, isKeyRule: rule.isKeyRule || false, keyRuleType: rule.keyRuleType || null, aiExplanation: rule.aiExplanation || '' },
            });
          }

          const savedRules = await db.rule.findMany({ where: { subredditId: savedSub.id } });
          return NextResponse.json({ subreddit: await db.subreddit.findUnique({ where: { id: savedSub.id } }), rules: savedRules, summaryEs: aiResult.summaryEs || '', cached: false });
        }
      } catch (e) {
        console.error('AI failed:', e);
      }

      // AI failed — save raw rules
      const upsertData: any = { name: subreddit.toLowerCase(), displayName: subData.title || subData.display_name || `r/${subreddit}`, description: subData.public_description || '', subscribers: subData.subscribers || 0, over18: subData.over18 || false, iconUrl: subData.icon_img || subData.community_icon || null };
      const savedSub = await db.subreddit.upsert({ where: { name: subreddit.toLowerCase() }, update: upsertData, create: upsertData });
      await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
      for (const rule of extractedRules) {
        await db.rule.create({ data: { subredditId: savedSub.id, ruleName: rule.name, ruleTextOriginal: rule.textOriginal, ruleTextEs: rule.textOriginal, isKeyRule: false, keyRuleType: 'other' } });
      }
      const savedRules = await db.rule.findMany({ where: { subredditId: savedSub.id } });
      return NextResponse.json({ subreddit: savedSub, rules: savedRules, summaryEs: 'Reglas sin traducción de IA.', cached: false });
    }

    // 8. No rules — try AI generation, then fallback
    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'Sos un experto en Reddit y OnlyFans. Respondé SOLO en JSON válido.' },
          { role: 'user', content: `Generá 8-10 reglas probables para r/${subreddit}. JSON: { "rules": [{ "name": "english name", "textOriginal": "english description", "textEs": "español rioplatense", "isKeyRule": bool, "keyRuleType": "promo|verification|post_limit|restricted_days|flair|title_format|other", "aiExplanation": "explicación" }], "allowPromo": bool|null, "requiresVerify": bool|null, "postLimit": "string|null", "promoDays": "string|null", "summaryEs": "resumen. Aclará que son estimadas." }` },
        ],
        temperature: 0.3,
      });
      const content = completion.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

      if (aiResult?.rules?.length > 0) {
        const upsertData: any = { name: subreddit.toLowerCase(), displayName: subData.title || subData.display_name || `r/${subreddit}`, description: subData.public_description || '', subscribers: subData.subscribers || 0, over18: subData.over18 || false, allowPromo: aiResult.allowPromo ?? null, requiresVerify: aiResult.requiresVerify ?? null, postLimit: aiResult.postLimit ?? null, promoDays: aiResult.promoDays ?? null, iconUrl: subData.icon_img || subData.community_icon || null };
        const savedSub = await db.subreddit.upsert({ where: { name: subreddit.toLowerCase() }, update: upsertData, create: upsertData });
        await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
        for (const rule of aiResult.rules) {
          await db.rule.create({ data: { subredditId: savedSub.id, ruleName: rule.name || 'Regla', ruleTextOriginal: rule.textOriginal || '', ruleTextEs: rule.textEs || '', category: rule.keyRuleType || null, isKeyRule: rule.isKeyRule || false, keyRuleType: rule.keyRuleType || null, aiExplanation: rule.aiExplanation || '' } });
        }
        const savedRules = await db.rule.findMany({ where: { subredditId: savedSub.id } });
        return NextResponse.json({ subreddit: await db.subreddit.findUnique({ where: { id: savedSub.id } }), rules: savedRules, summaryEs: aiResult.summaryEs || '', cached: false });
      }
    } catch (e) {
      console.error('AI generation failed:', e);
    }

    // 9. Final fallback
    const fallback = generateFallbackRules(subreddit);
    const upsertData: any = { name: subreddit.toLowerCase(), displayName: subData.title || subData.display_name || `r/${subreddit}`, description: subData.public_description || '', subscribers: subData.subscribers || 0, over18: subData.over18 || fallback.isNSFW, allowPromo: fallback.allowPromo, requiresVerify: fallback.requiresVerify, iconUrl: subData.icon_img || subData.community_icon || null };
    const savedSub = await db.subreddit.upsert({ where: { name: subreddit.toLowerCase() }, update: upsertData, create: upsertData });
    await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
    for (const rule of fallback.rules) {
      const t = getRuleTranslation(rule.short_name);
      await db.rule.create({ data: { subredditId: savedSub.id, ruleName: rule.short_name as string, ruleTextOriginal: rule.description as string, ruleTextEs: t.textEs, isKeyRule: rule.isKeyRule as boolean, keyRuleType: rule.keyRuleType as string, aiExplanation: t.aiExplanation } });
    }
    const savedRules = await db.rule.findMany({ where: { subredditId: savedSub.id } });
    return NextResponse.json({ subreddit: await db.subreddit.findUnique({ where: { id: savedSub.id } }), rules: savedRules, summaryEs: fallback.summaryEs, cached: false });

  } catch (error: any) {
    console.error('Rules error:', error);
    return NextResponse.json({ error: 'Failed to fetch rules', details: error.message }, { status: 500 });
  }
}
