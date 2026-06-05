import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

// Pre-built demo rules ALREADY IN SPANISH — no AI needed for these
const DEMO_RULES_ES: Record<string, { about: any; rules: any[]; summaryEs: string; allowPromo: boolean | null; requiresVerify: boolean | null; postLimit: string | null; promoDays: string | null }> = {
  feet: {
    about: { title: 'Feet 👣', subscribers: 1250000, over18: true, public_description: 'A community for foot lovers.' },
    summaryEs: 'Comunidad de fetichismo de pies. Autopromoción solo en comentarios. Verificación obligatoria para contenido original. Ideal para creadores de OnlyFans con contenido de pies.',
    allowPromo: null, requiresVerify: true, postLimit: '1 per 24h', promoDays: null,
    rules: [
      { ruleName: 'No self-promotion in titles', ruleTextOriginal: 'Do not include OnlyFans links or promotional text in post titles.', ruleTextEs: 'No incluyas links de OnlyFans ni texto promocional en los títulos de los posts.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Los links de OnlyFans van SOLO en comentarios, nunca en títulos. Si ponés un link en el título, te borran el post.' },
      { ruleName: 'OC Verification Required', ruleTextOriginal: 'All original content posters must be verified. Send modmail with verification photos.', ruleTextEs: 'Verificación obligatoria para contenido original. Enviá un modmail con fotos de verificación.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Tenés que verificar tu identidad con los mods antes de postear contenido propio. Normalmente te piden una foto con tu usuario y la fecha escrita en un papel.' },
      { ruleName: 'Self-promo in comments only', ruleTextOriginal: 'OnlyFans links ONLY in comments of your own posts.', ruleTextEs: 'Links de OnlyFans SOLO en comentarios de tus propios posts.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Podés compartir tu OnlyFans, pero solo en los comentarios de posts que vos creaste. Nada de links en el post mismo.' },
      { ruleName: 'Post limit: 1 per 24 hours', ruleTextOriginal: 'Maximum 1 post per 24-hour period.', ruleTextEs: 'Límite de posts: 1 cada 24 horas.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Solo podés postear una vez por día. Borrar y repostear para saltearte el límite te puede costar un ban.' },
      { ruleName: 'Minimum account age: 7 days', ruleTextOriginal: 'Account must be at least 7 days old to post.', ruleTextEs: 'Edad mínima de la cuenta: 7 días para poder postear.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Tu cuenta de Reddit tiene que tener al menos una semana. Si es nueva, vas a tener que esperar.' },
      { ruleName: 'No low-effort content', ruleTextOriginal: 'Photos must be well-lit and show effort.', ruleTextEs: 'No se permite contenido de baja calidad. Las fotos deben estar bien iluminadas.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Las fotos borrosas, oscuras o descuidadas las borran. Poné esfuerzo en la iluminación y composición.' },
      { ruleName: 'Required flair', ruleTextOriginal: 'All posts must have appropriate flair.', ruleTextEs: 'Flair obligatorio en todos los posts.', isKeyRule: true, keyRuleType: 'flair', aiExplanation: 'Todos los posts necesitan un flair (etiqueta). Si no lo ponés, te borran el post automáticamente.' },
      { ruleName: 'Be respectful', ruleTextOriginal: 'No harassment or disrespectful comments.', ruleTextEs: 'Sé respetuoso. No se permite acoso ni comentarios irrespetuosos.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Tratá a todos con respeto. Comentarios ofensivos o acosadores te pueden costar un ban.' },
      { ruleName: 'No selling outside designated threads', ruleTextOriginal: 'Sales and transactions only in weekly selling threads.', ruleTextEs: 'Ventas y transacciones solo en los threads semanales de ventas.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Si querés vender algo, hacelo solo en los threads designados. No vendas en posts regulares.' },
      { ruleName: 'No minors or minor-adjacent content', ruleTextOriginal: 'Absolutely no content involving or depicting minors.', ruleTextEs: 'Prohibido cualquier contenido que involucre o represente menores de edad.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Contenido con menores = ban permanente y posible reporte a las autoridades. Sin excepciones.' },
    ],
  },
  findom: {
    about: { title: 'Financial Domination 💰', subscribers: 456000, over18: true, public_description: 'The original findom community.' },
    summaryEs: 'Comunidad de dominación financiera. Autopromoción permitida con flair. Se requiere verificación para Dommes. Formato de título obligatorio con tags [F4M] etc.',
    allowPromo: true, requiresVerify: true, postLimit: '2 per day', promoDays: null,
    rules: [
      { ruleName: 'No free content - tribute required', ruleTextOriginal: 'All content must involve tribute or payment.', ruleTextEs: 'No hay contenido gratis — se requiere tributo. Todo debe involucrar pago.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Este es un sub de dominación financiera. Si no hay tributo o pago, el contenido se borra.' },
      { ruleName: 'Verification required for Dommes', ruleTextOriginal: 'All dominants must be verified before posting.', ruleTextEs: 'Verificación obligatoria para Dommes antes de postear.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Si sos Domme, tenés que verificarte con los mods antes de poder postear. Es para evitar catfishing.' },
      { ruleName: 'Self-promo allowed with flair', ruleTextOriginal: 'OnlyFans promotion allowed with [Promo] flair.', ruleTextEs: 'Autopromoción permitida con flair [Promo].', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Podés poner tu link de OnlyFaces, pero TENÉS que usar el flair [Promo]. Sin flair, te borran el post.' },
      { ruleName: 'No doxxing or sharing subs info', ruleTextOriginal: 'Never share personal information publicly.', ruleTextEs: 'Prohibido compartir información personal de los seguidores.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Nunca compartas info personal o financiera de tus subs. Ban inmediato si lo hacés.' },
      { ruleName: 'Post limit: 2 per day', ruleTextOriginal: 'Maximum 2 posts per 24 hours.', ruleTextEs: 'Límite de posts: 2 por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Podés postear hasta 2 veces por día. Borra los posts viejos antes de subir nuevos.' },
      { ruleName: 'Title format required', ruleTextOriginal: 'Titles must include [F4M], [F4F], [F4A] tags.', ruleTextEs: 'Formato de título obligatorio con tags [F4M], [F4F], [F4A].', isKeyRule: true, keyRuleType: 'title_format', aiExplanation: 'Los títulos necesitan tags de audiencia. Sin tag, el post se borra automáticamente.' },
      { ruleName: 'No scamming', ruleTextOriginal: 'Do not promise content and fail to deliver.', ruleTextEs: 'Prohibido estafar. No prometas contenido que no vas a entregar.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Las estafas se pagan con ban permanente. Si prometés algo, cumplí.' },
      { ruleName: 'Be respectful of all orientations', ruleTextOriginal: 'No discrimination.', ruleTextEs: 'Sé respetuoso con todas las orientaciones. Sin discriminación.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'No se tolera discriminación por orientación, género o preferencia.' },
      { ruleName: 'No catfishing', ruleTextOriginal: 'Use your real photos. Stolen content results in permanent ban.', ruleTextEs: 'Prohibido catfishing. Usá tus fotos reales. Contenido robado = ban permanente.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Tenés que usar fotos reales tuyas. Si te descubren usando fotos ajenas, ban permanente.' },
      { ruleName: 'Tribute verification', ruleTextOriginal: 'Screenshots of tributes must not include personal info of the payer.', ruleTextEs: 'Los screenshots de tributos no deben incluir info personal del pagador.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Cuando muestres comprobantes de tributos, tapá la info personal del que pagó.' },
    ],
  },
  OnlyFansPromotions: {
    about: { title: 'OnlyFans Promotions 💸', subscribers: 234000, over18: true, public_description: 'The main OnlyFans promo subreddit.' },
    summaryEs: 'Subreddit principal de promoción de OnlyFans. Se espera y permite la autopromoción. Verificación obligatoria. Formato de título requerido. Ideal para conseguir suscriptores.',
    allowPromo: true, requiresVerify: true, postLimit: '1 per 24h', promoDays: null,
    rules: [
      { ruleName: 'Must have an OnlyFans link', ruleTextOriginal: 'All posts must include your OnlyFans link.', ruleTextEs: 'Todos los posts deben incluir tu link de OnlyFans.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Sin link de OnlyFans, el post se borra. Este es un sub de promo, así que tu link es obligatorio.' },
      { ruleName: 'Verification required', ruleTextOriginal: 'You must be verified before posting.', ruleTextEs: 'Verificación obligatoria antes de postear.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Tenés que verificarte con los mods antes de poder postear. Es para evitar estafas y contenido robado.' },
      { ruleName: 'Post limit: 1 per 24 hours', ruleTextOriginal: 'One promo post per day.', ruleTextEs: 'Límite de posts: 1 por día. Un post promo por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Solo un post de promo cada 24 horas. Borra el viejo antes de subir uno nuevo.' },
      { ruleName: 'No misleading titles', ruleTextOriginal: 'Titles must accurately represent your content.', ruleTextEs: 'No títulos engañosos. El título debe representar tu contenido real.', isKeyRule: true, keyRuleType: 'title_format', aiExplanation: 'No hagas clickbait. Las fotos y títulos tienen que coincidir con lo que realmente ofrecés.' },
      { ruleName: 'Required title format', ruleTextOriginal: 'Title format: [F4M] Name - What you offer.', ruleTextEs: 'Formato de título obligatorio: [F4M] Nombre - Lo que ofrecés.', isKeyRule: true, keyRuleType: 'title_format', aiExplanation: 'Ejemplo: [F4M] Jessica - Solo, feet, customs. Sin este formato, el post se borra.' },
      { ruleName: 'No hate or discrimination', ruleTextOriginal: 'All creators welcome.', ruleTextEs: 'No odio ni discriminación. Todos los creadores son bienvenidos.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'No se tolera discriminación por género, tamaño, raza u orientación.' },
      { ruleName: 'Mark paid content clearly', ruleTextOriginal: 'Mark PPV content with [PPV] in title.', ruleTextEs: 'Marcá el contenido pago con [PPV] en el título.', isKeyRule: true, keyRuleType: 'title_format', aiExplanation: 'Si tu post incluye contenido pago (PPV), aclaralo con [PPV] en el título.' },
      { ruleName: 'No selling others content', ruleTextOriginal: 'Only promote your own OnlyFans.', ruleTextEs: 'Prohibido vender contenido ajeno. Solo promocioná tu propio OnlyFans.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Solo podés promover tu propia cuenta. Promocionar la de otro = ban.' },
      { ruleName: 'No spamming DMs', ruleTextOriginal: 'Do not spam DMs to users who comment on your posts.', ruleTextEs: 'No spamees DMs a los usuarios que comentan en tus posts.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Si alguien comenta en tu post, no lo spamees con DMs. Podés responder una vez, pero no insistas.' },
      { ruleName: 'Watermark your content', ruleTextOriginal: 'Watermark all images with your Reddit username for verification.', ruleTextEs: 'Poné marca de agua con tu usuario de Reddit en todas las imágenes para verificación.', isKeyRule: false, keyRuleType: 'verification', aiExplanation: 'Poner tu usuario de Reddit como marca de agua ayuda con la verificación y previene robos.' },
    ],
  },
  femdom: {
    about: { title: 'Female Domination 👠', subscribers: 567000, over18: true, public_description: 'The main femdom community.' },
    summaryEs: 'Comunidad de dominación femenina. Autopromoción solo los fines de semana. Verificación requerida para OC. Excelente para creadoras de contenido femdom.',
    allowPromo: null, requiresVerify: true, postLimit: '3 per day', promoDays: 'weekends only',
    rules: [
      { ruleName: 'Self-promo weekends only', ruleTextOriginal: 'OnlyFans links ONLY allowed on Saturdays and Sundays.', ruleTextEs: 'Autopromoción solo los fines de semana. Links de OnlyFans SOLO sábados y domingos.', isKeyRule: true, keyRuleType: 'restricted_days', aiExplanation: 'Solo podés poner links de OnlyFans los sábados y domingos. Entre semana, te borran el post.' },
      { ruleName: 'Required flair', ruleTextOriginal: 'Use correct flair: [F4M], [F4F], [Findom], [Discussion], [OC].', ruleTextEs: 'Flair obligatorio: [F4M], [F4F], [Findom], [Discussion], [OC].', isKeyRule: true, keyRuleType: 'flair', aiExplanation: 'Todos los posts necesitan flair. Si no ponés el correcto, te lo borran.' },
      { ruleName: 'Post limit: 3 per day', ruleTextOriginal: 'Maximum 3 posts per day.', ruleTextEs: 'Límite de posts: 3 por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Hasta 3 posts por día. Calidad antes que cantidad.' },
      { ruleName: 'Consent is paramount', ruleTextOriginal: 'All content must depict consensual activities.', ruleTextEs: 'El consentimiento es obligatorio. Todo el contenido debe ser consensuado.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Todo tiene que ser consensuado. Contenido que sugiera lo contrario se borra y se reporta.' },
      { ruleName: 'No findom without flair', ruleTextOriginal: 'Financial domination content must use the [Findom] flair.', ruleTextEs: 'No postees findom sin flair [Findom].', isKeyRule: true, keyRuleType: 'flair', aiExplanation: 'Si tu contenido es de dominación financiera, tiene que llevar el flair [Findom].' },
      { ruleName: 'Verification for OC', ruleTextOriginal: 'Original content posters must be verified.', ruleTextEs: 'Verificación obligatoria para contenido original.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Si posteás contenido propio, tenés que estar verificada. Enviá modmail con fotos de verificación.' },
      { ruleName: 'No extreme content without tags', ruleTextOriginal: 'Content involving pain or humiliation must be tagged.', ruleTextEs: 'Contenido extremo requiere advertencia y tags.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Si tu contenido es extremo (dolor, humillación), poné advertencias y tags.' },
      { ruleName: 'No catfishing or stolen content', ruleTextOriginal: 'Only post your own content or properly credited content.', ruleTextEs: 'Prohibido catfishing o contenido robado. Solo postea tu propio contenido.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Usá solo fotos tuyas. Contenido robado o de otra persona = ban permanente.' },
      { ruleName: 'Respect boundaries', ruleTextOriginal: 'Respect the boundaries of all community members.', ruleTextEs: 'Respetá los límites de todos los miembros de la comunidad.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Respetá los límites de los demás. Si alguien dice que no, es no.' },
      { ruleName: 'No solicitation in DMs', ruleTextOriginal: 'Do not use posts to solicit DMs or private sessions.', ruleTextEs: 'No usés los posts para pedir DMs o sesiones privadas.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'No pidas que te escriban por DM en los posts. Es spam y te pueden banear.' },
    ],
  },
  cosplay: {
    about: { title: 'Cosplay 🎭', subscribers: 2300000, over18: false, public_description: 'The main cosplay community.' },
    summaryEs: 'Comunidad de cosplay. Autopromoción de OnlyFans solo en comentarios. El contenido debe ser cosplay reconocible. Buena visibilidad para creadoras de cosplay.',
    allowPromo: null, requiresVerify: false, postLimit: '1 per 12h', promoDays: null,
    rules: [
      { ruleName: 'Must be actual cosplay', ruleTextOriginal: 'Content must feature recognizable cosplay of a specific character.', ruleTextEs: 'Tiene que ser cosplay real de un personaje reconocible.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Ponerse orejitas de gato no es cosplay. El personaje tiene que ser reconocible.' },
      { ruleName: 'Self-promo in comments only', ruleTextOriginal: 'OnlyFans and Patreon links ONLY in comments.', ruleTextEs: 'Autopromoción de OnlyFans/Patreon SOLO en comentarios.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Links de OnlyFans van solo en comentarios de tus posts, nunca en títulos ni en el post.' },
      { ruleName: 'Required tags in title', ruleTextOriginal: 'Include [OC] and character name in title.', ruleTextEs: 'Tags obligatorios en título: [OC] y nombre del personaje.', isKeyRule: true, keyRuleType: 'title_format', aiExplanation: 'Poné [OC] si es tu contenido y el nombre del personaje. Ej: [OC] Harley Quinn.' },
      { ruleName: 'Post limit: 1 per 12 hours', ruleTextOriginal: 'Maximum 1 post every 12 hours.', ruleTextEs: 'Límite de posts: 1 cada 12 horas.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un post cada 12 horas para mantener el feed variado.' },
      { ruleName: 'No unauthorized reposts', ruleTextOriginal: 'Do not repost other people content without permission.', ruleTextEs: 'No reposts sin permiso. No publiques contenido de otros sin autorización.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Si compartís contenido de otro, dale crédito. Sin permiso, te lo borran.' },
      { ruleName: 'Credit the cosplayer', ruleTextOriginal: 'If not OC, credit the original cosplayer.', ruleTextEs: 'Si no es OC, dale crédito al cosplayer original.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Si no es tu cosplay, mencioná quién lo hizo.' },
      { ruleName: 'No AI-generated cosplay', ruleTextOriginal: 'AI-generated images of cosplay are not allowed.', ruleTextEs: 'No se permiten imágenes de cosplay generadas por IA.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Imágenes generadas con IA no cuentan como cosplay real. Solo contenido humano.' },
      { ruleName: 'Be constructive', ruleTextOriginal: 'Constructive feedback only. No body shaming or harassment.', ruleTextEs: 'Solo feedback constructivo. No body shaming ni acoso.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Críticas constructivas sí, insultos no. Tratá a todos con respeto.' },
    ],
  },
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const subreddit = searchParams.get('subreddit');

  if (!subreddit) {
    return NextResponse.json({ error: 'Parameter "subreddit" is required' }, { status: 400 });
  }

  const subLower = subreddit.toLowerCase();

  try {
    // 1. Check DB cache first (fast path)
    try {
      const existingSub = await db.subreddit.findUnique({
        where: { name: subLower },
        include: { rules: true },
      });
      if (existingSub && existingSub.rules.length > 0) {
        const cacheAge = Date.now() - existingSub.updatedAt.getTime();
        if (cacheAge < 24 * 60 * 60 * 1000) {
          return NextResponse.json({ subreddit: existingSub, rules: existingSub.rules, cached: true });
        }
      }
    } catch (dbErr) {
      console.error('DB read error (non-fatal):', dbErr);
    }

    // 2. FAST PATH: Check demo data with pre-built Spanish rules (no AI needed!)
    const demoKey = Object.keys(DEMO_RULES_ES).find(k => k === subLower || subLower.includes(k) || k.includes(subLower));
    if (demoKey) {
      const demo = DEMO_RULES_ES[demoKey];
      const subData = {
        name: subLower,
        displayName: demo.about.title || `r/${subLower}`,
        description: demo.about.public_description || '',
        subscribers: demo.about.subscribers || 0,
        over18: demo.about.over18 || false,
        allowPromo: demo.allowPromo,
        requiresVerify: demo.requiresVerify,
        postLimit: demo.postLimit,
        promoDays: demo.promoDays,
        iconUrl: null,
      };

      // Save to DB for caching (non-blocking)
      try {
        const savedSub = await db.subreddit.upsert({ where: { name: subLower }, update: subData, create: subData });
        await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
        for (const rule of demo.rules) {
          await db.rule.create({ data: { subredditId: savedSub.id, ...rule } });
        }
        const savedRules = await db.rule.findMany({ where: { subredditId: savedSub.id } });
        const fullSub = await db.subreddit.findUnique({ where: { id: savedSub.id } });
        return NextResponse.json({ subreddit: fullSub, rules: savedRules, summaryEs: demo.summaryEs, cached: false });
      } catch (dbErr) {
        console.error('DB save error for demo (non-fatal):', dbErr);
        return NextResponse.json({ subreddit: subData, rules: demo.rules.map((r, i) => ({ id: `demo-${i}`, ...r })), summaryEs: demo.summaryEs, cached: false });
      }
    }

    // 3. Try Reddit API with short timeout
    let subData: any = { title: `r/${subLower}`, subscribers: 0, over18: true, public_description: '' };
    let rawRules: any[] = [];
    let redditWorked = false;

    try {
      const [aboutRes, rulesRes] = await Promise.all([
        fetchWithTimeout(`https://www.reddit.com/r/${encodeURIComponent(subLower)}/about.json`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0', 'Accept': 'application/json' },
        }, 5000),
        fetchWithTimeout(`https://www.reddit.com/r/${encodeURIComponent(subLower)}/about/rules.json`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0', 'Accept': 'application/json' },
        }, 5000),
      ]);
      if (aboutRes.ok) { subData = (await aboutRes.json()).data || {}; redditWorked = true; }
      if (rulesRes.ok) { rawRules = (await rulesRes.json()).rules || []; redditWorked = true; }
    } catch (e) {
      console.log('Reddit API failed (expected):', e instanceof Error ? e.message : 'unknown');
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
              displayName: subData.title || subData.display_name || `r/${subLower}`,
              description: subData.public_description || '',
              subscribers: subData.subscribers || 0,
              over18: subData.over18 || false,
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
            return NextResponse.json({ subreddit: fullSub, rules: savedRules, summaryEs: aiResult.summaryEs || '', cached: false });
          } catch (dbErr) {
            console.error('DB save error (returning without cache):', dbErr);
            const rules = aiResult.rules.map((r: any, i: number) => ({
              id: `ai-${i}`, ruleName: r.name || 'Regla', ruleTextOriginal: extractedRules.find((er: any) => er.name === r.name)?.textOriginal || r.textOriginal || '', ruleTextEs: r.textEs || '', category: r.keyRuleType || null, isKeyRule: r.isKeyRule || false, keyRuleType: r.keyRuleType || null, aiExplanation: r.aiExplanation || '',
            }));
            return NextResponse.json({ subreddit: { name: subLower, displayName: subData.title || `r/${subLower}`, subscribers: subData.subscribers || 0, over18: subData.over18 || false, allowPromo: aiResult.allowPromo ?? null, requiresVerify: aiResult.requiresVerify ?? null }, rules, summaryEs: aiResult.summaryEs || '', cached: false });
          }
        }
      } catch (e) {
        console.error('AI translation failed:', e instanceof Error ? e.message : 'unknown');
      }

      // AI failed — save raw rules
      try {
        const upsertData: any = { name: subLower, displayName: subData.title || subData.display_name || `r/${subLower}`, description: subData.public_description || '', subscribers: subData.subscribers || 0, over18: subData.over18 || false, iconUrl: subData.icon_img || subData.community_icon || null };
        const savedSub = await db.subreddit.upsert({ where: { name: subLower }, update: upsertData, create: upsertData });
        await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
        for (const rule of extractedRules) {
          await db.rule.create({ data: { subredditId: savedSub.id, ruleName: rule.name, ruleTextOriginal: rule.textOriginal, ruleTextEs: rule.textOriginal, isKeyRule: false, keyRuleType: 'other' } });
        }
        const savedRules = await db.rule.findMany({ where: { subredditId: savedSub.id } });
        return NextResponse.json({ subreddit: savedSub, rules: savedRules, summaryEs: 'Reglas sin traducción de IA.', cached: false });
      } catch (dbErr) {
        const rules = extractedRules.map((r: any, i: number) => ({ id: `raw-${i}`, ruleName: r.name, ruleTextOriginal: r.textOriginal, ruleTextEs: r.textOriginal, isKeyRule: false, keyRuleType: 'other' }));
        return NextResponse.json({ subreddit: { name: subLower, displayName: subData.title || `r/${subLower}`, subscribers: subData.subscribers || 0, over18: subData.over18 || false }, rules, summaryEs: 'Reglas sin traducción.', cached: false });
      }
    }

    // 6. No rules — try AI generation (with timeout)
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();
      const completion = await Promise.race([
        zai.chat.completions.create({
          messages: [
            { role: 'system', content: 'Sos un experto en Reddit y OnlyFans. Respondé SOLO en JSON válido. No markdown.' },
            { role: 'user', content: `Generá 10 reglas probables para r/${subLower}. JSON: { "rules": [{ "name": "english name", "textOriginal": "english description", "textEs": "español rioplatense", "isKeyRule": bool, "keyRuleType": "promo|verification|post_limit|restricted_days|flair|title_format|other", "aiExplanation": "explicacion" }], "allowPromo": bool|null, "requiresVerify": bool|null, "postLimit": "string|null", "promoDays": "string|null", "summaryEs": "resumen. Aclará que son estimadas." }` },
          ],
          temperature: 0.3,
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('AI gen timeout')), 15000)),
      ]) as any;
      const content = completion.choices[0]?.message?.content || '';
      const aiResult = safeParseAIResponse(content);

      if (aiResult?.rules?.length > 0) {
        try {
          const upsertData: any = { name: subLower, displayName: subData.title || subData.display_name || `r/${subLower}`, description: subData.public_description || '', subscribers: subData.subscribers || 0, over18: subData.over18 || false, allowPromo: aiResult.allowPromo ?? null, requiresVerify: aiResult.requiresVerify ?? null, postLimit: aiResult.postLimit ?? null, promoDays: aiResult.promoDays ?? null, iconUrl: subData.icon_img || subData.community_icon || null };
          const savedSub = await db.subreddit.upsert({ where: { name: subLower }, update: upsertData, create: upsertData });
          await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
          for (const rule of aiResult.rules) {
            await db.rule.create({ data: { subredditId: savedSub.id, ruleName: rule.name || 'Regla', ruleTextOriginal: rule.textOriginal || '', ruleTextEs: rule.textEs || '', category: rule.keyRuleType || null, isKeyRule: rule.isKeyRule || false, keyRuleType: rule.keyRuleType || null, aiExplanation: rule.aiExplanation || '' } });
          }
          const savedRules = await db.rule.findMany({ where: { subredditId: savedSub.id } });
          const fullSub = await db.subreddit.findUnique({ where: { id: savedSub.id } });
          return NextResponse.json({ subreddit: fullSub, rules: savedRules, summaryEs: aiResult.summaryEs || '', cached: false });
        } catch (dbErr) {
          const rules = aiResult.rules.map((r: any, i: number) => ({ id: `gen-${i}`, ruleName: r.name || 'Regla', ruleTextOriginal: r.textOriginal || '', ruleTextEs: r.textEs || '', category: r.keyRuleType || null, isKeyRule: r.isKeyRule || false, keyRuleType: r.keyRuleType || null, aiExplanation: r.aiExplanation || '' }));
          return NextResponse.json({ subreddit: { name: subLower, displayName: subData.title || `r/${subLower}`, subscribers: subData.subscribers || 0, over18: subData.over18 || false, allowPromo: aiResult.allowPromo ?? null, requiresVerify: aiResult.requiresVerify ?? null }, rules, summaryEs: aiResult.summaryEs || '', cached: false });
        }
      }
    } catch (e) {
      console.error('AI generation failed:', e instanceof Error ? e.message : 'unknown');
    }

    // 7. Final fallback — smart rules from subreddit name
    try {
      const { generateFallbackRules, getRuleTranslation } = await import('@/lib/fallback-rules');
      const fallback = generateFallbackRules(subLower);
      const upsertData: any = { name: subLower, displayName: subData.title || subData.display_name || `r/${subLower}`, description: subData.public_description || '', subscribers: subData.subscribers || 0, over18: subData.over18 || fallback.isNSFW, allowPromo: fallback.allowPromo, requiresVerify: fallback.requiresVerify, iconUrl: subData.icon_img || subData.community_icon || null };
      const savedSub = await db.subreddit.upsert({ where: { name: subLower }, update: upsertData, create: upsertData });
      await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
      for (const rule of fallback.rules) {
        const t = getRuleTranslation(rule.short_name);
        await db.rule.create({ data: { subredditId: savedSub.id, ruleName: rule.short_name as string, ruleTextOriginal: rule.description as string, ruleTextEs: t.textEs, isKeyRule: rule.isKeyRule as boolean, keyRuleType: rule.keyRuleType as string, aiExplanation: t.aiExplanation } });
      }
      const savedRules = await db.rule.findMany({ where: { subredditId: savedSub.id } });
      return NextResponse.json({ subreddit: await db.subreddit.findUnique({ where: { id: savedSub.id } }), rules: savedRules, summaryEs: fallback.summaryEs, cached: false });
    } catch (fbErr) {
      console.error('Fallback rules failed:', fbErr);
      return NextResponse.json({
        subreddit: { name: subLower, displayName: `r/${subLower}`, description: '', subscribers: 0, over18: true, allowPromo: null, requiresVerify: true },
        rules: [{ id: 'fb-1', ruleName: 'Verificá las reglas oficiales', ruleTextOriginal: 'Check official rules on Reddit', ruleTextEs: 'No pudimos cargar las reglas. Visitá Reddit para ver las reglas oficiales.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Hubo un error al cargar. Intentá de nuevo más tarde.' }],
        summaryEs: 'No pudimos cargar las reglas. Intentá de nuevo o verificá en Reddit.',
        cached: false,
      });
    }
  } catch (error: any) {
    console.error('Rules fatal error:', error);
    return NextResponse.json({
      subreddit: { name: subLower, displayName: `r/${subLower}`, description: '', subscribers: 0, over18: true },
      rules: [{ id: 'err-1', ruleName: 'Error temporal', ruleTextOriginal: 'Temporary error', ruleTextEs: 'Hubo un error al cargar las reglas. Intentá de nuevo.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Error temporal. Intentá refrescar.' }],
      summaryEs: 'Error temporal. Intentá de nuevo.',
      cached: false,
    });
  }
}
