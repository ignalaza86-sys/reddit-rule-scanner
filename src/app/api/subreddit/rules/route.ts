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

// Pre-built demo rules ALREADY IN SPANISH — no AI needed for these
const DEMO_RULES_ES: Record<string, { about: any; rules: any[]; summaryEs: string; allowPromo: boolean | null; requiresVerify: boolean | null; postLimit: string | null; promoDays: string | null }> = {
  feet: {
    about: { title: 'Feet', subscribers: 485000, over18: true, public_description: 'A community for foot lovers.' },
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
    ],
  },
  findom: {
    about: { title: 'Financial Domination', subscribers: 210000, over18: true, public_description: 'The original findom community.' },
    summaryEs: 'Comunidad de dominación financiera. Autopromoción permitida con flair. Se requiere verificación para Dommes. Formato de título obligatorio con tags [F4M] etc.',
    allowPromo: true, requiresVerify: true, postLimit: '2 per day', promoDays: null,
    rules: [
      { ruleName: 'No free content - tribute required', ruleTextOriginal: 'All content must involve tribute or payment.', ruleTextEs: 'No hay contenido gratis — se requiere tributo. Todo debe involucrar pago.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Este es un sub de dominación financiera. Si no hay tributo o pago, el contenido se borra.' },
      { ruleName: 'Verification required for Dommes', ruleTextOriginal: 'All dominants must be verified before posting.', ruleTextEs: 'Verificación obligatoria para Dommes antes de postear.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Si sos Domme, tenés que verificarte con los mods antes de poder postear. Es para evitar catfishing.' },
      { ruleName: 'Self-promo allowed with flair', ruleTextOriginal: 'OnlyFans promotion allowed with [Promo] flair.', ruleTextEs: 'Autopromoción permitida con flair [Promo].', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Podés poner tu link de OnlyFans, pero TENÉS que usar el flair [Promo]. Sin flair, te borran el post.' },
      { ruleName: 'No doxxing or sharing subs info', ruleTextOriginal: 'Never share personal information publicly.', ruleTextEs: 'Prohibido compartir información personal de los seguidores.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Nunca compartas info personal o financiera de tus subs. Ban inmediato si lo hacés.' },
      { ruleName: 'Post limit: 2 per day', ruleTextOriginal: 'Maximum 2 posts per 24 hours.', ruleTextEs: 'Límite de posts: 2 por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Podés postear hasta 2 veces por día. Borra los posts viejos antes de subir nuevos.' },
      { ruleName: 'Title format required', ruleTextOriginal: 'Titles must include [F4M], [F4F], [F4A] tags.', ruleTextEs: 'Formato de título obligatorio con tags [F4M], [F4F], [F4A].', isKeyRule: true, keyRuleType: 'title_format', aiExplanation: 'Los títulos necesitan tags de audiencia. Sin tag, el post se borra automáticamente.' },
      { ruleName: 'No scamming', ruleTextOriginal: 'Do not promise content and fail to deliver.', ruleTextEs: 'Prohibido estafar. No prometas contenido que no vas a entregar.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Las estafas se pagan con ban permanente. Si prometés algo, cumplí.' },
      { ruleName: 'No catfishing', ruleTextOriginal: 'Use your real photos. Stolen content results in permanent ban.', ruleTextEs: 'Prohibido catfishing. Usá tus fotos reales. Contenido robado = ban permanente.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Tenés que usar fotos reales tuyas. Si te descubren usando fotos ajenas, ban permanente.' },
    ],
  },
  femdom: {
    about: { title: 'Female Domination', subscribers: 828000, over18: true, public_description: 'The main femdom community.' },
    summaryEs: 'Comunidad de dominación femenina. Autopromoción solo los fines de semana. Verificación requerida para OC. Excelente para creadoras de contenido femdom.',
    allowPromo: null, requiresVerify: true, postLimit: '3 per day', promoDays: 'weekends only',
    rules: [
      { ruleName: 'Self-promo weekends only', ruleTextOriginal: 'OnlyFans links ONLY allowed on Saturdays and Sundays.', ruleTextEs: 'Autopromoción solo los fines de semana. Links de OnlyFans SOLO sábados y domingos.', isKeyRule: true, keyRuleType: 'restricted_days', aiExplanation: 'Solo podés poner links de OnlyFans los sábados y domingos. Entre semana, te borran el post.' },
      { ruleName: 'Required flair', ruleTextOriginal: 'Use correct flair: [F4M], [F4F], [Findom], [Discussion], [OC].', ruleTextEs: 'Flair obligatorio: [F4M], [F4F], [Findom], [Discussion], [OC].', isKeyRule: true, keyRuleType: 'flair', aiExplanation: 'Todos los posts necesitan flair. Si no ponés el correcto, te lo borran.' },
      { ruleName: 'Post limit: 3 per day', ruleTextOriginal: 'Maximum 3 posts per day.', ruleTextEs: 'Límite de posts: 3 por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Hasta 3 posts por día. Calidad antes que cantidad.' },
      { ruleName: 'Consent is paramount', ruleTextOriginal: 'All content must depict consensual activities.', ruleTextEs: 'El consentimiento es obligatorio. Todo el contenido debe ser consensuado.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Todo tiene que ser consensuado. Contenido que sugiera lo contrario se borra y se reporta.' },
      { ruleName: 'No findom without flair', ruleTextOriginal: 'Financial domination content must use the [Findom] flair.', ruleTextEs: 'No postees findom sin flair [Findom].', isKeyRule: true, keyRuleType: 'flair', aiExplanation: 'Si tu contenido es de dominación financiera, tiene que llevar el flair [Findom].' },
      { ruleName: 'Verification for OC', ruleTextOriginal: 'Original content posters must be verified.', ruleTextEs: 'Verificación obligatoria para contenido original.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Si posteás contenido propio, tenés que estar verificada. Enviá modmail con fotos de verificación.' },
      { ruleName: 'No catfishing or stolen content', ruleTextOriginal: 'Only post your own content or properly credited content.', ruleTextEs: 'Prohibido catfishing o contenido robado. Solo postea tu propio contenido.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Usá solo fotos tuyas. Contenido robado o de otra persona = ban permanente.' },
    ],
  },
  dommeslatinas: {
    about: { title: 'Dommes Latinas', subscribers: 12000, over18: true, public_description: 'Dominación femenina Latina. Findom y femdom para la comunidad hispana.' },
    summaryEs: 'Comunidad de dominación femenina Latina. Permite autopromoción con verificación. Formato de título obligatorio. Excelente nicho para Dommes de habla hispana en OnlyFans.',
    allowPromo: true, requiresVerify: true, postLimit: '1 per day', promoDays: null,
    rules: [
      { ruleName: 'Verificación obligatoria para Dommes', ruleTextOriginal: 'All Dommes must be verified before posting. Send modmail with verification photos.', ruleTextEs: 'Verificación obligatoria para Dommes antes de postear. Enviá modmail con fotos de verificación.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Si sos Domme, tenés que verificarte con los mods antes de poder postear. Es para evitar catfishing y proteger a la comunidad.' },
      { ruleName: 'Autopromoción permitida', ruleTextOriginal: 'OnlyFans and social media links allowed in posts and comments.', ruleTextEs: 'Autopromoción de OnlyFaces y redes sociales permitida en posts y comentarios.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Podés compartir tu OnlyFaces y redes sociales. Este sub es amigable para creadoras de contenido.' },
      { ruleName: 'Formato de título requerido', ruleTextOriginal: 'Titles must include [F4M], [F4F], [F4A] tags and language indicator.', ruleTextEs: 'Formato de título obligatorio con tags [F4M], [F4F], [F4A] y indicador de idioma.', isKeyRule: true, keyRuleType: 'title_format', aiExplanation: 'Ejemplo: [F4M] [ES] GoddessJessica - Tributos y contenido exclusivo. Sin formato, se borra.' },
      { ruleName: 'Límite de posts: 1 por día', ruleTextOriginal: 'Maximum 1 post per 24 hours.', ruleTextEs: 'Límite de posts: 1 cada 24 horas.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Solo podés postear una vez por día. Borrar y repostear para saltearte el límite te puede costar un ban.' },
      { ruleName: 'Contenido en español o bilingüe', ruleTextOriginal: 'Content should be in Spanish or bilingual (Spanish/English).', ruleTextEs: 'El contenido debe estar en español o bilingüe (español/inglés).', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Este es un espacio para la comunidad Latina. Posteá en español o con subtítulos/traducciones.' },
      { ruleName: 'No catfishing', ruleTextOriginal: 'Use your real photos. Stolen content results in permanent ban.', ruleTextEs: 'Prohibido catfishing. Usá tus fotos reales. Contenido robado = ban permanente.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Tenés que usar fotos reales tuyas. Si te descubren usando fotos ajenas, ban permanente.' },
      { ruleName: 'No estafas', ruleTextOriginal: 'Do not promise content and fail to deliver.', ruleTextEs: 'Prohibido estafar. Si prometés contenido, cumplí. Las estafas = ban permanente.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Si prometés contenido a cambio de tributo, cumplí. Las estafas dañan la comunidad y se pagan con ban.' },
      { ruleName: 'Respeto entre miembros', ruleTextOriginal: 'Be respectful to all community members.', ruleTextEs: 'Sé respetuoso con todos los miembros de la comunidad. Sin discriminación.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Tratá a todos con respeto. Comentarios ofensivos o acosadores te pueden costar un ban.' },
    ],
  },
  latinas: {
    about: { title: 'Latinas', subscribers: 580000, over18: true, public_description: 'The largest Latina content community on Reddit.' },
    summaryEs: 'Comunidad Latina más grande de Reddit. Autopromoción solo en comentarios. Verificación obligatoria para OC. Excelente visibilidad para creadoras Latinas.',
    allowPromo: null, requiresVerify: true, postLimit: '1 per 24h', promoDays: null,
    rules: [
      { ruleName: 'Verificación obligatoria para OC', ruleTextOriginal: 'All original content posters must be verified. Send modmail with verification photos.', ruleTextEs: 'Verificación obligatoria para contenido original. Enviá modmail con fotos de verificación.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Tenés que verificar tu identidad con los mods antes de postear contenido propio. Te piden una foto con tu usuario y la fecha.' },
      { ruleName: 'Autopromoción solo en comentarios', ruleTextOriginal: 'OnlyFans and social media links ONLY in comments of your own posts.', ruleTextEs: 'Links de OnlyFans SOLO en comentarios de tus propios posts.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Podés compartir tu OnlyFans, pero solo en los comentarios. Nada de links en títulos o en el post.' },
      { ruleName: 'Límite de posts: 1 cada 24 horas', ruleTextOriginal: 'Maximum 1 post per 24-hour period.', ruleTextEs: 'Límite de posts: 1 cada 24 horas.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Solo podés postear una vez por día. Borrar y repostear para saltearte el límite te puede costar un ban.' },
      { ruleName: 'Flair obligatorio', ruleTextOriginal: 'All posts must have appropriate flair.', ruleTextEs: 'Flair obligatorio en todos los posts.', isKeyRule: true, keyRuleType: 'flair', aiExplanation: 'Todos los posts necesitan un flair (etiqueta). Si no lo ponés, te borran el post automáticamente.' },
      { ruleName: 'Contenido debe ser de Latinas', ruleTextOriginal: 'All content must feature Latina creators.', ruleTextEs: 'El contenido debe ser de creadoras Latinas.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Este es un espacio dedicado a Latinas. El contenido tiene que ser de personas que se identifican como Latinas.' },
      { ruleName: 'No contenido de baja calidad', ruleTextOriginal: 'Photos must be well-lit and show effort.', ruleTextEs: 'No se permite contenido de baja calidad. Las fotos deben estar bien iluminadas.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Las fotos borrosas, oscuras o descuidadas las borran. Poné esfuerzo en la iluminación y composición.' },
      { ruleName: 'No catfishing', ruleTextOriginal: 'Use your real photos. Stolen content results in permanent ban.', ruleTextEs: 'Prohibido catfishing. Usá tus fotos reales. Contenido robado = ban permanente.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Tenés que usar fotos reales tuyas. Fotos ajenas = ban permanente.' },
      { ruleName: 'Sé respetuoso', ruleTextOriginal: 'No harassment or disrespectful comments.', ruleTextEs: 'Sé respetuoso. No se permite acoso ni comentarios irrespetuosos.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Tratá a todos con respeto. Comentarios ofensivos o acosadores = ban.' },
    ],
  },
  OnlyFans101: {
    about: { title: 'OnlyFans 101', subscribers: 2924000, over18: true, public_description: 'The largest OF promo subreddit.' },
    summaryEs: 'Subreddit de promo de OnlyFans más grande de Reddit. Se espera autopromoción. Verificación obligatoria. Formato de título requerido. Esencial para todos los creadores.',
    allowPromo: true, requiresVerify: true, postLimit: '1 per 24h', promoDays: null,
    rules: [
      { ruleName: 'Must have an OnlyFans link', ruleTextOriginal: 'All posts must include your OnlyFans link.', ruleTextEs: 'Todos los posts deben incluir tu link de OnlyFans.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Sin link de OnlyFans, el post se borra. Este es un sub de promo, así que tu link es obligatorio.' },
      { ruleName: 'Verification required', ruleTextOriginal: 'You must be verified before posting.', ruleTextEs: 'Verificación obligatoria antes de postear.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Tenés que verificarte con los mods antes de poder postear. Es para evitar estafas y contenido robado.' },
      { ruleName: 'Post limit: 1 per 24 hours', ruleTextOriginal: 'One promo post per day.', ruleTextEs: 'Límite de posts: 1 por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Solo un post de promo cada 24 horas. Borra el viejo antes de subir uno nuevo.' },
      { ruleName: 'No misleading titles', ruleTextOriginal: 'Titles must accurately represent your content.', ruleTextEs: 'No títulos engañosos. El título debe representar tu contenido real.', isKeyRule: true, keyRuleType: 'title_format', aiExplanation: 'No hagas clickbait. Las fotos y títulos tienen que coincidir con lo que realmente ofrecés.' },
      { ruleName: 'Required title format', ruleTextOriginal: 'Title format: [F4M] Name - What you offer.', ruleTextEs: 'Formato de título obligatorio: [F4M] Nombre - Lo que ofrecés.', isKeyRule: true, keyRuleType: 'title_format', aiExplanation: 'Ejemplo: [F4M] Jessica - Solo, feet, customs. Sin este formato, el post se borra.' },
      { ruleName: 'No selling others content', ruleTextOriginal: 'Only promote your own OnlyFans.', ruleTextEs: 'Prohibido vender contenido ajeno. Solo promocioná tu propio OnlyFans.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Solo podés promover tu propia cuenta. Promocionar la de otro = ban.' },
    ],
  },
  gothsluts: {
    about: { title: 'Goth Sluts', subscribers: 2679000, over18: true, public_description: 'The largest goth NSFW subreddit.' },
    summaryEs: 'Subreddit goth NSFW más grande de Reddit. Verificación requerida para OC. Autopromoción solo en comentarios. Uno de los subs que más crece — excelente para creadoras alt/goth.',
    allowPromo: null, requiresVerify: true, postLimit: '1 per 24h', promoDays: null,
    rules: [
      { ruleName: 'Must feature goth/alt aesthetic', ruleTextOriginal: 'Content must feature goth, alternative, or dark aesthetic.', ruleTextEs: 'El contenido debe mostrar estética goth, alternativa u oscura.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'No alcanza con vestirse de negro. Tiene que ser claramente estética goth/alt: maquillaje, accesorios, estilo.' },
      { ruleName: 'OC Verification Required', ruleTextOriginal: 'All original content posters must be verified.', ruleTextEs: 'Verificación obligatoria para contenido original.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Tenés que verificar tu identidad con los mods antes de postear contenido propio.' },
      { ruleName: 'Self-promo in comments only', ruleTextOriginal: 'OnlyFans links ONLY in comments of your own posts.', ruleTextEs: 'Links de OnlyFaces SOLO en comentarios de tus propios posts.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Podés compartir tu OnlyFaces, pero solo en los comentarios. Nada de links en títulos.' },
      { ruleName: 'Post limit: 1 per 24 hours', ruleTextOriginal: 'Maximum 1 post per 24-hour period.', ruleTextEs: 'Límite de posts: 1 cada 24 horas.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Solo podés postear una vez por día. Borrar y repostear te puede costar un ban.' },
      { ruleName: 'Required flair', ruleTextOriginal: 'All posts must have appropriate flair.', ruleTextEs: 'Flair obligatorio en todos los posts.', isKeyRule: true, keyRuleType: 'flair', aiExplanation: 'Todos los posts necesitan un flair (etiqueta). Si no lo ponés, te borran el post.' },
      { ruleName: 'No catfishing or stolen content', ruleTextOriginal: 'Use your real photos. Stolen content results in permanent ban.', ruleTextEs: 'Prohibido catfishing o contenido robado. Solo postea tu propio contenido.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Usá solo fotos tuyas. Contenido robado = ban permanente.' },
      { ruleName: 'No low-effort content', ruleTextOriginal: 'Photos must be well-lit and show effort.', ruleTextEs: 'No se permite contenido de baja calidad.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Las fotos borrosas, oscuras o descuidadas las borran. Poné esfuerzo en la iluminación y composición.' },
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
    // 0. Check memory cache first (fastest path)
    const cacheKey = `rules:${subLower}`;
    const cachedResult = cache.get<{ subreddit: any; rules: any[]; summaryEs?: string; cached: boolean }>(cacheKey);
    if (cachedResult) {
      return NextResponse.json({ ...cachedResult, source: 'cache' });
    }

    // 1. Check DB cache first (fast path)
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
          const dbResult = { subreddit: existingSub, rules: existingSub.rules, cached: true };
          cache.set(cacheKey, dbResult, CACHE_TTL.rules);
          return NextResponse.json(dbResult);
        }
      }
    } catch (dbErr) {
      console.error('DB read error (non-fatal):', dbErr);
    }

    // 2. FAST PATH: Check pre-built Spanish rules (no AI needed!)
    const demoKey = Object.keys(DEMO_RULES_ES).find(k => k === subLower || subLower.includes(k) || k.includes(subLower));
    if (demoKey) {
      const demo = DEMO_RULES_ES[demoKey];
      // Use curated subscriber count (never 0 for known subreddits)
      const curatedSubs = getSubscriberCount(subLower) || demo.about.subscribers;
      const subData = {
        name: subLower,
        displayName: demo.about.title || `r/${subLower}`,
        description: demo.about.public_description || '',
        subscribers: curatedSubs,
        over18: demo.about.over18 || true,
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
        const result = { subreddit: fullSub, rules: savedRules, summaryEs: demo.summaryEs, cached: false };
        cache.set(cacheKey, result, CACHE_TTL.rules);
        return NextResponse.json(result);
      } catch (dbErr) {
        console.error('DB save error for demo (non-fatal):', dbErr);
        const result = { subreddit: subData, rules: demo.rules.map((r, i) => ({ id: `demo-${i}`, ...r })), summaryEs: demo.summaryEs, cached: false };
        cache.set(cacheKey, result, CACHE_TTL.rules);
        return NextResponse.json(result);
      }
    }

    // 3. Check curated data for subscriber count (even if we don't have pre-built rules)
    const curatedData = getSubredditData(subLower);

    // 4. Try Reddit API with short timeout
    let subData: any = { 
      title: `r/${subLower}`, 
      subscribers: curatedData?.subscribers || 0, 
      over18: true, 
      public_description: curatedData?.description || '' 
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

    // 5. Extract rules if Reddit worked
    const extractedRules = rawRules.map((rule: any) => ({
      name: rule.short_name || 'Regla',
      textOriginal: rule.description || '',
    }));

    // 6. If we have rules from Reddit, try AI translation (with timeout)
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
              allowPromo: aiResult.allowPromo ?? curatedData?.allowPromo ?? null,
              requiresVerify: aiResult.requiresVerify ?? curatedData?.requiresVerify ?? null,
              postLimit: aiResult.postLimit ?? curatedData?.postLimit ?? null,
              promoDays: aiResult.promoDays ?? curatedData?.promoDays ?? null,
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
            const result = { subreddit: fullSub, rules: savedRules, summaryEs: aiResult.summaryEs || '', cached: false };
            cache.set(cacheKey, result, CACHE_TTL.rules);
            return NextResponse.json(result);
          } catch (dbErr) {
            console.error('DB save error (returning without cache):', dbErr);
            const rules = aiResult.rules.map((r: any, i: number) => ({
              id: `ai-${i}`, ruleName: r.name || 'Regla', ruleTextOriginal: extractedRules.find((er: any) => er.name === r.name)?.textOriginal || r.textOriginal || '', ruleTextEs: r.textEs || '', category: r.keyRuleType || null, isKeyRule: r.isKeyRule || false, keyRuleType: r.keyRuleType || null, aiExplanation: r.aiExplanation || '',
            }));
            const result = { subreddit: { name: subLower, displayName: subData.title || curatedData?.displayName || `r/${subLower}`, subscribers: subData.subscribers || curatedData?.subscribers || 0, over18: subData.over18 || true, allowPromo: aiResult.allowPromo ?? curatedData?.allowPromo ?? null, requiresVerify: aiResult.requiresVerify ?? curatedData?.requiresVerify ?? null }, rules, summaryEs: aiResult.summaryEs || '', cached: false };
            cache.set(cacheKey, result, CACHE_TTL.rules);
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
        const result = { subreddit: savedSub, rules: savedRules, summaryEs: 'Reglas sin traducción de IA.', cached: false };
        cache.set(cacheKey, result, CACHE_TTL.rules);
        return NextResponse.json(result);
      } catch (dbErr) {
        const rules = extractedRules.map((r: any, i: number) => ({ id: `raw-${i}`, ruleName: r.name, ruleTextOriginal: r.textOriginal, ruleTextEs: r.textOriginal, isKeyRule: false, keyRuleType: 'other' }));
        const result = { subreddit: { name: subLower, displayName: subData.title || `r/${subLower}`, subscribers: subData.subscribers || curatedData?.subscribers || 0, over18: subData.over18 || true }, rules, summaryEs: 'Reglas sin traducción.', cached: false };
        cache.set(cacheKey, result, CACHE_TTL.rules);
        return NextResponse.json(result);
      }
    }

    // 7. No rules from Reddit — try AI generation (with timeout)
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();
      const contextInfo = curatedData 
        ? `Este subreddit tiene ${curatedData.subscribers} suscriptores, es NSFW, nicho: ${curatedData.niches.join(', ')}.`
        : '';
      const completion = await Promise.race([
        zai.chat.completions.create({
          messages: [
            { role: 'system', content: 'Sos un experto en Reddit y OnlyFans. Respondé SOLO en JSON válido. No markdown.' },
            { role: 'user', content: `Generá 8-10 reglas probables para r/${subLower}. ${contextInfo} JSON: { "rules": [{ "name": "english name", "textOriginal": "english description", "textEs": "español rioplatense", "isKeyRule": bool, "keyRuleType": "promo|verification|post_limit|restricted_days|flair|title_format|other", "aiExplanation": "explicacion" }], "allowPromo": bool|null, "requiresVerify": bool|null, "postLimit": "string|null", "promoDays": "string|null", "summaryEs": "resumen. Aclará que son estimadas." }` },
          ],
          temperature: 0.3,
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('AI gen timeout')), 15000)),
      ]) as any;
      const content = completion.choices[0]?.message?.content || '';
      const aiResult = safeParseAIResponse(content);

      if (aiResult?.rules?.length > 0) {
        try {
          const upsertData: any = { name: subLower, displayName: subData.title || subData.display_name || curatedData?.displayName || `r/${subLower}`, description: subData.public_description || curatedData?.description || '', subscribers: subData.subscribers || curatedData?.subscribers || 0, over18: subData.over18 || true, allowPromo: aiResult.allowPromo ?? curatedData?.allowPromo ?? null, requiresVerify: aiResult.requiresVerify ?? curatedData?.requiresVerify ?? null, postLimit: aiResult.postLimit ?? curatedData?.postLimit ?? null, promoDays: aiResult.promoDays ?? curatedData?.promoDays ?? null, iconUrl: subData.icon_img || subData.community_icon || null };
          const savedSub = await db.subreddit.upsert({ where: { name: subLower }, update: upsertData, create: upsertData });
          await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
          for (const rule of aiResult.rules) {
            await db.rule.create({ data: { subredditId: savedSub.id, ruleName: rule.name || 'Regla', ruleTextOriginal: rule.textOriginal || '', ruleTextEs: rule.textEs || '', category: rule.keyRuleType || null, isKeyRule: rule.isKeyRule || false, keyRuleType: rule.keyRuleType || null, aiExplanation: rule.aiExplanation || '' } });
          }
          const savedRules = await db.rule.findMany({ where: { subredditId: savedSub.id } });
          const fullSub = await db.subreddit.findUnique({ where: { id: savedSub.id } });
          const result = { subreddit: fullSub, rules: savedRules, summaryEs: aiResult.summaryEs || '', cached: false };
          cache.set(cacheKey, result, CACHE_TTL.rules);
          return NextResponse.json(result);
        } catch (dbErr) {
          const rules = aiResult.rules.map((r: any, i: number) => ({ id: `gen-${i}`, ruleName: r.name || 'Regla', ruleTextOriginal: r.textOriginal || '', ruleTextEs: r.textEs || '', category: r.keyRuleType || null, isKeyRule: r.isKeyRule || false, keyRuleType: r.keyRuleType || null, aiExplanation: r.aiExplanation || '' }));
          const result = { subreddit: { name: subLower, displayName: subData.title || curatedData?.displayName || `r/${subLower}`, subscribers: subData.subscribers || curatedData?.subscribers || 0, over18: subData.over18 || true, allowPromo: aiResult.allowPromo ?? curatedData?.allowPromo ?? null, requiresVerify: aiResult.requiresVerify ?? curatedData?.requiresVerify ?? null }, rules, summaryEs: aiResult.summaryEs || '', cached: false };
          cache.set(cacheKey, result, CACHE_TTL.rules);
          return NextResponse.json(result);
        }
      }
    } catch (e) {
      console.error('AI generation failed:', e instanceof Error ? e.message : 'unknown');
    }

    // 8. Final fallback — smart rules from subreddit name
    try {
      const { generateFallbackRules, getRuleTranslation } = await import('@/lib/fallback-rules');
      const fallback = generateFallbackRules(subLower);
      const finalSubs = subData.subscribers || curatedData?.subscribers || 0;
      const upsertData: any = { name: subLower, displayName: subData.title || subData.display_name || curatedData?.displayName || `r/${subLower}`, description: subData.public_description || curatedData?.description || '', subscribers: finalSubs, over18: subData.over18 || fallback.isNSFW, allowPromo: fallback.allowPromo ?? curatedData?.allowPromo ?? null, requiresVerify: fallback.requiresVerify ?? curatedData?.requiresVerify ?? null, iconUrl: subData.icon_img || subData.community_icon || null };
      const savedSub = await db.subreddit.upsert({ where: { name: subLower }, update: upsertData, create: upsertData });
      await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
      for (const rule of fallback.rules) {
        const t = getRuleTranslation(rule.short_name);
        await db.rule.create({ data: { subredditId: savedSub.id, ruleName: rule.short_name as string, ruleTextOriginal: rule.description as string, ruleTextEs: t.textEs, isKeyRule: rule.isKeyRule as boolean, keyRuleType: rule.keyRuleType as string, aiExplanation: t.aiExplanation } });
      }
      const savedRules = await db.rule.findMany({ where: { subredditId: savedSub.id } });
      const result = { subreddit: await db.subreddit.findUnique({ where: { id: savedSub.id } }), rules: savedRules, summaryEs: fallback.summaryEs, cached: false };
      cache.set(cacheKey, result, CACHE_TTL.rules);
      return NextResponse.json(result);
    } catch (fbErr) {
      console.error('Fallback rules failed:', fbErr);
      const finalSubs = subData.subscribers || curatedData?.subscribers || 0;
      const result = {
        subreddit: { name: subLower, displayName: curatedData?.displayName || `r/${subLower}`, description: curatedData?.description || '', subscribers: finalSubs, over18: true, allowPromo: curatedData?.allowPromo ?? null, requiresVerify: curatedData?.requiresVerify ?? true },
        rules: [{ id: 'fb-1', ruleName: 'Verificá las reglas oficiales', ruleTextOriginal: 'Check official rules on Reddit', ruleTextEs: 'No pudimos cargar las reglas. Visitá Reddit para ver las reglas oficiales.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Hubo un error al cargar. Intentá de nuevo más tarde o verificá directamente en Reddit.' }],
        summaryEs: finalSubs > 0 
          ? `Comunidad con ~${finalSubs.toLocaleString()} miembros. No pudimos cargar las reglas automáticamente — verificá en Reddit.`
          : 'No pudimos cargar las reglas. Intentá de nuevo o verificá en Reddit.',
        cached: false,
      };
      cache.set(cacheKey, result, CACHE_TTL.rules);
      return NextResponse.json(result);
    }
  } catch (error: any) {
    console.error('Rules fatal error:', error);
    const curatedData = getSubredditData(subLower);
    const result = {
      subreddit: { name: subLower, displayName: curatedData?.displayName || `r/${subLower}`, description: curatedData?.description || '', subscribers: curatedData?.subscribers || 0, over18: true },
      rules: [{ id: 'err-1', ruleName: 'Error temporal', ruleTextOriginal: 'Temporary error', ruleTextEs: 'Hubo un error al cargar las reglas. Intentá de nuevo.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Error temporal. Intentá refrescar.' }],
      summaryEs: curatedData?.subscribers 
        ? `Comunidad con ~${curatedData.subscribers.toLocaleString()} miembros. Error temporal — intentá de nuevo.`
        : 'Error temporal. Intentá de nuevo.',
      cached: false,
    };
    return NextResponse.json(result);
  }
}
