// Fallback rules for when Reddit API fails and AI is unavailable
// Organized by niche for smart matching

export interface FallbackRule {
  short_name: string;
  description: string;
  isKeyRule: boolean;
  keyRuleType: string;
}

export interface FallbackResult {
  rules: FallbackRule[];
  niche: string;
  isNSFW: boolean;
  allowPromo: boolean | null;
  requiresVerify: boolean;
  summaryEs: string;
}

const NICHE_KEYWORDS: Record<string, string[]> = {
  feet: ['feet', 'foot', 'soles', 'toes', 'pedicure', 'footfetish', 'feetpics', 'footworship', 'feetjobs'],
  findom: ['findom', 'paypig', 'tribute', 'goddessworship', 'goddess'],
  femdom: ['femdom', 'dominatrix', 'mistress', 'chastity', 'joi', 'edging', 'pegging', 'domme', 'dommes'],
  cosplay: ['cosplay', 'cosplayer'],
  asmr: ['asmr'],
  bondage: ['bondage', 'shibari', 'ropetied', 'bdsm', 'sensory'],
  latex: ['latex', 'rubber', 'pvc'],
  lingerie: ['lingerie', 'stockings', 'pantyhose', 'nylons'],
  smoking: ['smoking', 'cigarette', 'vape'],
  body: ['thick', 'bbw', 'petite', 'fitgirls', 'tall'],
  alt: ['goth', 'alt', 'tattoo', 'piercing', 'emo'],
  onlyfans: ['onlyfans'],
  hotwife: ['hotwife', 'cuckold'],
  roleplay: ['roleplay', 'giantess'],
  latina: ['latina', 'latinas', 'latin', 'español', 'mexicana', 'argentina', 'colombiana', 'dommeslatinas'],
};

const NICHE_RULES: Record<string, FallbackRule[]> = {
  feet: [
    { short_name: 'Content must feature feet', description: 'All posts must prominently feature feet/soles/toes. If feet are not the main focus, the post will be removed.', isKeyRule: false, keyRuleType: 'other' },
    { short_name: 'Self-promo in comments only', description: 'You may share OnlyFans and social media links ONLY in the comments of your own posts. No links in titles or post bodies.', isKeyRule: true, keyRuleType: 'promo' },
    { short_name: 'Post limit: 1 per 24 hours', description: 'Maximum 1 post per 24-hour period to keep the feed varied. Deleting and reposting to bypass will result in a ban.', isKeyRule: true, keyRuleType: 'post_limit' },
    { short_name: 'Required flair', description: 'All posts must have a flair: OC, Non-OC, Request, Discussion. Incorrect flair = post removal.', isKeyRule: true, keyRuleType: 'flair' },
    { short_name: 'No low-effort content', description: 'Photos should be well-lit and show effort in composition. Blurry, poorly lit, or low-resolution images will be removed.', isKeyRule: false, keyRuleType: 'other' },
    { short_name: 'No non-feet content', description: 'Content must feature feet as the primary focus. Full body shots are ok only if feet are clearly visible and prominent.', isKeyRule: false, keyRuleType: 'other' },
  ],
  findom: [
    { short_name: 'No free content - tribute required', description: 'This is a financial domination community. All content must involve tribute or payment. Free teasing will be removed.', isKeyRule: true, keyRuleType: 'promo' },
    { short_name: 'Self-promo allowed with flair', description: 'OnlyFans and social media links allowed but you MUST use the [Promo] flair. Posts without it will be removed.', isKeyRule: true, keyRuleType: 'promo' },
    { short_name: 'Title format required', description: 'Post titles must include [F4M], [F4F], [F4A] or similar audience tag. Titles without tags are auto-removed.', isKeyRule: true, keyRuleType: 'title_format' },
    { short_name: 'Post limit: 2 per day', description: 'Maximum 2 posts per 24 hours. Delete old posts before posting new ones.', isKeyRule: true, keyRuleType: 'post_limit' },
    { short_name: 'No scamming', description: 'Do not promise content or services and fail to deliver. Scamming results in permanent ban.', isKeyRule: false, keyRuleType: 'other' },
    { short_name: 'No doxxing subs', description: 'Never share a submissive\'s personal information publicly. This results in an immediate permanent ban.', isKeyRule: false, keyRuleType: 'other' },
  ],
  femdom: [
    { short_name: 'Self-promo weekends only', description: 'OnlyFans and social media links ONLY allowed on Saturdays and Sundays. Self-promo on weekdays will be removed.', isKeyRule: true, keyRuleType: 'restricted_days' },
    { short_name: 'No findom without flair', description: 'Financial domination content must use the [Findom] flair. Not all femdom is findom.', isKeyRule: true, keyRuleType: 'flair' },
    { short_name: 'Post limit: 3 per day', description: 'Maximum 3 posts per day. Quality over quantity.', isKeyRule: true, keyRuleType: 'post_limit' },
    { short_name: 'Consent is paramount', description: 'All content must depict consensual activities. Content suggesting non-consent will be removed and reported.', isKeyRule: false, keyRuleType: 'other' },
    { short_name: 'Required flair', description: 'Use the correct flair: [F4M], [F4F], [F4A], [Findom], [Discussion], [OC].', isKeyRule: true, keyRuleType: 'flair' },
    { short_name: 'No extreme content without tags', description: 'Content involving pain, humiliation, or extreme fetishes must be tagged with trigger warnings.', isKeyRule: false, keyRuleType: 'other' },
  ],
  cosplay: [
    { short_name: 'Must be actual cosplay', description: 'Content must feature recognizable cosplay. Just wearing cat ears or a wig is not cosplay. The character must be identifiable.', isKeyRule: false, keyRuleType: 'other' },
    { short_name: 'Self-promo in comments only', description: 'OnlyFans and Patreon links ONLY in comments of your own posts. No links in titles or post bodies.', isKeyRule: true, keyRuleType: 'promo' },
    { short_name: 'Required tags in title', description: 'Include [OC] for original content. [Cosplay Name] - Character Name format required.', isKeyRule: true, keyRuleType: 'title_format' },
    { short_name: 'Post limit: 1 per 12 hours', description: 'Maximum 1 post every 12 hours to keep the feed fresh.', isKeyRule: true, keyRuleType: 'post_limit' },
    { short_name: 'No unauthorized reposts', description: 'Do not repost other people\'s content without permission. Credit the source.', isKeyRule: false, keyRuleType: 'other' },
  ],
  asmr: [
    { short_name: 'No NSFW content', description: 'This is a SFW community. No sexual or adult content. Post ASMR with adult themes to r/nsfwasmr instead.', isKeyRule: true, keyRuleType: 'other' },
    { short_name: 'No self-promotion spam', description: 'Maximum 1 self-promo post per week. Engage with the community beyond just posting links.', isKeyRule: true, keyRuleType: 'promo' },
    { short_name: 'Credit the artist', description: 'If sharing someone else\'s content, credit them with channel name and link.', isKeyRule: false, keyRuleType: 'other' },
    { short_name: 'Use appropriate flairs', description: 'Flair your post with trigger type: Whisper, Tapping, Roleplay, Visual, etc.', isKeyRule: true, keyRuleType: 'flair' },
  ],
  bondage: [
    { short_name: 'Consent is mandatory', description: 'All content must be consensual. Content suggesting non-consent will be removed and the poster banned.', isKeyRule: true, keyRuleType: 'other' },
    { short_name: 'Self-promo in comments only', description: 'OnlyFans and social media links only in comments of your own posts.', isKeyRule: true, keyRuleType: 'promo' },
    { short_name: 'No extreme content without warning', description: 'Extreme bondage, breath play, or blood must be tagged with [Extreme] flair and NSFW.', isKeyRule: true, keyRuleType: 'flair' },
    { short_name: 'Post limit: 1 per day', description: 'Maximum 1 post per 24 hours.', isKeyRule: true, keyRuleType: 'post_limit' },
    { short_name: 'Safety tips encouraged', description: 'When posting shibari or suspension content, include safety tips and disclaimers.', isKeyRule: false, keyRuleType: 'other' },
  ],
  latex: [
    { short_name: 'Must feature latex', description: 'All posts must feature actual latex or rubber. PVC, spandex, and similar are not latex.', isKeyRule: false, keyRuleType: 'other' },
    { short_name: 'Self-promo with verification', description: 'OnlyFans and social media links allowed for verified creators only.', isKeyRule: true, keyRuleType: 'promo' },
    { short_name: 'Post limit: 2 per day', description: 'Maximum 2 posts per 24-hour period.', isKeyRule: true, keyRuleType: 'post_limit' },
    { short_name: 'Tag your content', description: 'Use flairs: [F], [M], [Couple], [OC], [Non-OC].', isKeyRule: true, keyRuleType: 'flair' },
  ],
  lingerie: [
    { short_name: 'Must feature lingerie', description: 'All posts must feature lingerie, underwear, stockings or similar. Off-topic content removed.', isKeyRule: false, keyRuleType: 'other' },
    { short_name: 'Self-promo in comments only', description: 'OnlyFans and social media links ONLY in comments of your own posts.', isKeyRule: true, keyRuleType: 'promo' },
    { short_name: 'Post limit: 1 per day', description: 'Maximum 1 post per 24 hours.', isKeyRule: true, keyRuleType: 'post_limit' },
    { short_name: 'Required flair', description: 'Use flairs: [OC], [Non-OC], [Request], [Discussion].', isKeyRule: true, keyRuleType: 'flair' },
  ],
  smoking: [
    { short_name: 'Must feature smoking', description: 'All posts must feature smoking (cigarettes, cigars, vape). Non-smoking content removed.', isKeyRule: false, keyRuleType: 'other' },
    { short_name: 'Self-promo allowed with flair', description: 'OnlyFans links allowed with [Promo] flair only.', isKeyRule: true, keyRuleType: 'promo' },
    { short_name: 'Post limit: 2 per day', description: 'Maximum 2 posts per 24 hours.', isKeyRule: true, keyRuleType: 'post_limit' },
  ],
  body: [
    { short_name: 'Body-positive community', description: 'No body shaming. All body types welcome. Negative comments about bodies result in bans.', isKeyRule: false, keyRuleType: 'other' },
    { short_name: 'Self-promo in comments only', description: 'OnlyFans and social media links ONLY in comments of your own posts.', isKeyRule: true, keyRuleType: 'promo' },
    { short_name: 'Post limit: 1 per day', description: 'Maximum 1 post per 24 hours.', isKeyRule: true, keyRuleType: 'post_limit' },
    { short_name: 'Required flair', description: 'Use appropriate flair for your body type and content.', isKeyRule: true, keyRuleType: 'flair' },
  ],
  alt: [
    { short_name: 'Must feature alt/tattoo/goth aesthetic', description: 'Content should feature alternative style: tattoos, piercings, goth makeup, etc.', isKeyRule: false, keyRuleType: 'other' },
    { short_name: 'Self-promo in comments only', description: 'OnlyFans links only in comments.', isKeyRule: true, keyRuleType: 'promo' },
    { short_name: 'Post limit: 2 per day', description: 'Maximum 2 posts per 24 hours.', isKeyRule: true, keyRuleType: 'post_limit' },
  ],
  onlyfans: [
    { short_name: 'Must include OnlyFans link', description: 'All posts must include your OnlyFans link. Posts without it will be removed.', isKeyRule: true, keyRuleType: 'promo' },
    { short_name: 'Post limit: 1 per 24 hours', description: 'One promo post per day. Delete old posts before making new ones.', isKeyRule: true, keyRuleType: 'post_limit' },
    { short_name: 'No misleading titles', description: 'Preview images and title must accurately represent your content. No bait-and-switch.', isKeyRule: true, keyRuleType: 'title_format' },
    { short_name: 'Required title format', description: 'Title format: [F4M] Name - What you offer. Example: [F4M] Jessica - Solo, feet, customs', isKeyRule: true, keyRuleType: 'title_format' },
    { short_name: 'No hate or discrimination', description: 'All creators welcome regardless of gender, size, race, or orientation.', isKeyRule: false, keyRuleType: 'other' },
  ],
  hotwife: [
    { short_name: 'Self-promo with flair only', description: 'OnlyFans and social media links allowed with [Promo] flair only.', isKeyRule: true, keyRuleType: 'promo' },
    { short_name: 'Post limit: 1 per day', description: 'Maximum 1 post per 24 hours.', isKeyRule: true, keyRuleType: 'post_limit' },
    { short_name: 'Consent of all parties', description: 'All parties in content must consent. No posting without knowledge/permission of all involved.', isKeyRule: false, keyRuleType: 'other' },
  ],
  roleplay: [
    { short_name: 'Must be roleplay content', description: 'Content must involve roleplay scenarios or elements.', isKeyRule: false, keyRuleType: 'other' },
    { short_name: 'Self-promo in comments only', description: 'OnlyFans links only in comments.', isKeyRule: true, keyRuleType: 'promo' },
    { short_name: 'Post limit: 2 per day', description: 'Maximum 2 posts per 24 hours.', isKeyRule: true, keyRuleType: 'post_limit' },
  ],
  latina: [
    { short_name: 'Content must feature Latinas', description: 'All content must feature Latina creators or Latina-themed content.', isKeyRule: false, keyRuleType: 'other' },
    { short_name: 'Self-promo in comments only', description: 'OnlyFans and social media links ONLY in comments of your own posts.', isKeyRule: true, keyRuleType: 'promo' },
    { short_name: 'Post limit: 1 per 24 hours', description: 'Maximum 1 post per 24-hour period.', isKeyRule: true, keyRuleType: 'post_limit' },
    { short_name: 'Required flair', description: 'All posts must have appropriate flair: OC, Non-OC, etc.', isKeyRule: true, keyRuleType: 'flair' },
    { short_name: 'No catfishing', description: 'Use your real photos. Stolen content results in permanent ban.', isKeyRule: true, keyRuleType: 'verification' },
    { short_name: 'Spanish or bilingual content welcome', description: 'Content in Spanish or bilingual (Spanish/English) is encouraged.', isKeyRule: false, keyRuleType: 'other' },
  ],
  general: [
    { short_name: 'Self-promo rules vary', description: 'Check with moderators about self-promotion rules. Some allow it in comments, others ban it entirely. When in doubt, message the mods first.', isKeyRule: true, keyRuleType: 'promo' },
    { short_name: 'Post limit: check with mods', description: 'Most subreddits limit posting to 1-2 per day. Check the specific limits before posting.', isKeyRule: true, keyRuleType: 'post_limit' },
    { short_name: 'Use appropriate flairs', description: 'All posts should use the correct flair tag. If unsure, check existing posts or ask the mods.', isKeyRule: true, keyRuleType: 'flair' },
    { short_name: 'No low-effort content', description: 'Posts should show effort in quality, composition, and relevance to the community.', isKeyRule: false, keyRuleType: 'other' },
  ],
};

const BASE_RULES: FallbackRule[] = [
  { short_name: 'Follow Reddit site-wide rules', description: 'All posts must comply with Reddit\'s content policy. No minors, no non-consensual content, no illegal content. Violations result in permanent bans.', isKeyRule: false, keyRuleType: 'other' },
  { short_name: 'Be respectful', description: 'No harassment, hate speech, bullying, or personal attacks. Keep discussions civil and report rule-breaking behavior to the mods.', isKeyRule: false, keyRuleType: 'other' },
  { short_name: 'No doxxing or personal info', description: 'Do not share anyone\'s personal information, real name, location, or other identifying details without their explicit consent.', isKeyRule: false, keyRuleType: 'other' },
];

const NICHE_SUMMARIES: Record<string, string> = {
  feet: 'Comunidad de fetichismo de pies. La autopromoción suele permitirse solo en comentarios. Verificación obligatoria para OC. Ideal para creadores de contenido de pies en OnlyFans.',
  findom: 'Comunidad de dominación financiera. La autopromoción está permitida con flair. Se requiere verificación para Dommes. Formato de título obligatorio con tags [F4M] etc.',
  femdom: 'Comunidad de dominación femenina. Autopromoción generalmente solo los fines de semana. Verificación requerida. Excelente para creadoras de contenido femdom.',
  cosplay: 'Comunidad de cosplay. La autopromoción de OnlyFans solo en comentarios. El contenido debe ser cosplay reconocible. Buena visibilidad para creadoras de cosplay.',
  asmr: 'Comunidad ASMR (SFW). Autopromoción limitada a 1 post por semana. No se permite contenido NSFW. Buen lugar para construir audiencia.',
  bondage: 'Comunidad de bondage y shibari. Autopromoción solo en comentarios. El consentimiento es obligatorio. Contenido extremo requiere tags de advertencia.',
  latex: 'Comunidad de fetichismo de latex. Autopromoción permitida con verificación. El contenido debe mostrar latex real. Buen nicho para creadores especializados.',
  lingerie: 'Comunidad de lencería. Autopromoción solo en comentarios. Verificación requerida para OC. Excelente para creadores de contenido de lencería.',
  smoking: 'Comunidad de fetichismo de fumar. Autopromoción con flair. Nicho pequeño pero dedicado.',
  body: 'Comunidad de apreciación corporal. Autopromoción solo en comentarios. Ambiente body-positive. Buen lugar para creadores de diversos tipos corporales.',
  alt: 'Comunidad alternativa (goth/tattoo). Autopromoción en comentarios. Nicho dedicado con seguidores leales.',
  onlyfans: 'Subreddit de promoción directa de OnlyFans. Se permite y se espera autopromoción. Verificación obligatoria. Ideal para conseguir suscriptores.',
  hotwife: 'Comunidad hotwife/cuckold. Autopromoción con flair. Requiere consentimiento de todas las partes.',
  roleplay: 'Comunidad de roleplay. Autopromoción en comentarios. Contenido debe involucrar escenarios de roleplay.',
  latina: 'Comunidad Latina. Autopromoción solo en comentarios. Verificación requerida para OC. Excelente nicho para creadoras Latinas de OnlyFans. Contenido en español o bilingüe bienvenido.',
  general: 'Comunidad en Reddit. Las reglas de promoción varían — verificá con los moderadores. La mayoría de subreddits NSFW requieren verificación para OC.',
};

// Spanish translations for common rules
const RULE_TRANSLATIONS: Record<string, { textEs: string; aiExplanation: string }> = {
  'Verification required for OC': { textEs: 'Verificación obligatoria para contenido original', aiExplanation: 'Tenés que verificar tu identidad con los moderadores antes de postear contenido propio. Normalmente te piden una foto con tu usuario y la fecha.' },
  'Follow Reddit site-wide rules': { textEs: 'Seguí las reglas generales de Reddit', aiExplanation: 'Las reglas de Reddit aplican en todos lados: no menores, no contenido no consensuado, nada ilegal.' },
  'Be respectful': { textEs: 'Sé respetuoso con todos los miembros', aiExplanation: 'No se permite acoso, insultos ni ataques personales. Tratá a todos con respeto.' },
  'No doxxing or personal info': { textEs: 'No compartas información personal', aiExplanation: 'Nunca compartas nombres reales, ubicaciones o datos personales de nadie sin su permiso.' },
  'Content must feature feet': { textEs: 'El contenido debe mostrar pies', aiExplanation: 'Los pies tienen que ser el foco principal del post. Si no se ven claramente, te lo van a borrar.' },
  'Self-promo in comments only': { textEs: 'Autopromoción solo en comentarios', aiExplanation: 'Podés compartir tu OnlyFans SOLO en los comentarios de tus propios posts. Nada de links en títulos.' },
  'Post limit: 1 per 24 hours': { textEs: 'Límite de posts: 1 cada 24 horas', aiExplanation: 'Solo podés postear una vez por día. Borrar y repostear para saltarte el límite te puede costar un ban.' },
  'Required flair': { textEs: 'Flair obligatorio', aiExplanation: 'Todos los posts deben tener un flair (etiqueta). Si no lo ponés, te borran el post.' },
  'No low-effort content': { textEs: 'No se permite contenido de baja calidad', aiExplanation: 'Las fotos tienen que estar bien tomadas, con buena luz. Las fotos borrosas o mal iluminadas las van a borrar.' },
  'No free content - tribute required': { textEs: 'No hay contenido gratis — se requiere tributo', aiExplanation: 'Este es un sub de dominación financiera. Todo tiene que involucrar tributo o pago.' },
  'Self-promo allowed with flair': { textEs: 'Autopromoción permitida con flair', aiExplanation: 'Podés promocionar tu OnlyFans, pero TENÉS que usar el flair [Promo]. Sin flair, te borran el post.' },
  'Title format required': { textEs: 'Formato de título obligatorio', aiExplanation: 'Los títulos necesitan tags como [F4M], [F4F], [F4A]. Sin tag, el post se borra automáticamente.' },
  'Post limit: 2 per day': { textEs: 'Límite de posts: 2 por día', aiExplanation: 'Podés postear hasta 2 veces por día. Borra los posts viejos antes de subir nuevos.' },
  'No scamming': { textEs: 'Prohibido estafar', aiExplanation: 'No prometas contenido que no vas a entregar. Las estafas se pagan con ban permanente.' },
  'No doxxing subs': { textEs: 'Prohibido compartir info de seguidores', aiExplanation: 'Nunca compartas información personal o financiera de tus seguidores. Ban inmediato.' },
  'Self-promo weekends only': { textEs: 'Autopromoción solo los fines de semana', aiExplanation: 'Solo podés poner links de OnlyFans los sábados y domingos. Entre semana, te borran el post.' },
  'No findom without flair': { textEs: 'No findom sin flair', aiExplanation: 'Si tu contenido es de dominación financiera, tiene que llevar el flair [Findom].' },
  'Post limit: 3 per day': { textEs: 'Límite de posts: 3 por día', aiExplanation: 'Hasta 3 posts por día. Calidad antes que cantidad.' },
  'Consent is paramount': { textEs: 'El consentimiento es obligatorio', aiExplanation: 'Todo el contenido debe ser consensuado. Cualquier cosa que sugiera lo contrario se borra y se reporta.' },
  'Must be actual cosplay': { textEs: 'Tiene que ser cosplay real', aiExplanation: 'El personaje tiene que ser reconocible. Ponerse orejitas de gato no es cosplay.' },
  'Required tags in title': { textEs: 'Tags obligatorios en el título', aiExplanation: 'Incluí [OC] para contenido original. Formato: [Nombre del Cosplay] - Nombre del Personaje.' },
  'Post limit: 1 per 12 hours': { textEs: 'Límite de posts: 1 cada 12 horas', aiExplanation: 'Un post cada 12 horas para mantener el feed variado.' },
  'No unauthorized reposts': { textEs: 'No reposts sin permiso', aiExplanation: 'No publiques contenido de otros sin permiso. Si lo encontraste online, dale crédito.' },
  'No NSFW content': { textEs: 'No se permite contenido NSFW', aiExplanation: 'Este sub es SFW. Para contenido adulto, andá a la versión NSFW del sub.' },
  'No self-promotion spam': { textEs: 'No spamees autopromoción', aiExplanation: 'Podés compartir tu contenido, pero máximo 1 post autopromo por semana.' },
  'Credit the artist': { textEs: 'Dale crédito al artista', aiExplanation: 'Si compartís contenido de otro, poné su nombre y link.' },
  'Consent is mandatory': { textEs: 'El consentimiento es obligatorio', aiExplanation: 'Todo el contenido debe ser consensuado. Lo contrario resulta en ban.' },
  'No extreme content without warning': { textEs: 'Contenido extremo requiere advertencia', aiExplanation: 'Contenido de bondage extremo, asfixia o sangre necesita flair [Extreme] y NSFW.' },
  'Post limit: 1 per day': { textEs: 'Límite de posts: 1 por día', aiExplanation: 'Un solo post por día.' },
  'Must feature latex': { textEs: 'Tiene que mostrar latex', aiExplanation: 'Todo el contenido debe mostrar latex o goma real. PVC y spandex no cuentan.' },
  'Self-promo with verification': { textEs: 'Autopromoción con verificación', aiExplanation: 'Los links de OnlyFans son solo para creadores verificados. Verificate primero.' },
  'Tag your content': { textEs: 'Etiquetá tu contenido', aiExplanation: 'Usá flairs: [F], [M], [Couple], [OC], [Non-OC]. Todos los posts necesitan flair.' },
  'Must feature lingerie': { textEs: 'Tiene que mostrar lencería', aiExplanation: 'El contenido debe mostrar lencería, medias o ropa interior. Otra cosa se borra.' },
  'Must feature smoking': { textEs: 'Tiene que mostrar fumar', aiExplanation: 'Todo el contenido debe mostrar a alguien fumando. Contenido no relacionado se borra.' },
  'Body-positive community': { textEs: 'Comunidad body-positive', aiExplanation: 'No se permite body shaming. Todos los cuerpos son bienvenidos. Comentarios negativos = ban.' },
  'Must feature alt/tattoo/goth aesthetic': { textEs: 'Tiene que tener estética alt/tattoo/goth', aiExplanation: 'El contenido debe mostrar estilo alternativo: tatuajes, piercings, maquillaje gótico, etc.' },
  'Must include OnlyFans link': { textEs: 'Tiene que incluir link de OnlyFans', aiExplanation: 'Todos los posts deben incluir tu link de OnlyFans. Sin link, se borra.' },
  'No misleading titles': { textEs: 'No títulos engañosos', aiExplanation: 'Las imágenes de preview y el título tienen que representar tu contenido real. Nada de bait-and-switch.' },
  'No hate or discrimination': { textEs: 'No odio ni discriminación', aiExplanation: 'Todos los creadores son bienvenidos sin importar género, tamaño, raza u orientación.' },
  'Self-promo rules vary': { textEs: 'Las reglas de autopromoción varían', aiExplanation: 'Preguntale a los moderadores sobre las reglas de promoción. Algunos permiten en comentarios, otros no.' },
  'Post limit: check with mods': { textEs: 'Límite de posts: consultá con los mods', aiExplanation: 'La mayoría de los subreddits limitan a 1-2 posts por día. Verificá antes de postear.' },
  'Use appropriate flairs': { textEs: 'Usá los flairs apropiados', aiExplanation: 'Todos los posts deben usar el flair correcto. Si no estás seguro, mirá posts existentes o preguntá.' },
  'Self-promo with flair only': { textEs: 'Autopromoción solo con flair', aiExplanation: 'Los links de OnlyFans están permitidos pero solo con el flair [Promo].' },
  'Consent of all parties': { textEs: 'Consentimiento de todas las partes', aiExplanation: 'Todas las personas en el contenido deben consentir. No publiques sin permiso de todos los involucrados.' },
  'Safety tips encouraged': { textEs: 'Se anima a incluir tips de seguridad', aiExplanation: 'Cuando publiques contenido de shibari o suspensión, incluís advertencias y tips de seguridad.' },
  'No non-feet content': { textEs: 'No contenido que no sea de pies', aiExplanation: 'Los pies tienen que ser el foco principal. Fotos de cuerpo entero solo si los pies son claramente visibles.' },
  'Must be roleplay content': { textEs: 'Tiene que ser contenido de roleplay', aiExplanation: 'El contenido debe involucrar escenarios de roleplay o elementos de actuación.' },
  'Content must feature Latinas': { textEs: 'El contenido debe mostrar Latinas', aiExplanation: 'Este es un espacio para la comunidad Latina. El contenido tiene que ser de personas que se identifican como Latinas.' },
  'Spanish or bilingual content welcome': { textEs: 'Contenido en español o bilingüe bienvenido', aiExplanation: 'Podés postear en español o bilingüe. Es un espacio para la comunidad hispana.' },
};

export function generateFallbackRules(subredditName: string): FallbackResult {
  const name = subredditName.toLowerCase();
  
  // Detect niche from name
  let detectedNiche = 'general';
  for (const [niche, keywords] of Object.entries(NICHE_KEYWORDS)) {
    if (keywords.some(k => name.includes(k))) {
      detectedNiche = niche;
      break;
    }
  }

  const isNSFW = !['cosplay', 'asmr'].some(safe => name.includes(safe)) || name.includes('nsfw');

  // Combine niche-specific + base rules
  const nicheRules = NICHE_RULES[detectedNiche] || NICHE_RULES.general;
  const allRules = [...nicheRules, ...BASE_RULES];

  return {
    rules: allRules,
    niche: detectedNiche,
    isNSFW,
    allowPromo: detectedNiche === 'onlyfans' ? true : detectedNiche === 'asmr' ? false : null,
    requiresVerify: null, // Don't assume verification is required
    summaryEs: (NICHE_SUMMARIES[detectedNiche] || NICHE_SUMMARIES.general) + ' Estas reglas son estimadas — verificá las oficiales en Reddit.',
  };
}

export function getRuleTranslation(ruleName: string): { textEs: string; aiExplanation: string } {
  return RULE_TRANSLATIONS[ruleName] || { 
    textEs: ruleName, 
    aiExplanation: 'Regla estándar de la comunidad. Verificá los detalles directamente en Reddit.' 
  };
}
