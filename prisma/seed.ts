import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Subreddit definitions with pre-translated rules ──────────────────────────

interface SeedRule {
  ruleName: string;
  ruleTextOriginal: string;
  ruleTextEs: string;
  isKeyRule: boolean;
  keyRuleType: string;
  aiExplanation: string;
}

interface SeedSubreddit {
  name: string;
  displayName: string;
  description: string;
  subscribers: number;
  over18: boolean;
  allowPromo: boolean | null;
  requiresVerify: boolean | null;
  postLimit: string | null;
  promoDays: string | null;
  summaryEs: string;
  rules: SeedRule[];
}

// Common base rules for NSFW subreddits
const BASE_NSFW_RULES: SeedRule[] = [
  { ruleName: 'Follow Reddit site-wide rules', ruleTextOriginal: 'All posts must comply with Reddit content policy. No minors, no non-consensual content.', ruleTextEs: 'Seguí las reglas generales de Reddit. No menores, no contenido no consensuado, nada ilegal.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Las reglas de Reddit aplican siempre. Violarlas significa ban permanente.' },
  { ruleName: 'No doxxing or personal info', ruleTextOriginal: 'Do not share anyone personal information, real name, location without consent.', ruleTextEs: 'No compartas información personal de nadie: nombre real, ubicación o datos sin consentimiento.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Compartir info personal de otros = ban inmediato. Protegé tu propia info también.' },
  { ruleName: 'Be respectful', ruleTextOriginal: 'No harassment, hate speech, bullying, or personal attacks.', ruleTextEs: 'Sé respetuoso. No se permite acoso, insultos ni ataques personales.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Tratá a todos con respeto. Comentarios ofensivos te pueden costar un ban.' },
  { ruleName: 'No spam or bot behavior', ruleTextOriginal: 'No automated posting, spam, or repeated identical content.', ruleTextEs: 'No spamees ni uses bots. No publiques contenido repetido idéntico.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Postear el mismo contenido varias veces o usar bots = ban. Posteá contenido original y variado.' },
];

const SUBREDDITS: SeedSubreddit[] = [
  // ═══ FEET ═══
  {
    name: 'feet', displayName: 'Feet 👣', description: 'A community for foot lovers. Share your favorite content!', subscribers: 1250000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '1 per 24h', promoDays: null,
    summaryEs: 'La comunidad de pies más grande de Reddit. Autopromoción solo en comentarios. Verificación obligatoria para contenido original. Ideal para creadores de OnlyFans con contenido de pies.',
    rules: [
      { ruleName: 'No self-promotion in titles', ruleTextOriginal: 'Do not include OnlyFans links or promotional text in post titles.', ruleTextEs: 'No incluyas links de OnlyFans ni texto promocional en los títulos de los posts.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Los links de OnlyFans van SOLO en comentarios. Si ponés un link en el título, te borran el post.' },
      { ruleName: 'OC Verification Required', ruleTextOriginal: 'All original content posters must be verified. Send modmail with verification photos.', ruleTextEs: 'Verificación obligatoria para contenido original. Enviá un modmail con fotos de verificación.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Tenés que verificar tu identidad con los mods antes de postear contenido propio. Te piden una foto con tu usuario y la fecha.' },
      { ruleName: 'Self-promo in comments only', ruleTextOriginal: 'OnlyFans links ONLY in comments of your own posts.', ruleTextEs: 'Links de OnlyFans SOLO en comentarios de tus propios posts.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Podés compartir tu OnlyFans, pero solo en los comentarios de posts que vos creaste.' },
      { ruleName: 'Post limit: 1 per 24 hours', ruleTextOriginal: 'Maximum 1 post per 24-hour period.', ruleTextEs: 'Límite de posts: 1 cada 24 horas.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Solo podés postear una vez por día. Borrar y repostear para saltearte el límite te puede costar un ban.' },
      { ruleName: 'Minimum account age: 7 days', ruleTextOriginal: 'Account must be at least 7 days old to post.', ruleTextEs: 'Edad mínima de la cuenta: 7 días para poder postear.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Tu cuenta de Reddit tiene que tener al menos una semana. Si es nueva, vas a tener que esperar.' },
      { ruleName: 'No low-effort content', ruleTextOriginal: 'Photos must be well-lit and show effort in composition.', ruleTextEs: 'No se permite contenido de baja calidad. Las fotos deben estar bien iluminadas.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Las fotos borrosas, oscuras o descuidadas las borran. Poné esfuerzo en la iluminación.' },
      { ruleName: 'Required flair', ruleTextOriginal: 'All posts must have appropriate flair.', ruleTextEs: 'Flair obligatorio en todos los posts.', isKeyRule: true, keyRuleType: 'flair', aiExplanation: 'Todos los posts necesitan un flair (etiqueta). Si no lo ponés, te borran el post.' },
      { ruleName: 'Content must feature feet', ruleTextOriginal: 'All posts must prominently feature feet/soles/toes.', ruleTextEs: 'El contenido debe mostrar pies como foco principal.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Los pies tienen que ser el foco del post. Si no se ven claramente, te lo van a borrar.' },
      { ruleName: 'No selling outside designated threads', ruleTextOriginal: 'Sales and transactions only in weekly selling threads.', ruleTextEs: 'Ventas y transacciones solo en los threads semanales de ventas.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Si querés vender algo, hacelo solo en los threads designados para eso.' },
      { ruleName: 'No minors or minor-adjacent content', ruleTextOriginal: 'Absolutely no content involving or depicting minors.', ruleTextEs: 'Prohibido cualquier contenido que involucre o represente menores de edad.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Contenido con menores = ban permanente y posible reporte. Sin excepciones.' },
    ],
  },
  {
    name: 'FootFetish', displayName: 'Foot Fetish', description: 'The original foot fetish community on Reddit.', subscribers: 890000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '1 per 24h', promoDays: null,
    summaryEs: 'Comunidad clásica de fetichismo de pies. Verificación requerida para OC. Autopromoción restringida a comentarios. Comunidad activa con mucha demanda de contenido.',
    rules: [
      { ruleName: 'No promotion in titles or post bodies', ruleTextOriginal: 'Keep all promotional content in comments only.', ruleTextEs: 'Sin promoción en títulos ni en el cuerpo del post. Solo en comentarios.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Los links de OnlyFans van exclusivamente en comentarios. Nada de autopromoción en el post.' },
      { ruleName: 'Verification required for OC', ruleTextOriginal: 'Original content posters must verify with the mod team.', ruleTextEs: 'Verificación obligatoria para quienes posteen contenido original.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate con los mods antes de postear contenido propio. Te piden una foto con usuario y fecha.' },
      { ruleName: 'Post limit: 1 per day', ruleTextOriginal: 'Maximum one post per 24 hours.', ruleTextEs: 'Límite: 1 post por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un solo post cada 24 horas. Si borrás y reposteás, te pueden banear.' },
      { ruleName: 'Feet must be the main focus', ruleTextOriginal: 'Posts must feature feet as the primary subject.', ruleTextEs: 'Los pies deben ser el tema principal del post.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Si los pies no son el foco, te lo borran. Evitá fotos donde los pies se vean poco.' },
      { ruleName: 'Required flair tag', ruleTextOriginal: 'All posts require a flair tag.', ruleTextEs: 'Todos los posts necesitan flair.', isKeyRule: true, keyRuleType: 'flair', aiExplanation: 'Elegí el flair correcto para tu post. Sin flair, se borra automáticamente.' },
      { ruleName: 'No low quality images', ruleTextOriginal: 'Images must be clear and well-composed.', ruleTextEs: 'Imágenes deben ser claras y bien compuestas. Nada de fotos borrosas.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Poné esfuerzo en la calidad. Fotos oscuras o borrosas se eliminan.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'feetpics', displayName: 'Feet Pics', description: 'Quality feet pictures. Original content encouraged!', subscribers: 345000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '2 per day', promoDays: null,
    summaryEs: 'Comunidad dedicada a fotos de pies de calidad. Se prioriza contenido original. Autopromoción permitida en comentarios con verificación previa.',
    rules: [
      { ruleName: 'Quality photos only', ruleTextOriginal: 'Photos must be high quality and well-lit.', ruleTextEs: 'Solo fotos de calidad. Deben estar bien iluminadas y nítidas.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Las fotos de baja calidad se eliminan. Invertí en buena iluminación.' },
      { ruleName: 'Self-promo in comments only', ruleTextOriginal: 'OnlyFans and social media links in comments of your own posts.', ruleTextEs: 'Autopromoción solo en comentarios de tus posts.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Links de OnlyFaces van solo en comentarios, nunca en títulos.' },
      { ruleName: 'OC Verification Required', ruleTextOriginal: 'Verify with mods before posting original content.', ruleTextEs: 'Verificate con los mods antes de postear contenido original.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Mandá modmail con foto de verificación (usuario + fecha) para postear OC.' },
      { ruleName: 'Post limit: 2 per day', ruleTextOriginal: 'Maximum 2 posts per 24 hours.', ruleTextEs: 'Límite: 2 posts por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Hasta 2 posts diarios. Más que eso se considera spam.' },
      { ruleName: 'Use appropriate flair', ruleTextOriginal: 'Flair your posts correctly.', ruleTextEs: 'Usá el flair apropiado para tu post.', isKeyRule: true, keyRuleType: 'flair', aiExplanation: 'Cada post necesita flair. Elegí el que mejor describe tu contenido.' },
      { ruleName: 'No feet close-ups only', ruleTextOriginal: 'At least partial foot visible, not just extreme close-ups.', ruleTextEs: 'Al menos una parte del pie visible, no solo close-ups extremos.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Mostrá más que solo un dedo de cerca. El pie debe ser visible.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'FeetInYourFace', displayName: 'Feet In Your Face', description: 'Close-up feet content. POV and sole shots.', subscribers: 234000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '1 per 24h', promoDays: null,
    summaryEs: 'Comunidad de pies en primer plano, POV y plantas. Nicho específico con demanda alta. Autopromoción en comentarios solamente.',
    rules: [
      { ruleName: 'Must be POV/close-up feet content', ruleTextOriginal: 'Content must feature feet in close-up or POV angle.', ruleTextEs: 'El contenido debe mostrar pies en primer plano o ángulo POV.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Este sub es específico para close-ups y POV. Otros ángulos van en r/feet.' },
      { ruleName: 'Self-promo in comments only', ruleTextOriginal: 'OnlyFans links only in comments.', ruleTextEs: 'Links de OnlyFans solo en comentarios.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Autopromoción exclusivamente en comentarios de tus posts.' },
      { ruleName: 'Post limit: 1 per 24 hours', ruleTextOriginal: 'One post per day maximum.', ruleTextEs: 'Límite: 1 post cada 24 horas.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un post por día, sin excepciones.' },
      { ruleName: 'Verification for OC', ruleTextOriginal: 'OC posters must be verified.', ruleTextEs: 'Creadores de OC deben verificarse.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate antes de postear contenido propio.' },
      { ruleName: 'Required flair', ruleTextOriginal: 'Use correct flair for your content.', ruleTextEs: 'Usá el flair correcto.', isKeyRule: true, keyRuleType: 'flair', aiExplanation: 'Flair obligatorio. Sin flair = post eliminado.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'cutefeet', displayName: 'Cute Feet', description: 'Adorable feet content. Clean and aesthetic.', subscribers: 156000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: null,
    summaryEs: 'Comunidad de pies con estética linda y cuidada. Contenido limpio y bien presentado. Buen lugar para creadores que hacen fotos estéticas de pies.',
    rules: [
      { ruleName: 'Aesthetic/cute content only', ruleTextOriginal: 'Content should have a cute or aesthetic vibe.', ruleTextEs: 'El contenido debe tener una estética linda o cuidada.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Este sub prioriza lo estético. Fotos cuidadas y bien compuestas.' },
      { ruleName: 'Self-promo in comments only', ruleTextOriginal: 'Promotional links only in comments.', ruleTextEs: 'Links promocionales solo en comentarios.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Solo comentarios para autopromoción.' },
      { ruleName: 'Post limit: 1 per day', ruleTextOriginal: 'Maximum 1 post per 24 hours.', ruleTextEs: 'Límite: 1 post por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un solo post diario.' },
      { ruleName: 'No hardcore content', ruleTextOriginal: 'Keep it soft and aesthetic. No explicit content.', ruleTextEs: 'Contenido suave y estético. Nada explícito.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Este sub es más soft. Para contenido explícito, buscate otro sub.' },
      { ruleName: 'Verification required', ruleTextOriginal: 'OC posters must verify.', ruleTextEs: 'Verificación obligatoria para OC.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate antes de postear contenido propio.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'soles', displayName: 'Soles', description: 'Dedicated to soles. Top and bottom views.', subscribers: 267000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '2 per day', promoDays: null,
    summaryEs: 'Comunidad dedicada exclusivamente a plantas de pies. Contenido específico de soles. Buen nicho para creadoras especializadas.',
    rules: [
      { ruleName: 'Must show soles', ruleTextOriginal: 'Content must prominently feature the soles of feet.', ruleTextEs: 'El contenido debe mostrar las plantas de los pies como foco principal.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Si no se ven las plantas claramente, el post se borra.' },
      { ruleName: 'Self-promo in comments only', ruleTextOriginal: 'OnlyFans links in comments.', ruleTextEs: 'Autopromoción solo en comentarios.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Links de OF van solo en comentarios.' },
      { ruleName: 'Post limit: 2 per day', ruleTextOriginal: 'Maximum 2 posts per day.', ruleTextEs: 'Límite: 2 posts por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Hasta 2 posts diarios.' },
      { ruleName: 'Verification for OC', ruleTextOriginal: 'Verify before posting original content.', ruleTextEs: 'Verificate antes de postear OC.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate con los mods para postear contenido propio.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'FeetToes', displayName: 'Feet & Toes', description: 'Focus on toes and soles. High quality content.', subscribers: 198000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: null,
    summaryEs: 'Comunidad enfocada en dedos y plantas de pies. Contenido de alta calidad. Buen lugar para creadoras con pedicures llamativas.',
    rules: [
      { ruleName: 'Focus on toes and soles', ruleTextOriginal: 'Posts should feature toes and/or soles prominently.', ruleTextEs: 'Los posts deben mostrar dedos y/o plantas de pies prominentemente.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'El foco son los dedos y las plantas. Contenido general de pies va en r/feet.' },
      { ruleName: 'Self-promo in comments only', ruleTextOriginal: 'OnlyFans links only in comments of your own posts.', ruleTextEs: 'Autopromoción solo en comentarios.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Solo comentarios para tu OnlyFans.' },
      { ruleName: 'Post limit: 1 per day', ruleTextOriginal: 'One post per 24 hours.', ruleTextEs: '1 post por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un solo post cada 24 horas.' },
      { ruleName: 'Verification required', ruleTextOriginal: 'OC posters must be verified.', ruleTextEs: 'Verificación obligatoria para OC.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate primero para postear contenido propio.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'paintedtoes', displayName: 'Painted Toes', description: 'Toenail polish and painted toes appreciation.', subscribers: 89000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '2 per day', promoDays: null,
    summaryEs: 'Comunidad de uñas pintadas y esmaltes en los pies. Nicho específico con seguidores dedicados. Ideal si hacés contenido de pedicures.',
    rules: [
      { ruleName: 'Must show painted/polished toes', ruleTextOriginal: 'Content must feature toenail polish or painted nails.', ruleTextEs: 'El contenido debe mostrar uñas de los pies pintadas o con esmalte.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Sin esmalte en las uñas = post eliminado. El foco es el nail art en pies.' },
      { ruleName: 'Self-promo in comments only', ruleTextOriginal: 'OnlyFans links in comments only.', ruleTextEs: 'Links de OF solo en comentarios.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Promoción exclusivamente en comentarios.' },
      { ruleName: 'Post limit: 2 per day', ruleTextOriginal: 'Maximum 2 posts per day.', ruleTextEs: 'Límite: 2 posts diarios.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Hasta 2 posts por día.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'footworship', displayName: 'Foot Worship', description: 'Foot worship and domination content. Femdom focused.', subscribers: 178000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: 'weekends',
    summaryEs: 'Comunidad de adoración y dominación de pies. Autopromoción solo fines de semana. Cruza feet con femdom. Excelente para creadoras dominantes.',
    rules: [
      { ruleName: 'Self-promo weekends only', ruleTextOriginal: 'OnlyFans and social media links ONLY allowed on Saturdays and Sundays.', ruleTextEs: 'Autopromoción solo los fines de semana (sábados y domingos).', isKeyRule: true, keyRuleType: 'restricted_days', aiExplanation: 'Solo podés poner links de OnlyFans sábados y domingos. Entre semana, te borran el post.' },
      { ruleName: 'Must be worship/domination content', ruleTextOriginal: 'Content must involve foot worship or domination elements.', ruleTextEs: 'El contenido debe involucrar adoración o dominación de pies.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Pies solos sin contexto de worship van en r/feet. Acá tiene que haber elemento de dominación.' },
      { ruleName: 'Post limit: 1 per day', ruleTextOriginal: 'One post per 24 hours.', ruleTextEs: '1 post cada 24 horas.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un post por día, sin excepciones.' },
      { ruleName: 'Consent required in all content', ruleTextOriginal: 'All content must depict consensual activities.', ruleTextEs: 'Todo el contenido debe ser consensuado.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'El consentimiento es innegociable. Contenido no consensuado = ban.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'GirlFeet', displayName: 'Girl Feet', description: 'Female feet appreciation. OC and verified creators welcome.', subscribers: 312000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '1 per 24h', promoDays: null,
    summaryEs: 'Comunidad de pies femeninos. Contenido original bienvenido con verificación. Autopromoción en comentarios. Buena visibilidad para creadoras.',
    rules: [
      { ruleName: 'Female feet only', ruleTextOriginal: 'Content must feature female feet.', ruleTextEs: 'Solo pies femeninos.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Contenido masculino se elimina. Este sub es exclusivo de pies de mujeres.' },
      { ruleName: 'Self-promo in comments only', ruleTextOriginal: 'OnlyFans links in comments of your own posts.', ruleTextEs: 'Autopromoción solo en comentarios.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Links de OF solo en comentarios de tus posts.' },
      { ruleName: 'OC Verification Required', ruleTextOriginal: 'Original content posters must be verified.', ruleTextEs: 'Verificación obligatoria para OC.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate con los mods antes de postear contenido propio.' },
      { ruleName: 'Post limit: 1 per 24 hours', ruleTextOriginal: 'One post per day.', ruleTextEs: '1 post por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un solo post cada 24 horas.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'FeetOnlyFans', displayName: 'Feet OnlyFans', description: 'Promote your OnlyFans feet content here. Self-promo allowed.', subscribers: 67000, over18: true, allowPromo: true, requiresVerify: true, postLimit: '1 per day', promoDays: null,
    summaryEs: 'Subreddit donde la autopromoción de OnlyFans de pies está permitida. Verificación obligatoria. Ideal para conseguir suscriptores de contenido de pies.',
    rules: [
      { ruleName: 'Must feature feet content', ruleTextOriginal: 'All posts must feature feet/soles/toes content.', ruleTextEs: 'Todos los posts deben mostrar contenido de pies.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Si no hay pies, se borra. Este es un sub de pies + OnlyFans.' },
      { ruleName: 'Must include OnlyFans link', ruleTextOriginal: 'All posts must include your OnlyFans link.', ruleTextEs: 'Todos los posts deben incluir tu link de OnlyFans.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Sin link de OF, el post se borra. Este sub ES para promocionar.' },
      { ruleName: 'Verification required', ruleTextOriginal: 'You must be verified before posting.', ruleTextEs: 'Verificación obligatoria antes de postear.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate primero. Es para evitar estafas y contenido robado.' },
      { ruleName: 'Post limit: 1 per day', ruleTextOriginal: 'One promo post per day.', ruleTextEs: '1 post promo por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un solo post de promo cada 24 horas.' },
      { ruleName: 'No misleading previews', ruleTextOriginal: 'Preview images must represent your actual content.', ruleTextEs: 'Las imágenes de preview deben representar tu contenido real.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'No hagas clickbait. Las fotos tienen que coincidir con lo que ofrecés.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'ShoeDangling', displayName: 'Shoe Dangling', description: 'Shoe dangling, dipping and play. Heels and flats.', subscribers: 28000, over18: true, allowPromo: null, requiresVerify: false, postLimit: '2 per day', promoDays: null,
    summaryEs: 'Comunidad de shoe dangling (balancear zapatos). Nicho súper específico con fans dedicados. Poca competencia, buena oportunidad.',
    rules: [
      { ruleName: 'Must feature shoe dangling', ruleTextOriginal: 'Content must show shoe dangling, dipping, or shoe play.', ruleTextEs: 'El contenido debe mostrar shoe dangling, dipping o juego con zapatos.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Sin dangling = post eliminado. El foco es el juego con zapatos.' },
      { ruleName: 'Self-promo in comments only', ruleTextOriginal: 'OnlyFans links in comments.', ruleTextEs: 'Autopromoción solo en comentarios.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Links de OF solo en comentarios.' },
      { ruleName: 'Post limit: 2 per day', ruleTextOriginal: 'Maximum 2 posts per day.', ruleTextEs: 'Límite: 2 posts diarios.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Hasta 2 posts por día.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'FeetJOI', displayName: 'Feet JOI', description: 'Foot-focused jerk off instructions. Dominant feet.', subscribers: 56000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: 'weekends',
    summaryEs: 'Comunidad de instrucciones sexuales (JOI) enfocadas en pies. Cruza feet + femdom. Autopromoción solo fines de semana. Excelente para creadoras dominantes.',
    rules: [
      { ruleName: 'Must be JOI/instruction content', ruleTextOriginal: 'Content must involve jerk off instructions with feet focus.', ruleTextEs: 'El contenido debe ser de instrucciones sexuales (JOI) con foco en pies.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'JOI + pies = lo que se busca acá. Pies sin instrucciones van en r/feet.' },
      { ruleName: 'Self-promo weekends only', ruleTextOriginal: 'OnlyFans links only on weekends.', ruleTextEs: 'Autopromoción solo fines de semana.', isKeyRule: true, keyRuleType: 'restricted_days', aiExplanation: 'Links de OF solo sábados y domingos.' },
      { ruleName: 'Post limit: 1 per day', ruleTextOriginal: 'One post per day.', ruleTextEs: '1 post por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un post cada 24 horas.' },
      { ruleName: 'Verification required for OC', ruleTextOriginal: 'OC posters must verify.', ruleTextEs: 'Verificación para OC.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate para postear contenido propio.' },
      ...BASE_NSFW_RULES,
    ],
  },

  // ═══ FINDOM ═══
  {
    name: 'findom', displayName: 'Financial Domination 💰', description: 'The original findom community. Pay pigs and cash cows welcome.', subscribers: 456000, over18: true, allowPromo: true, requiresVerify: true, postLimit: '2 per day', promoDays: null,
    summaryEs: 'La comunidad original de dominación financiera. Autopromoción permitida con flair. Verificación obligatoria para Dommes. Formato de título obligatorio con tags [F4M] etc.',
    rules: [
      { ruleName: 'No free content - tribute required', ruleTextOriginal: 'All content must involve tribute or payment.', ruleTextEs: 'No hay contenido gratis — se requiere tributo.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Este es un sub de findom. Si no hay tributo o pago, el contenido se borra.' },
      { ruleName: 'Verification required for Dommes', ruleTextOriginal: 'All dominants must be verified before posting.', ruleTextEs: 'Verificación obligatoria para Dommes antes de postear.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Si sos Domme, tenés que verificarte. Es para evitar catfishing.' },
      { ruleName: 'Self-promo allowed with flair', ruleTextOriginal: 'OnlyFans promotion allowed with [Promo] flair.', ruleTextEs: 'Autopromoción permitida con flair [Promo].', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Podés poner tu link de OnlyFans, pero TENÉS que usar el flair [Promo].' },
      { ruleName: 'Title format required', ruleTextOriginal: 'Titles must include [F4M], [F4F], [F4A] tags.', ruleTextEs: 'Formato de título obligatorio con tags [F4M], [F4F], [F4A].', isKeyRule: true, keyRuleType: 'title_format', aiExplanation: 'Los títulos necesitan tags de audiencia. Sin tag, se borra.' },
      { ruleName: 'No doxxing subs', ruleTextOriginal: 'Never share personal information publicly.', ruleTextEs: 'Prohibido compartir info personal de los seguidores.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Nunca compartas info personal de tus subs. Ban inmediato.' },
      { ruleName: 'No scamming', ruleTextOriginal: 'Do not promise content and fail to deliver.', ruleTextEs: 'Prohibido estafar.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Las estafas se pagan con ban permanente.' },
      { ruleName: 'Post limit: 2 per day', ruleTextOriginal: 'Maximum 2 posts per 24 hours.', ruleTextEs: 'Límite: 2 posts por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Hasta 2 posts diarios.' },
      { ruleName: 'No catfishing', ruleTextOriginal: 'Use your real photos. Stolen content = permanent ban.', ruleTextEs: 'Prohibido catfishing. Usá tus fotos reales.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Fotos ajenas = ban permanente. Verificate para demostrar que sos real.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'FinDomBrat', displayName: 'Findom Brat', description: 'Bratty findom content. You know you want to pay.', subscribers: 123000, over18: true, allowPromo: true, requiresVerify: true, postLimit: '2 per day', promoDays: null,
    summaryEs: 'Comunidad de findom con vibe bratty. Autopromoción permitida. Verificación requerida. Estilo más juguetón que el findom clásico.',
    rules: [
      { ruleName: 'Tribute required for content', ruleTextOriginal: 'All content must involve tribute or payment.', ruleTextEs: 'Se requiere tributo para todo el contenido.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Sin tributo no hay contenido. Es findom, no freebies.' },
      { ruleName: 'Verification for Dommes', ruleTextOriginal: 'All dommes must be verified.', ruleTextEs: 'Dommes deben verificarse.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate antes de postear.' },
      { ruleName: 'Self-promo with flair', ruleTextOriginal: 'Promo allowed with correct flair.', ruleTextEs: 'Autopromoción con flair requerido.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Usá flair [Promo] para tus links de OF.' },
      { ruleName: 'Title format: [F4M] etc.', ruleTextOriginal: 'Include audience tags in title.', ruleTextEs: 'Incluí tags de audiencia en el título.', isKeyRule: true, keyRuleType: 'title_format', aiExplanation: 'Formato obligatorio: [F4M], [F4F], [F4A].' },
      { ruleName: 'Post limit: 2 per day', ruleTextOriginal: 'Maximum 2 posts per day.', ruleTextEs: 'Límite: 2 posts diarios.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Hasta 2 posts por día.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'paypigs', displayName: 'Pay Pigs', description: 'Financial submission and domination. Tribute required.', subscribers: 89000, over18: true, allowPromo: true, requiresVerify: true, postLimit: '1 per day', promoDays: null,
    summaryEs: 'Comunidad de sumisos financieros. Tributo obligatorio. Verificación para Dommes. Más enfocada en la sumisión financiera pura.',
    rules: [
      { ruleName: 'Tribute required', ruleTextOriginal: 'All interactions require tribute.', ruleTextEs: 'Todas las interacciones requieren tributo.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Acá no hay nada gratis. Todo requiere tributo.' },
      { ruleName: 'Verification mandatory', ruleTextOriginal: 'Dommes must verify before posting.', ruleTextEs: 'Verificación obligatoria para Dommes.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate para postear. Evitamos catfishing.' },
      { ruleName: 'Post limit: 1 per day', ruleTextOriginal: 'One post per 24 hours.', ruleTextEs: '1 post por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un solo post cada 24 horas.' },
      { ruleName: 'No sharing sub info', ruleTextOriginal: 'Never share info about financial submissives.', ruleTextEs: 'Prohibido compartir info de los sumisos financieros.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'La privacidad de los subs es sagrada. Ban inmediato si la violás.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'GoddessWorship', displayName: 'Goddess Worship', description: 'Worship and tribute your goddess. Findom and femdom combined.', subscribers: 134000, over18: true, allowPromo: true, requiresVerify: true, postLimit: '2 per day', promoDays: null,
    summaryEs: 'Comunidad de adoración a diosas. Combina findom con femdom. Verificación obligatoria. Ideal para creadoras con persona de dominación.',
    rules: [
      { ruleName: 'Must be goddess/worship content', ruleTextOriginal: 'Content must involve goddess worship or tribute elements.', ruleTextEs: 'El contenido debe involucrar adoración o tributo a una diosa.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'El foco es la adoración. Contenido genérico va en otros subs.' },
      { ruleName: 'Self-promo with flair', ruleTextOriginal: 'OnlyFans links with [Promo] flair.', ruleTextEs: 'Links de OF con flair [Promo].', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Autopromoción permitida con flair correcto.' },
      { ruleName: 'Verification for Dommes', ruleTextOriginal: 'Goddesses must verify.', ruleTextEs: 'Diosas deben verificarse.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate para demostrar que sos real.' },
      { ruleName: 'Post limit: 2 per day', ruleTextOriginal: 'Maximum 2 posts per day.', ruleTextEs: 'Límite: 2 posts diarios.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Hasta 2 posts por día.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'FindomFeet', displayName: 'Findom Feet', description: 'Where findom meets foot fetish. Pay to worship feet.', subscribers: 32000, over18: true, allowPromo: true, requiresVerify: true, postLimit: '1 per day', promoDays: null,
    summaryEs: 'Comunidad niche que cruza findom con fetichismo de pies. Pagá para adorar pies. Baja competencia, alta demanda. Joyita para creadoras.',
    rules: [
      { ruleName: 'Must combine feet + findom', ruleTextOriginal: 'Content must involve both foot fetish and financial domination.', ruleTextEs: 'El contenido debe combinar pies + dominación financiera.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Pies sin findom van en r/feet. Findom sin pies va en r/findom.' },
      { ruleName: 'Tribute required', ruleTextOriginal: 'All content involves tribute.', ruleTextEs: 'Se requiere tributo para todo.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Es findom: no hay contenido gratis.' },
      { ruleName: 'Self-promo with flair', ruleTextOriginal: 'Promo links with [Promo] flair.', ruleTextEs: 'Autopromoción con flair [Promo].', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Usá flair para tus links de OF.' },
      { ruleName: 'Post limit: 1 per day', ruleTextOriginal: 'One post per 24 hours.', ruleTextEs: '1 post por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un solo post cada 24 horas.' },
      ...BASE_NSFW_RULES,
    ],
  },

  // ═══ COSPLAY ═══
  {
    name: 'cosplay', displayName: 'Cosplay', description: 'The main cosplay community. All skill levels welcome.', subscribers: 2300000, over18: false, allowPromo: null, requiresVerify: false, postLimit: '1 per 12h', promoDays: null,
    summaryEs: 'La comunidad principal de cosplay en Reddit. SFW. Autopromoción de OnlyFans solo en comentarios. El contenido debe ser cosplay reconocible. Excelente visibilidad.',
    rules: [
      { ruleName: 'Must be actual cosplay', ruleTextOriginal: 'Content must feature recognizable cosplay of a specific character.', ruleTextEs: 'Tiene que ser cosplay real de un personaje reconocible.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Ponerse orejitas de gato no es cosplay. El personaje debe ser reconocible.' },
      { ruleName: 'Self-promo in comments only', ruleTextOriginal: 'OnlyFans and Patreon links ONLY in comments of your own posts.', ruleTextEs: 'Links de OnlyFans/Patreon SOLO en comentarios.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Links de OF van solo en comentarios, nunca en títulos ni en el post.' },
      { ruleName: 'Required tags in title', ruleTextOriginal: 'Include [OC] and character name in title.', ruleTextEs: 'Tags obligatorios: [OC] y nombre del personaje en el título.', isKeyRule: true, keyRuleType: 'title_format', aiExplanation: 'Poné [OC] si es tu contenido y el nombre del personaje.' },
      { ruleName: 'Post limit: 1 per 12 hours', ruleTextOriginal: 'Maximum 1 post every 12 hours.', ruleTextEs: 'Límite: 1 post cada 12 horas.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un post cada 12 horas para mantener el feed variado.' },
      { ruleName: 'No AI-generated cosplay', ruleTextOriginal: 'AI-generated images are not allowed.', ruleTextEs: 'No se permiten imágenes generadas por IA.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Solo contenido humano. Imágenes de IA se borran.' },
      { ruleName: 'Credit the cosplayer', ruleTextOriginal: 'If not OC, credit the original cosplayer.', ruleTextEs: 'Si no es OC, dale crédito al cosplayer original.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Si no es tu cosplay, mencioná quién lo hizo.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'nsfwcosplay', displayName: 'NSFW Cosplay', description: 'Adult cosplay content. Your favorite characters like never before.', subscribers: 567000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: null,
    summaryEs: 'Versión NSFW de cosplay. Contenido adulto con personajes. Verificación requerida para OC. Autopromoción en comentarios. Mercado grande.',
    rules: [
      { ruleName: 'Must be cosplay', ruleTextOriginal: 'Content must feature recognizable cosplay.', ruleTextEs: 'Debe ser cosplay reconocible.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Igual que el sub SFW, el personaje debe ser reconocible.' },
      { ruleName: 'Self-promo in comments only', ruleTextOriginal: 'OnlyFans links only in comments.', ruleTextEs: 'Autopromoción solo en comentarios.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Links de OF solo en comentarios de tus posts.' },
      { ruleName: 'Verification required for OC', ruleTextOriginal: 'OC posters must be verified.', ruleTextEs: 'Verificación obligatoria para OC.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate antes de postear contenido propio.' },
      { ruleName: 'Post limit: 1 per day', ruleTextOriginal: 'One post per 24 hours.', ruleTextEs: '1 post por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un post cada 24 horas.' },
      { ruleName: 'Required title format', ruleTextOriginal: 'Include character name and [OC] tag.', ruleTextEs: 'Incluí nombre del personaje y tag [OC].', isKeyRule: true, keyRuleType: 'title_format', aiExplanation: 'Formato: [OC] Nombre del Personaje - Serie/Juego.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'OnlyFansCosplay', displayName: 'OnlyFans Cosplay', description: 'Promote your cosplay OnlyFans content. Self-promo welcome!', subscribers: 78000, over18: true, allowPromo: true, requiresVerify: true, postLimit: '1 per day', promoDays: null,
    summaryEs: 'Subreddit donde la autopromoción de OnlyFans cosplay está permitida. Verificación obligatoria. Lugar ideal para promocionar contenido de cosplay + OF.',
    rules: [
      { ruleName: 'Must be cosplay content', ruleTextOriginal: 'All posts must feature cosplay.', ruleTextEs: 'Todos los posts deben mostrar cosplay.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Sin cosplay, el post se borra.' },
      { ruleName: 'Must include OnlyFans link', ruleTextOriginal: 'All posts must include your OnlyFans link.', ruleTextEs: 'Incluir link de OnlyFans en todos los posts.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Este sub es para promo de OF + cosplay. Sin link = post eliminado.' },
      { ruleName: 'Verification required', ruleTextOriginal: 'You must be verified before posting.', ruleTextEs: 'Verificación obligatoria antes de postear.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate para postear. Es para proteger a la comunidad.' },
      { ruleName: 'Post limit: 1 per day', ruleTextOriginal: 'One promo post per day.', ruleTextEs: '1 post de promo por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un solo post cada 24 horas.' },
      ...BASE_NSFW_RULES,
    ],
  },

  // ═══ FEMDOM ═══
  {
    name: 'femdom', displayName: 'Female Domination 👠', description: 'The main femdom community. Women in charge.', subscribers: 567000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '3 per day', promoDays: 'weekends',
    summaryEs: 'La comunidad principal de dominación femenina. Autopromoción solo fines de semana. Verificación requerida. Excelente para creadoras de contenido femdom.',
    rules: [
      { ruleName: 'Self-promo weekends only', ruleTextOriginal: 'OnlyFans links ONLY allowed on Saturdays and Sundays.', ruleTextEs: 'Autopromoción solo los fines de semana. Links de OnlyFans SOLO sábados y domingos.', isKeyRule: true, keyRuleType: 'restricted_days', aiExplanation: 'Solo podés poner links de OF los sábados y domingos. Entre semana, te borran el post.' },
      { ruleName: 'Required flair', ruleTextOriginal: 'Use correct flair: [F4M], [F4F], [Findom], [Discussion], [OC].', ruleTextEs: 'Flair obligatorio: [F4M], [F4F], [Findom], [Discussion], [OC].', isKeyRule: true, keyRuleType: 'flair', aiExplanation: 'Todos los posts necesitan flair correcto. Sin flair = post eliminado.' },
      { ruleName: 'Post limit: 3 per day', ruleTextOriginal: 'Maximum 3 posts per day.', ruleTextEs: 'Límite: 3 posts por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Hasta 3 posts diarios. Calidad antes que cantidad.' },
      { ruleName: 'Consent is paramount', ruleTextOriginal: 'All content must depict consensual activities.', ruleTextEs: 'El consentimiento es obligatorio. Todo debe ser consensuado.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Contenido que sugiera no consentimiento se borra y reporta.' },
      { ruleName: 'Verification for OC', ruleTextOriginal: 'Original content posters must be verified.', ruleTextEs: 'Verificación obligatoria para contenido original.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Si posteás contenido propio, tenés que estar verificada.' },
      { ruleName: 'No catfishing or stolen content', ruleTextOriginal: 'Only post your own content.', ruleTextEs: 'Prohibido catfishing o contenido robado.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Usá solo fotos tuyas. Contenido de otro = ban permanente.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'JOI', displayName: 'Jerk Off Instructions', description: 'Instructional content. Follow her commands.', subscribers: 345000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '2 per day', promoDays: 'weekends',
    summaryEs: 'Comunidad de instrucciones sexuales (JOI). Autopromoción fines de semana. Verificación requerida. Nicho muy demandado para creadoras dominantes.',
    rules: [
      { ruleName: 'Must be JOI/instruction content', ruleTextOriginal: 'Content must involve instructions or commands.', ruleTextEs: 'El contenido debe ser de instrucciones o comandos.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Sin instrucciones no es JOI. El contenido debe dirigir al espectador.' },
      { ruleName: 'Self-promo weekends only', ruleTextOriginal: 'OnlyFans links only on weekends.', ruleTextEs: 'Autopromoción solo fines de semana.', isKeyRule: true, keyRuleType: 'restricted_days', aiExplanation: 'Links de OF solo sábados y domingos.' },
      { ruleName: 'Post limit: 2 per day', ruleTextOriginal: 'Maximum 2 posts per day.', ruleTextEs: 'Límite: 2 posts diarios.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Hasta 2 posts por día.' },
      { ruleName: 'Verification for OC', ruleTextOriginal: 'OC posters must verify.', ruleTextEs: 'Verificación para OC.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate para postear contenido propio.' },
      { ruleName: 'Required flair', ruleTextOriginal: 'Use appropriate flair tag.', ruleTextEs: 'Flair obligatorio.', isKeyRule: true, keyRuleType: 'flair', aiExplanation: 'Elegí el flair correcto para tu tipo de JOI.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'Chastity', displayName: 'Chastity', description: 'Male chastity and keyholding. Locked up for your goddess.', subscribers: 145000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: 'weekends',
    summaryEs: 'Comunidad de castidad mascula y keyholding. Autopromoción fines de semana. Nicho dedicado con seguidores obsesivos. Bueno para contenido de negación.',
    rules: [
      { ruleName: 'Must be chastity/keyholding content', ruleTextOriginal: 'Content must involve chastity devices or keyholding themes.', ruleTextEs: 'El contenido debe involucrar castidad o keyholding.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Sin tema de castidad = post eliminado.' },
      { ruleName: 'Self-promo weekends only', ruleTextOriginal: 'Promo links only on weekends.', ruleTextEs: 'Autopromoción solo fines de semana.', isKeyRule: true, keyRuleType: 'restricted_days', aiExplanation: 'Links de OF solo sábados y domingos.' },
      { ruleName: 'Post limit: 1 per day', ruleTextOriginal: 'One post per 24 hours.', ruleTextEs: '1 post por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un post cada 24 horas.' },
      { ruleName: 'Verification required', ruleTextOriginal: 'OC posters must verify.', ruleTextEs: 'Verificación obligatoria.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate antes de postear contenido propio.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'Edging', displayName: 'Edging', description: 'Edging and orgasm control.', subscribers: 189000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '2 per day', promoDays: 'weekends',
    summaryEs: 'Comunidad de edging y control de orgasmos. Autopromoción fines de semana. Combiná bien con chastity y JOI. Seguidores muy dedicados.',
    rules: [
      { ruleName: 'Must be edging/orgasm control content', ruleTextOriginal: 'Content must involve edging or orgasm denial.', ruleTextEs: 'Debe ser contenido de edging o negación de orgasmo.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Sin tema de edging = post eliminado.' },
      { ruleName: 'Self-promo weekends only', ruleTextOriginal: 'OnlyFans links only on weekends.', ruleTextEs: 'Autopromoción solo fines de semana.', isKeyRule: true, keyRuleType: 'restricted_days', aiExplanation: 'Links de OF solo sábados y domingos.' },
      { ruleName: 'Post limit: 2 per day', ruleTextOriginal: 'Maximum 2 posts per day.', ruleTextEs: 'Límite: 2 posts diarios.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Hasta 2 posts por día.' },
      { ruleName: 'Verification required', ruleTextOriginal: 'OC posters must verify.', ruleTextEs: 'Verificación obligatoria.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate para postear contenido propio.' },
      ...BASE_NSFW_RULES,
    ],
  },

  // ═══ ONLYFANS / PROMO ═══
  {
    name: 'OnlyFansPromotions', displayName: 'OnlyFans Promotions 💸', description: 'The main OnlyFans promo subreddit. Post your links!', subscribers: 234000, over18: true, allowPromo: true, requiresVerify: true, postLimit: '1 per 24h', promoDays: null,
    summaryEs: 'El subreddit principal de promoción de OnlyFans. Se permite y se espera autopromoción. Verificación obligatoria. Formato de título requerido. Ideal para conseguir suscriptores.',
    rules: [
      { ruleName: 'Must have an OnlyFans link', ruleTextOriginal: 'All posts must include your OnlyFans link.', ruleTextEs: 'Todos los posts deben incluir tu link de OnlyFans.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Sin link de OF, el post se borra. Este sub ES para promo.' },
      { ruleName: 'Verification required', ruleTextOriginal: 'You must be verified before posting.', ruleTextEs: 'Verificación obligatoria antes de postear.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate con los mods. Es para evitar estafas.' },
      { ruleName: 'Post limit: 1 per 24 hours', ruleTextOriginal: 'One promo post per day.', ruleTextEs: 'Límite: 1 post promo por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un solo post de promo cada 24 horas.' },
      { ruleName: 'Required title format', ruleTextOriginal: 'Title format: [F4M] Name - What you offer.', ruleTextEs: 'Formato obligatorio: [F4M] Nombre - Lo que ofrecés.', isKeyRule: true, keyRuleType: 'title_format', aiExplanation: 'Ejemplo: [F4M] Jessica - Solo, feet, customs. Sin formato = post eliminado.' },
      { ruleName: 'No misleading titles', ruleTextOriginal: 'Titles must accurately represent your content.', ruleTextEs: 'No títulos engañosos. Deben representar tu contenido real.', isKeyRule: true, keyRuleType: 'title_format', aiExplanation: 'No hagas clickbait. Preview y título tienen que coincidir.' },
      { ruleName: 'No selling others content', ruleTextOriginal: 'Only promote your own OnlyFans.', ruleTextEs: 'Solo promocioná tu propio OnlyFans.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Promover cuenta ajena = ban.' },
      { ruleName: 'Mark paid content with [PPV]', ruleTextOriginal: 'Mark PPV content with [PPV] in title.', ruleTextEs: 'Marcá contenido pago con [PPV] en el título.', isKeyRule: true, keyRuleType: 'title_format', aiExplanation: 'Si tu post incluye contenido pago (PPV), aclaralo.' },
      ...BASE_NSFW_RULES,
    ],
  },

  // ═══ LINGERIE ═══
  {
    name: 'lingerie', displayName: 'Lingerie', description: 'Beautiful lingerie on beautiful people. SFW and NSFW.', subscribers: 890000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: null,
    summaryEs: 'Comunidad de lencería. Autopromoción solo en comentarios. Verificación requerida para OC. Excelente para creadoras de contenido de lencería.',
    rules: [
      { ruleName: 'Must feature lingerie', ruleTextOriginal: 'All posts must feature lingerie, underwear, or similar.', ruleTextEs: 'El contenido debe mostrar lencería, ropa interior o similar.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'Sin lencería visible = post eliminado.' },
      { ruleName: 'Self-promo in comments only', ruleTextOriginal: 'OnlyFans and social media links ONLY in comments.', ruleTextEs: 'Autopromoción SOLO en comentarios.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Links de OF van solo en comentarios.' },
      { ruleName: 'Post limit: 1 per day', ruleTextOriginal: 'Maximum 1 post per 24 hours.', ruleTextEs: 'Límite: 1 post por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un post cada 24 horas.' },
      { ruleName: 'Verification for OC', ruleTextOriginal: 'OC posters must be verified.', ruleTextEs: 'Verificación para OC.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate antes de postear contenido propio.' },
      { ruleName: 'Required flair', ruleTextOriginal: 'Use appropriate flair for your content.', ruleTextEs: 'Usá el flair apropiado.', isKeyRule: true, keyRuleType: 'flair', aiExplanation: 'Flair obligatorio. Elegí el correcto.' },
      ...BASE_NSFW_RULES,
    ],
  },

  // ═══ BONDAGE ═══
  {
    name: 'bondage', displayName: 'Bondage', description: 'The main bondage community. Ropes, cuffs, and more.', subscribers: 345000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: null,
    summaryEs: 'Comunidad principal de bondage. Autopromoción solo en comentarios. Consentimiento obligatorio. Buen nicho para creadoras de contenido de shibari/bondage.',
    rules: [
      { ruleName: 'Consent is mandatory', ruleTextOriginal: 'All content must be consensual. Content suggesting non-consent will be removed.', ruleTextEs: 'El consentimiento es obligatorio. Todo debe ser consensuado.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Contenido no consensuado = ban inmediato.' },
      { ruleName: 'Self-promo in comments only', ruleTextOriginal: 'OnlyFans links in comments of your own posts.', ruleTextEs: 'Autopromoción solo en comentarios.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Links de OF solo en comentarios.' },
      { ruleName: 'No extreme content without tags', ruleTextOriginal: 'Extreme bondage, breath play must be tagged with [Extreme] flair.', ruleTextEs: 'Contenido extremo requiere flair [Extreme] y NSFW.', isKeyRule: true, keyRuleType: 'flair', aiExplanation: 'Contenido extremo sin tag = post eliminado.' },
      { ruleName: 'Post limit: 1 per day', ruleTextOriginal: 'Maximum 1 post per 24 hours.', ruleTextEs: '1 post por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un post cada 24 horas.' },
      { ruleName: 'Safety tips encouraged', ruleTextOriginal: 'Include safety tips with shibari/suspension content.', ruleTextEs: 'Se agradece incluir tips de seguridad con contenido de shibari.', isKeyRule: false, keyRuleType: 'other', aiExplanation: 'No es obligatorio pero sumás valor si incluís advertencias de seguridad.' },
      ...BASE_NSFW_RULES,
    ],
  },

  // ═══ BODY ═══
  {
    name: 'thick', displayName: 'Thick', description: 'Curvy and thick content. All shapes welcome.', subscribers: 890000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: null,
    summaryEs: 'Comunidad de cuerpos curvy/thick. Ambiente body-positive. Autopromoción en comentarios. Excelente para creadoras con cuerpo curvy.',
    rules: [
      { ruleName: 'Body-positive community', ruleTextOriginal: 'No body shaming. All body types welcome.', ruleTextEs: 'Comunidad body-positive. No se permite body shaming.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Comentarios negativos sobre cuerpos = ban.' },
      { ruleName: 'Self-promo in comments only', ruleTextOriginal: 'OnlyFans links ONLY in comments of your own posts.', ruleTextEs: 'Autopromoción SOLO en comentarios.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Links de OF solo en comentarios.' },
      { ruleName: 'Post limit: 1 per day', ruleTextOriginal: 'Maximum 1 post per 24 hours.', ruleTextEs: '1 post por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un post cada 24 horas.' },
      { ruleName: 'Required flair', ruleTextOriginal: 'Use appropriate flair.', ruleTextEs: 'Flair obligatorio.', isKeyRule: true, keyRuleType: 'flair', aiExplanation: 'Elegí el flair correcto.' },
      { ruleName: 'Verification for OC', ruleTextOriginal: 'OC posters must be verified.', ruleTextEs: 'Verificación para OC.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate para postear contenido propio.' },
      ...BASE_NSFW_RULES,
    ],
  },
  {
    name: 'BBW', displayName: 'BBW', description: 'Big beautiful women. Plus size content.', subscribers: 567000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: null,
    summaryEs: 'Comunidad de mujeres grandes y hermosas. Ambiente body-positive. Autopromoción en comentarios. Mercado grande y dedicado.',
    rules: [
      { ruleName: 'Body-positive only', ruleTextOriginal: 'No body shaming or negative comments about size.', ruleTextEs: 'Solo body-positive. Prohibido body shaming.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Cualquier comentario negativo sobre el cuerpo = ban.' },
      { ruleName: 'Self-promo in comments only', ruleTextOriginal: 'OnlyFans links in comments.', ruleTextEs: 'Autopromoción solo en comentarios.', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Links de OF solo en comentarios.' },
      { ruleName: 'Post limit: 1 per day', ruleTextOriginal: 'One post per 24 hours.', ruleTextEs: '1 post por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un post cada 24 horas.' },
      { ruleName: 'Verification required', ruleTextOriginal: 'OC must be verified.', ruleTextEs: 'Verificación obligatoria para OC.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate para postear contenido propio.' },
      ...BASE_NSFW_RULES,
    ],
  },

  // ═══ HOTWIFE ═══
  {
    name: 'hotwife', displayName: 'Hotwife', description: 'Hotwife lifestyle content. Shared wives.', subscribers: 567000, over18: true, allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: null,
    summaryEs: 'Comunidad hotwife/cuckold. Autopromoción con flair. Requiere consentimiento de todas las partes. Mercado activo y grande.',
    rules: [
      { ruleName: 'Self-promo with flair only', ruleTextOriginal: 'OnlyFans links allowed with [Promo] flair only.', ruleTextEs: 'Autopromoción solo con flair [Promo].', isKeyRule: true, keyRuleType: 'promo', aiExplanation: 'Usá flair [Promo] para tus links de OF.' },
      { ruleName: 'Post limit: 1 per day', ruleTextOriginal: 'Maximum 1 post per 24 hours.', ruleTextEs: '1 post por día.', isKeyRule: true, keyRuleType: 'post_limit', aiExplanation: 'Un post cada 24 horas.' },
      { ruleName: 'Consent of all parties', ruleTextOriginal: 'All parties in content must consent.', ruleTextEs: 'Consentimiento de todas las partes en el contenido.', isKeyRule: true, keyRuleType: 'other', aiExplanation: 'Todas las personas en el contenido deben consentir.' },
      { ruleName: 'Verification required', ruleTextOriginal: 'OC posters must be verified.', ruleTextEs: 'Verificación obligatoria para OC.', isKeyRule: true, keyRuleType: 'verification', aiExplanation: 'Verificate antes de postear.' },
      ...BASE_NSFW_RULES,
    ],
  },
];

// ── Trend data ─────────────────────────────────────────────────────────────

const TREND_DATA = [
  { fetishName: 'Feet ASMR', category: 'Feet + ASMR', growthPercent: 285, competitionLevel: 'baja', opportunityScore: 92, isEmerging: true, subredditName: 'FeetASMR' },
  { fetishName: 'Sensory Deprivation', category: 'Bondage', growthPercent: 180, competitionLevel: 'baja', opportunityScore: 88, isEmerging: true, subredditName: 'SensoryDeprivation' },
  { fetishName: 'Shoe Dangling', category: 'Feet', growthPercent: 165, competitionLevel: 'baja', opportunityScore: 85, isEmerging: true, subredditName: 'ShoeDangling' },
  { fetishName: 'Crypto Findom', category: 'Findom + Crypto', growthPercent: 220, competitionLevel: 'media', opportunityScore: 78, isEmerging: true, subredditName: 'CryptoFindom' },
  { fetishName: 'Giantess POV', category: 'Roleplay', growthPercent: 145, competitionLevel: 'media', opportunityScore: 74, isEmerging: true, subredditName: 'GiantessPOV' },
  { fetishName: 'Mouth Sounds', category: 'ASMR', growthPercent: 130, competitionLevel: 'media', opportunityScore: 71, isEmerging: true, subredditName: 'asmr' },
  { fetishName: 'Pedicure Content', category: 'Feet', growthPercent: 95, competitionLevel: 'media', opportunityScore: 68, isEmerging: false, subredditName: 'paintedtoes' },
  { fetishName: 'Cosplay Findom', category: 'Cosplay + Findom', growthPercent: 110, competitionLevel: 'baja', opportunityScore: 82, isEmerging: true, subredditName: 'nsfwcosplay' },
  { fetishName: 'Smoking Fetish', category: 'Smoking', growthPercent: 88, competitionLevel: 'alta', opportunityScore: 55, isEmerging: false, subredditName: 'SmokingFetish' },
  { fetishName: 'Yoga Pants Worship', category: 'Fitness', growthPercent: 75, competitionLevel: 'alta', opportunityScore: 48, isEmerging: false, subredditName: 'girlsinyogapants' },
  { fetishName: 'Body Paint', category: 'Art + NSFW', growthPercent: 120, competitionLevel: 'baja', opportunityScore: 79, isEmerging: true, subredditName: 'bodypaint' },
  { fetishName: 'Latex Fashion', category: 'Latex', growthPercent: 65, competitionLevel: 'media', opportunityScore: 62, isEmerging: false, subredditName: 'latex' },
  { fetishName: 'Chastity Tease', category: 'Femdom', growthPercent: 195, competitionLevel: 'media', opportunityScore: 76, isEmerging: true, subredditName: 'Chastity' },
  { fetishName: 'Nail Fetish', category: 'Hands + Nails', growthPercent: 140, competitionLevel: 'baja', opportunityScore: 80, isEmerging: true, subredditName: 'nailfetish' },
  { fetishName: 'Hair Fetish', category: 'Hair', growthPercent: 88, competitionLevel: 'baja', opportunityScore: 72, isEmerging: false, subredditName: 'hairfetish' },
];

// ── Seed function ──────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding database...');

  // Seed subreddits with rules
  for (const sub of SUBREDDITS) {
    console.log(`  📌 r/${sub.name} (${sub.rules.length} rules)`);

    const upsertData = {
      name: sub.name,
      displayName: sub.displayName,
      description: sub.description,
      subscribers: sub.subscribers,
      over18: sub.over18,
      allowPromo: sub.allowPromo,
      requiresVerify: sub.requiresVerify,
      postLimit: sub.postLimit,
      promoDays: sub.promoDays,
      summaryEs: sub.summaryEs,
    };

    const savedSub = await prisma.subreddit.upsert({
      where: { name: sub.name },
      update: upsertData,
      create: upsertData,
    });

    // Delete old rules and create new ones
    await prisma.rule.deleteMany({ where: { subredditId: savedSub.id } });

    for (const rule of sub.rules) {
      await prisma.rule.create({
        data: {
          subredditId: savedSub.id,
          ruleName: rule.ruleName,
          ruleTextOriginal: rule.ruleTextOriginal,
          ruleTextEs: rule.ruleTextEs,
          isKeyRule: rule.isKeyRule,
          keyRuleType: rule.keyRuleType,
          aiExplanation: rule.aiExplanation,
        },
      });
    }
  }

  // Seed trends
  console.log('  📈 Seeding trends...');
  for (const trend of TREND_DATA) {
    const subName = trend.subredditName.toLowerCase();
    let sub = await prisma.subreddit.findUnique({ where: { name: subName } });

    if (!sub) {
      sub = await prisma.subreddit.create({
        data: {
          name: subName,
          displayName: trend.fetishName,
          subscribers: 0,
          over18: true,
        },
      });
    }

    await prisma.trend.create({
      data: {
        subredditId: sub.id,
        fetishName: trend.fetishName,
        category: trend.category,
        growthPercent: trend.growthPercent,
        memberCount: 0,
        opportunityScore: trend.opportunityScore,
        competitionLevel: trend.competitionLevel,
        isEmerging: trend.isEmerging,
        weekDetected: new Date().toISOString().split('T')[0],
      },
    });
  }

  console.log('✅ Seed complete!');
  console.log(`   ${SUBREDDITS.length} subreddits with rules`);
  console.log(`   ${TREND_DATA.length} trends`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
