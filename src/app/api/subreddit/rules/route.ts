import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

// Demo rules for when Reddit blocks the request
const DEMO_RULES: Record<string, any> = {
  feet: {
    about: { title: 'Feet 👣', subscribers: 1250000, over18: true, public_description: 'A community for foot lovers. Share your favorite content!' },
    rules: [
      { short_name: 'No self-promotion in titles', description: 'Do not include OnlyFans links, social media handles, or promotional text in post titles. This includes watermarks with URLs. Titles should describe the content only.' },
      { short_name: 'OC Verification Required', description: 'All original content posters must be verified before posting. Send a modmail with 3 photos: one from the front, one from the side, and one with a crumpled piece of paper showing your Reddit username and today\'s date.' },
      { short_name: 'Self-promo in comments only', description: 'You may share your OnlyFans or social media links ONLY in the comments of your own posts. Do not put links in the title or post body. Do not spam your link in other people\'s posts.' },
      { short_name: 'Post limit: 1 per 24 hours', description: 'To keep the feed varied, each user may post a maximum of 1 post per 24-hour period. Deleting and reposting to bypass this will result in a ban.' },
      { short_name: 'Minimum account age: 7 days', description: 'Your Reddit account must be at least 7 days old to post. This helps reduce spam and bot activity.' },
      { short_name: 'No low-effort content', description: 'Posts must show effort in composition, lighting, and creativity. Blurry, poorly lit, or low-resolution images will be removed.' },
      { short_name: 'Required flair', description: 'All posts must have an appropriate flair selected. Available flairs: OC, Non-OC, Request, Discussion. Incorrect flair will result in post removal.' },
      { short_name: 'Be respectful', description: 'No harassment, bullying, or disrespectful comments. Treat all community members with respect. Report violations to the mods.' },
    ],
  },
  default: {
    about: { title: 'Subreddit', subscribers: 100000, over18: true, public_description: 'An adult content community on Reddit.' },
    rules: [
      { short_name: 'No spam or self-promotion', description: 'Do not post promotional content or spam. Self-promotion is only allowed in designated threads or as specified by the subreddit rules.' },
      { short_name: 'Verification required for OC', description: 'If you are posting original content, you must first get verified by the moderation team. Follow the verification instructions in the pinned post.' },
      { short_name: 'Follow Reddit site-wide rules', description: 'All posts must comply with Reddit\'s content policy. This includes no minors, no non-consensual content, and no illegal content.' },
      { short_name: 'Use appropriate flairs', description: 'All posts must use the correct flair. Flairs help organize content and make it easier for users to find what they\'re looking for.' },
      { short_name: 'Be respectful to all members', description: 'No harassment, hate speech, or personal attacks. Keep discussions civil and report rule-breaking behavior.' },
      { short_name: 'No doxxing or sharing personal info', description: 'Do not share anyone\'s personal information, real name, location, or other identifying details without their explicit consent.' },
    ],
  },
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const subreddit = searchParams.get('subreddit');

  if (!subreddit) {
    return NextResponse.json({ error: 'Parameter "subreddit" is required' }, { status: 400 });
  }

  try {
    // Check if we already have this subreddit's rules cached
    const existingSub = await db.subreddit.findUnique({
      where: { name: subreddit.toLowerCase() },
      include: { rules: true },
    });

    // If cached and less than 24h old, return cached
    if (existingSub && existingSub.rules.length > 0) {
      const cacheAge = Date.now() - existingSub.updatedAt.getTime();
      if (cacheAge < 24 * 60 * 60 * 1000) {
        return NextResponse.json({
          subreddit: existingSub,
          rules: existingSub.rules,
          cached: true,
        });
      }
    }

    // Try fetching from Reddit
    let subData: any = {};
    let rawRules: any[] = [];
    let redditWorked = false;

    try {
      const aboutUrl = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/about.json`;
      const aboutResponse = await fetch(aboutUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      });

      if (aboutResponse.ok) {
        const aboutJson = await aboutResponse.json();
        subData = aboutJson.data || {};
        redditWorked = true;
      }

      const rulesUrl = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/about/rules.json`;
      const rulesResponse = await fetch(rulesUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      });

      if (rulesResponse.ok) {
        const rulesJson = await rulesResponse.json();
        rawRules = rulesJson.rules || [];
        redditWorked = true;
      }
    } catch (e) {
      console.log('Reddit API failed, using demo data');
    }

    // Use demo data if Reddit didn't work
    if (!redditWorked || rawRules.length === 0) {
      const demoKey = DEMO_RULES[subreddit.toLowerCase()] ? subreddit.toLowerCase() : 'default';
      const demo = DEMO_RULES[demoKey];
      subData = { ...demo.about, display_name: subreddit };
      rawRules = demo.rules;
    }

    // Extract rules
    const extractedRules = rawRules.map((rule: any) => ({
      name: rule.short_name || 'Regla sin nombre',
      textOriginal: rule.description || '',
      category: rule.violation_reason || 'General',
    }));

    // Use AI to translate and analyze rules
    const zai = await ZAI.create();
    
    const rulesText = extractedRules
      .map((r: any, i: number) => `Rule ${i + 1}: "${r.name}"\n${r.textOriginal}`)
      .join('\n\n---\n\n');

    const aiPrompt = `Sos un experto en Reddit y creadores de contenido de OnlyFans. Analizá las siguientes reglas de un subreddit y:

1. Traducí cada regla al español rioplatense/argentino de forma precisa y natural, entendiendo la jerga de Reddit y creadores de contenido.
2. Identificá cuáles son "reglas clave" para un creador de OnlyFans que quiere promocionarse:
   - Si permite autopromoción (self-promo / OC / OnlyFans links)
   - Si requiere verificación (verification)
   - Límites de posts (post limits)
   - Días/horarios restringidos
   - Requisitos de flair/tags
   - Reglas de formato de título
3. Para cada regla clave, marcá el tipo: "promo" | "verification" | "post_limit" | "restricted_days" | "flair" | "title_format" | "other"
4. Dale una explicación corta y clara en español de lo que significa para un creador de contenido.

Las reglas son:
${rulesText}

Respondé SOLO en formato JSON así:
{
  "rules": [
    {
      "name": "nombre original",
      "textEs": "traducción al español rioplatense",
      "isKeyRule": true/false,
      "keyRuleType": "promo" | "verification" | etc,
      "aiExplanation": "explicación corta para creador de contenido"
    }
  ],
  "allowPromo": true/false/null,
  "requiresVerify": true/false/null,
  "postLimit": "descripción del límite o null",
  "promoDays": "días permitidos o null",
  "summaryEs": "resumen general en 2-3 oraciones sobre si conviene o no este sub para un creador de OF"
}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Sos un asistente experto en Reddit y OnlyFans. Respondé SOLO en JSON válido, sin markdown ni backticks.' },
        { role: 'user', content: aiPrompt },
      ],
      temperature: 0.3,
    });

    let aiResult: any;
    try {
      const content = completion.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      aiResult = null;
    }

    // Save to database
    const upsertData = {
      name: subreddit.toLowerCase(),
      displayName: subData.title || subData.display_name || subreddit,
      description: subData.public_description || subData.description?.substring(0, 500) || '',
      subscribers: subData.subscribers || 0,
      over18: subData.over18 || false,
      allowPromo: aiResult?.allowPromo ?? null,
      requiresVerify: aiResult?.requiresVerify ?? null,
      postLimit: aiResult?.postLimit ?? null,
      promoDays: aiResult?.promoDays ?? null,
      iconUrl: subData.icon_img || subData.community_icon || null,
    };

    const savedSub = await db.subreddit.upsert({
      where: { name: subreddit.toLowerCase() },
      update: upsertData,
      create: upsertData,
    });

    // Delete old rules and create new ones
    if (aiResult?.rules && aiResult.rules.length > 0) {
      await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
      
      for (const rule of aiResult.rules) {
        const matchingRaw = extractedRules.find((r: any) => r.name === rule.name);
        await db.rule.create({
          data: {
            subredditId: savedSub.id,
            ruleName: rule.name || 'Regla',
            ruleTextOriginal: matchingRaw?.textOriginal || '',
            ruleTextEs: rule.textEs || '',
            category: rule.keyRuleType || null,
            isKeyRule: rule.isKeyRule || false,
            keyRuleType: rule.keyRuleType || null,
            aiExplanation: rule.aiExplanation || '',
          },
        });
      }
    }

    const savedRules = await db.rule.findMany({
      where: { subredditId: savedSub.id },
    });

    return NextResponse.json({
      subreddit: savedSub,
      rules: savedRules,
      summaryEs: aiResult?.summaryEs || '',
      cached: false,
    });
  } catch (error: any) {
    console.error('Rules error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rules', details: error.message },
      { status: 500 }
    );
  }
}
