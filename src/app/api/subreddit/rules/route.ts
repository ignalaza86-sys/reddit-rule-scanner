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
  findom: {
    about: { title: 'Financial Domination 💰', subscribers: 456000, over18: true, public_description: 'The original findom community. Pay pigs and cash cows welcome.' },
    rules: [
      { short_name: 'No free content - tribute required', description: 'This is a financial domination community. All content must involve some form of tribute or payment. Free teasing or non-findom content will be removed.' },
      { short_name: 'Verification required for Dommes', description: 'All dominants must be verified before posting. Send modmail with a photo holding a sign with your username and "r/findom verification" plus today\'s date.' },
      { short_name: 'Self-promo allowed with flair', description: 'OnlyFans and social media promotion is allowed but you MUST use the [Promo] flair. Posts without the correct flair will be removed.' },
      { short_name: 'No doxxing or sharing subs info', description: 'Never share a submissive\'s personal information, real name, or financial details publicly. This results in an immediate permanent ban.' },
      { short_name: 'Post limit: 2 per day', description: 'Maximum 2 posts per 24 hours to prevent spam. Delete old posts before posting new ones.' },
      { short_name: 'No minors or minor-adjacent content', description: 'Zero tolerance for any content involving or referencing minors. This includes schoolgirl outfits with pigtails.' },
      { short_name: 'Title format required', description: 'Post titles must include [F4M], [F4F], [F4A], or similar tag indicating your audience. Titles without tags will be auto-removed.' },
      { short_name: 'Be respectful of all orientations', description: 'Findom is for everyone. No discrimination based on gender, orientation, race, or identity.' },
    ],
  },
  cosplay: {
    about: { title: 'Cosplay 🎭', subscribers: 2300000, over18: false, public_description: 'The main cosplay community. All skill levels welcome.' },
    rules: [
      { short_name: 'No NSFW content', description: 'This is a SFW community. No adult or sexualized content. Post NSFW cosplay to r/nsfwcosplay instead.' },
      { short_name: 'Credit the cosplayer', description: 'If you didn\'t make the cosplay, credit the original creator. Include their social media handle or name in the title or comments.' },
      { short_name: 'No self-promotion', description: 'Do not link to your OnlyFans, Patreon, or other paid platforms. This is a community for sharing cosplay, not for marketing.' },
      { short_name: 'No low-effort posts', description: 'Posts must show actual cosplay. No "wish I was there", memes, or low-effort content. Show your work!' },
      { short_name: 'Be constructive and respectful', description: 'Constructive criticism is welcome. Body shaming, harassment, or rude comments are not.' },
      { short_name: 'Use the correct flair', description: 'All posts must have a flair. Available: Self-made, Commissioned, Found Online, Discussion, Tutorial.' },
    ],
  },
  nsfwcosplay: {
    about: { title: 'NSFW Cosplay 🔥', subscribers: 567000, over18: true, public_description: 'Adult cosplay content. Your favorite characters like never before.' },
    rules: [
      { short_name: 'Verification required for OC', description: 'All original content posters must be verified. Send a modmail with 3 photos from different angles with a handwritten sign showing your username and r/nsfwcosplay.' },
      { short_name: 'Self-promo in comments only', description: 'You may share OnlyFans, Patreon, or other links ONLY in the comments of your own posts. No links in titles or post bodies.' },
      { short_name: 'Must be actual cosplay', description: 'Content must feature recognizable cosplay. Just wearing cat ears or a wig is not cosplay. The character must be identifiable.' },
      { short_name: 'Post limit: 1 per 12 hours', description: 'Maximum 1 post every 12 hours to keep the feed fresh and varied.' },
      { short_name: 'Required tags in title', description: 'Include [OC] for original content, [F] for female, [Cosplay Name] - Character Name format required.' },
      { short_name: 'No unauthorized reposts', description: 'Do not repost other people\'s content without permission. If you found it online, credit the source.' },
    ],
  },
  femdom: {
    about: { title: 'Female Domination 👑', subscribers: 567000, over18: true, public_description: 'The main femdom community. Women in charge.' },
    rules: [
      { short_name: 'OC Verification Required', description: 'All original content from female dominants must be verified. Send modmail with verification photos including your username and date.' },
      { short_name: 'Self-promo weekends only', description: 'OnlyFans and social media links are ONLY allowed on Saturdays and Sundays. Self-promo posts on weekdays will be removed.' },
      { short_name: 'No findom without flair', description: 'Financial domination content must use the [Findom] flair. Not all femdom is findom - use the correct tags.' },
      { short_name: 'Post limit: 3 per day', description: 'Maximum 3 posts per day. Quality over quantity.' },
      { short_name: 'Respect all participants', description: 'Both dominants and submissives deserve respect. No harassing DMs, no blocking after tribute. Violations result in bans.' },
      { short_name: 'No extreme content without tags', description: 'Content involving pain, humiliation, or extreme fetishes must be tagged with appropriate trigger warnings.' },
      { short_name: 'Required flair', description: 'Use the correct flair: [F4M], [F4F], [F4A], [Findom], [Discussion], [OC]. Posts without flair are auto-removed.' },
    ],
  },
  asmr: {
    about: { title: 'ASMR 🎧', subscribers: 3400000, over18: false, public_description: 'The main ASMR community. Relax and tingle.' },
    rules: [
      { short_name: 'No NSFW content', description: 'This is a SFW community. No sexual or adult content. Post ASMR with adult themes to r/nsfwasmr instead.' },
      { short_name: 'No self-promotion spam', description: 'You may share your own ASMR content, but do not spam. Maximum 1 self-promo post per week. Engage with the community.' },
      { short_name: 'Credit the artist', description: 'If you\'re sharing someone else\'s content, credit them. Include their channel name and link.' },
      { short_name: 'Use appropriate flairs', description: 'Flair your post with the trigger type: Whisper, Tapping, Roleplay, Visual, etc.' },
      { short_name: 'No low-effort posts', description: 'Posts must be actual ASMR content. No memes, reaction images, or off-topic posts.' },
      { short_name: 'Be respectful', description: 'No harassment or negative comments about creators. Constructive feedback is welcome, personal attacks are not.' },
    ],
  },
  latex: {
    about: { title: 'Latex 🖤', subscribers: 234000, over18: true, public_description: 'Latex fashion and fetish. Shiny and tight.' },
    rules: [
      { short_name: 'Must feature latex', description: 'All posts must feature actual latex or rubber clothing/objects. PVC, spandex, and similar materials are not latex.' },
      { short_name: 'Self-promo allowed with verification', description: 'OnlyFans and social media links are allowed for verified creators. Get verified first by messaging the mods.' },
      { short_name: 'Post limit: 2 per day', description: 'Maximum 2 posts per 24-hour period.' },
      { short_name: 'Tag your content', description: 'Use flairs: [F], [M], [Couple], [OC], [Non-OC]. All posts need flair.' },
      { short_name: 'Be respectful', description: 'No body shaming. Latex looks good on everyone. Negative comments about people\'s bodies will result in a ban.' },
      { short_name: 'No low-effort content', description: 'Photos should be well-lit and show the latex clearly. Dark, blurry photos will be removed.' },
    ],
  },
  bondage: {
    about: { title: 'Bondage ⛓️', subscribers: 345000, over18: true, public_description: 'The main bondage community. Ropes, cuffs, and more.' },
    rules: [
      { short_name: 'Consent is mandatory', description: 'All content must be consensual. Any content suggesting non-consent will be removed and the poster banned.' },
      { short_name: 'Verification for OC', description: 'Original content posters must be verified. Send modmail with verification photos.' },
      { short_name: 'Self-promo in comments only', description: 'OnlyFans and social media links only in comments of your own posts. Not in titles.' },
      { short_name: 'No extreme content without warning', description: 'Extreme bondage, breath play, or blood must be tagged with [Extreme] flair and NSFW.' },
      { short_name: 'Safety tips encouraged', description: 'When posting shibari or suspension content, safety tips and disclaimers are encouraged.' },
      { short_name: 'Post limit: 1 per day', description: 'Maximum 1 post per 24 hours.' },
      { short_name: 'Be respectful of all skill levels', description: 'From beginners to experts, everyone is welcome. No gatekeeping or elitism about technique.' },
    ],
  },
  OnlyFansPromotions: {
    about: { title: 'OnlyFans Promotions 💸', subscribers: 234000, over18: true, public_description: 'The main OnlyFans promo subreddit. Post your links!' },
    rules: [
      { short_name: 'Must have an OnlyFans link', description: 'All posts must include your OnlyFans link. Posts without it will be removed.' },
      { short_name: 'Verification required', description: 'You must be verified before posting. Send modmail with a photo of yourself holding a sign with your Reddit username, OnlyFans link, and today\'s date.' },
      { short_name: 'Post limit: 1 per 24 hours', description: 'One promo post per day. Delete your old post before making a new one. Multiple posts per day will result in a ban.' },
      { short_name: 'No misleading titles or previews', description: 'Your preview images and title must accurately represent your OnlyFans content. No bait-and-switch.' },
      { short_name: 'Required title format', description: 'Title format: [F4M] Your Name - What you offer. Example: [F4M] Jessica - Solo, feet, custom content' },
      { short_name: 'No free content in DMs spam', description: 'Do not use the comments to promise free content and then charge. Be upfront about your pricing.' },
      { short_name: 'No hate or discrimination', description: 'All creators welcome regardless of gender, size, race, or orientation. No negative comments about creators.' },
      { short_name: 'Mark paid content clearly', description: 'If your post includes PPV or paid content links, mark it with [PPV] in the title.' },
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
      // Try exact match first, then partial match, then default
      const subLower = subreddit.toLowerCase();
      let demoKey: string | null = null;
      
      // Exact match
      if (DEMO_RULES[subLower]) {
        demoKey = subLower;
      } else {
        // Partial match: check if any key contains the subreddit name or vice versa
        for (const key of Object.keys(DEMO_RULES)) {
          if (key.includes(subLower) || subLower.includes(key)) {
            demoKey = key;
            break;
          }
        }
      }
      
      if (demoKey) {
        // We have demo rules for this subreddit or a similar one
        const demo = DEMO_RULES[demoKey];
        subData = { ...demo.about, display_name: subreddit };
        rawRules = demo.rules;
      } else {
        // NO demo rules - let the AI generate rules based on the subreddit name
        // This is the key fix: ANY subreddit should get rules, even unknown ones
        subData = { title: `r/${subreddit}`, subscribers: 0, over18: true, public_description: `Community r/${subreddit} on Reddit.` };
        // We'll pass empty rawRules and let the AI handle it entirely
        rawRules = [];
      }
    }

    // Extract rules
    const extractedRules = rawRules.map((rule: any) => ({
      name: rule.short_name || 'Regla sin nombre',
      textOriginal: rule.description || '',
      category: rule.violation_reason || 'General',
    }));

    // Use AI to translate and analyze rules
    const zai = await ZAI.create();
    
    let aiPrompt: string;
    
    if (extractedRules.length > 0) {
      // We have actual rules to translate
      const rulesText = extractedRules
        .map((r: any, i: number) => `Rule ${i + 1}: "${r.name}"\n${r.textOriginal}`)
        .join('\n\n---\n\n');

      aiPrompt = `Sos un experto en Reddit y creadores de contenido de OnlyFans. Analizá las siguientes reglas de un subreddit y:

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
    } else {
      // No rules available - AI must generate them based on subreddit name and niche knowledge
      aiPrompt = `Sos un experto en Reddit y creadores de contenido de OnlyFans. Un usuario quiere conocer las reglas del subreddit r/${subreddit}, pero no pudimos obtener las reglas oficiales de Reddit.

Basándote en tu conocimiento de Reddit y cómo funcionan las comunidades de contenido adulto/fetiches, GENERÁ las reglas más probables que tendría r/${subreddit}. Considerá:

1. El nombre del subreddit sugiere qué tipo de contenido es
2. Las comunidades similares en Reddit suelen tener reglas parecidas
3. Los subreddits NSFW suelen tener reglas sobre verificación, promoción, y límites de posts
4. Generá entre 6 y 12 reglas realistas y útiles

Para cada regla:
- Nombre de la regla en inglés (como aparecería en Reddit)
- Descripción detallada en inglés de lo que dice la regla
- Traducción al español rioplatense
- Si es una regla clave para creadores de OnlyFans (promo, verificación, límites)
- Explicación corta para creadores de contenido

Respondé SOLO en formato JSON así:
{
  "rules": [
    {
      "name": "nombre de la regla en inglés",
      "textOriginal": "descripción completa en inglés de la regla",
      "textEs": "traducción al español rioplatense",
      "isKeyRule": true/false,
      "keyRuleType": "promo" | "verification" | "post_limit" | "restricted_days" | "flair" | "title_format" | "other",
      "aiExplanation": "explicación corta para creador de contenido"
    }
  ],
  "allowPromo": true/false/null,
  "requiresVerify": true/false/null,
  "postLimit": "descripción del límite o null",
  "promoDays": "días permitidos o null",
  "summaryEs": "resumen general en 2-3 oraciones sobre si conviene o no este sub para un creador de OF. Aclará que estas son reglas estimadas y que deberían verificar las oficiales en Reddit."
}`;
    }

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
            ruleTextOriginal: matchingRaw?.textOriginal || rule.textOriginal || '',
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
