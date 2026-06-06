export interface DemoSubreddit {
  name: string;
  displayName: string;
  description: string;
  subscribers: number;
  over18: boolean;
  niches: string[];
  allowPromo: boolean | null;
  requiresVerify: boolean | null;
  postLimit: string | null;
  promoDays: string | null;
}

export const ALL_SUBREDDITS: DemoSubreddit[] = [
  // ═══════════════════════════════════════════════════════
  // LATINAS / LATIN — Verified active 2025
  // ═══════════════════════════════════════════════════════
  { name: 'latinas', displayName: 'Latinas', description: 'La comunidad más grande de contenido Latina en Reddit. Excelente visibilidad para creadoras latinas.', subscribers: 580000, over18: true, niches: ['latina', 'latin', 'español', 'latinas'], allowPromo: null, requiresVerify: true, postLimit: '1 per 24h', promoDays: null },
  { name: 'LatinasGW', displayName: 'Latinas Gone Wild', description: 'GoneWild para Latinas. Verificación requerida. Muy activo, buena conversión para OnlyFans.', subscribers: 310000, over18: true, niches: ['latina', 'latin', 'gw', 'latinas'], allowPromo: null, requiresVerify: true, postLimit: '1 per 24h', promoDays: null },
  { name: 'LatinaHotties', displayName: 'Latina Hotties', description: 'Contenido caliente de Latinas. Permite promo en comentarios. Comunidad en crecimiento.', subscribers: 185000, over18: true, niches: ['latina', 'latin', 'hot', 'latinas'], allowPromo: null, requiresVerify: false, postLimit: '2 per day', promoDays: null },
  { name: 'dommeslatinas', displayName: 'Dommes Latinas', description: 'Dominación femenina Latina. Findom y femdom en español/comunidad latina. Nicho dedicado para creadoras de habla hispana.', subscribers: 12000, over18: true, niches: ['latina', 'femdom', 'findom', 'dominatrix', 'dommes', 'español'], allowPromo: true, requiresVerify: true, postLimit: '1 per day', promoDays: null },
  { name: 'Latinasnsfw', displayName: 'Latinas NSFW', description: 'Contenido NSFW exclusivo de Latinas. Crecimiento constante. Buen nicho para creadoras latinas.', subscribers: 95000, over18: true, niches: ['latina', 'latin', 'nsfw', 'latinas'], allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: null },

  // ═══════════════════════════════════════════════════════
  // FEET — Verified active 2025
  // ═══════════════════════════════════════════════════════
  { name: 'VerifiedFeet', displayName: 'Verified Feet', description: 'Modelos de pies verificadas. Verificación obligatoria. Popular con creadores de OF.', subscribers: 514000, over18: true, niches: ['feet', 'foot', 'verified', 'of'], allowPromo: null, requiresVerify: true, postLimit: '1 per 24h', promoDays: null },
  { name: 'Feet_NSFW', displayName: 'Feet NSFW', description: 'Contenido NSFW de pies. Horario abierto para creadores.', subscribers: 495000, over18: true, niches: ['feet', 'foot', 'nsfw'], allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: null },
  { name: 'feet', displayName: 'Feet', description: 'La comunidad de fetichismo de pies más grande de Reddit. Reglas estrictas de karma y verificación pero audiencia enorme.', subscribers: 485000, over18: true, niches: ['feet', 'foot', 'soles', 'toes'], allowPromo: null, requiresVerify: true, postLimit: '1 per 24h', promoDays: null },
  { name: 'FootFetish', displayName: 'Foot Fetish', description: 'Comunidad activa de fetichismo de pies. Permite watermarks de OF. Excelente para creadores.', subscribers: 464000, over18: true, niches: ['feet', 'foot', 'fetish', 'of'], allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: null },

  // ═══════════════════════════════════════════════════════
  // FINDOM — Verified active 2025
  // ═══════════════════════════════════════════════════════
  { name: 'findom', displayName: 'Financial Domination', description: 'El hub principal de findom. Verificación en pin. Activo diario. Audiencia con alto poder adquisitivo.', subscribers: 210000, over18: true, niches: ['findom', 'financial', 'domination', 'money'], allowPromo: true, requiresVerify: true, postLimit: '2 per day', promoDays: null },
  { name: 'paypigsupportgroup', displayName: 'Paypig Support Group', description: 'Comunidad findom enfocada en paypigs. Sub hermano de findom. Tributos activos.', subscribers: 107000, over18: true, niches: ['findom', 'paypig', 'tribute'], allowPromo: true, requiresVerify: true, postLimit: '1 per day', promoDays: null },
  { name: 'Sexsells', displayName: 'Sex Sells', description: 'Marketplace NSFW general. Promo de findom, contenido personalizado. Alta intención de compra.', subscribers: 849000, over18: true, niches: ['findom', 'selling', 'custom', 'marketplace', 'of'], allowPromo: true, requiresVerify: true, postLimit: '1 per 24h', promoDays: null },

  // ═══════════════════════════════════════════════════════
  // COSPLAY — Verified active 2025
  // ═══════════════════════════════════════════════════════
  { name: 'cosplaygirls', displayName: 'Cosplay Girls', description: 'Comunidad masiva de cosplayers femeninas. Permite links de OF en comentarios.', subscribers: 1905000, over18: true, niches: ['cosplay', 'girls', 'costume', 'of'], allowPromo: null, requiresVerify: false, postLimit: '1 per 12h', promoDays: null },
  { name: 'nsfwcosplay', displayName: 'NSFW Cosplay', description: 'El subreddit de cosplay nude más grande. Verificación requerida. +21K miembros nuevos/mes.', subscribers: 1677000, over18: true, niches: ['cosplay', 'nsfw', 'nude', 'costume'], allowPromo: null, requiresVerify: true, postLimit: '1 per 24h', promoDays: null },
  { name: 'CosplayLewd', displayName: 'Cosplay Lewd', description: 'Showcase de cosplay lewd/erótico. Creado por ero-cosplayers. Bueno para promo de OF.', subscribers: 573000, over18: true, niches: ['cosplay', 'lewd', 'erotic', 'of'], allowPromo: null, requiresVerify: false, postLimit: '2 per day', promoDays: null },

  // ═══════════════════════════════════════════════════════
  // ASMR / AUDIO — Verified active 2025
  // ═══════════════════════════════════════════════════════
  { name: 'GoneWildAudio', displayName: 'Gone Wild Audio', description: 'Audio erótico, ASMR, gemidos, dirty talk. El sub NSFW de audio dominante. Audiencia enorme para creadores de voz.', subscribers: 2160000, over18: true, niches: ['asmr', 'audio', 'voice', 'moan', 'dirty talk'], allowPromo: null, requiresVerify: true, postLimit: '2 per day', promoDays: null },
  { name: 'dirtypenpals', displayName: 'Dirty Pen Pals', description: 'Roleplay erótico por texto y scripts de audio. Bueno para escritores y creadores de voz.', subscribers: 739000, over18: true, niches: ['asmr', 'audio', 'roleplay', 'script', 'writing'], allowPromo: false, requiresVerify: false, postLimit: '3 per day', promoDays: null },

  // ═══════════════════════════════════════════════════════
  // FEMDOM — Verified active 2025
  // ═══════════════════════════════════════════════════════
  { name: 'Femdom', displayName: 'Femdom', description: 'El subreddit principal de femdom. +11.6K nuevos/mes. Enfocado en contenido, permite posts de creadores.', subscribers: 828000, over18: true, niches: ['femdom', 'domination', 'mistress', 'of'], allowPromo: null, requiresVerify: true, postLimit: '3 per day', promoDays: 'weekends only' },
  { name: 'BDSM', displayName: 'BDSM', description: 'La comunidad BDSM más grande de Reddit. Alcance amplio para femdom, bondage y kink.', subscribers: 1398000, over18: true, niches: ['femdom', 'bdsm', 'bondage', 'kink'], allowPromo: null, requiresVerify: false, postLimit: '2 per day', promoDays: null },
  { name: 'femdomcommunity', displayName: 'Femdom Community', description: 'Discusión y contenido para el lifestyle femdom. Buen engagement para creadores.', subscribers: 200000, over18: true, niches: ['femdom', 'community', 'lifestyle'], allowPromo: null, requiresVerify: true, postLimit: '2 per day', promoDays: null },

  // ═══════════════════════════════════════════════════════
  // LINGERIE — Verified active 2025
  // ═══════════════════════════════════════════════════════
  { name: 'lingerie', displayName: 'Lingerie', description: 'El subreddit de lencería principal. +8.2K nuevos/mes. Mezcla SFW/NSFW. Buena conversión para OF.', subscribers: 806000, over18: true, niches: ['lingerie', 'underwear', 'sexy', 'of'], allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: null },
  { name: 'gonewildcurvy', displayName: 'Gone Wild Curvy', description: 'Mujeres curvas en lencería/desnudas. Body-positive. Fuerte presencia de creadoras de OF.', subscribers: 704000, over18: true, niches: ['lingerie', 'curvy', 'thick', 'of'], allowPromo: null, requiresVerify: true, postLimit: '1 per 24h', promoDays: null },

  // ═══════════════════════════════════════════════════════
  // LATEX — Verified active 2025
  // ═══════════════════════════════════════════════════════
  { name: 'latexfetish', displayName: 'Latex Fetish', description: 'Contenido dedicado de fetichismo latex/rubber. Comunidad activa para creadoras de OF de latex.', subscribers: 137000, over18: true, niches: ['latex', 'rubber', 'fetish', 'shiny'], allowPromo: null, requiresVerify: true, postLimit: '2 per day', promoDays: null },
  { name: 'Gonewild_latex', displayName: 'Gone Wild Latex', description: 'Contenido latex estilo GW. +2.4K nuevos/mes. Reglas amigables para creadores.', subscribers: 53000, over18: true, niches: ['latex', 'gw', 'rubber', 'of'], allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: null },

  // ═══════════════════════════════════════════════════════
  // BONDAGE — Verified active 2025
  // ═══════════════════════════════════════════════════════
  { name: 'Bondage', displayName: 'Bondage', description: 'El subreddit principal de bondage. +6.7K nuevos/mes. Cuerdas, esposas, contenido de sumisión.', subscribers: 772000, over18: true, niches: ['bondage', 'rope', 'restraint', 'submission'], allowPromo: null, requiresVerify: false, postLimit: '1 per day', promoDays: null },

  // ═══════════════════════════════════════════════════════
  // SMOKING — Verified active 2025
  // ═══════════════════════════════════════════════════════
  { name: 'smokingfetish', displayName: 'Smoking Fetish', description: 'El subreddit de fetichismo de fumar principal. +3.6K nuevos/mes. Activo y específico del nicho.', subscribers: 150000, over18: true, niches: ['smoking', 'cigarette', 'fetish'], allowPromo: true, requiresVerify: false, postLimit: '2 per day', promoDays: null },

  // ═══════════════════════════════════════════════════════
  // BBW — Verified active 2025
  // ═══════════════════════════════════════════════════════
  { name: 'BBW', displayName: 'BBW', description: 'El subreddit BBW más grande. +15.5K nuevos/mes. 218K visitantes semanales. Amigable para creadores.', subscribers: 1092000, over18: true, niches: ['bbw', 'plus', 'big', 'curvy', 'of'], allowPromo: null, requiresVerify: true, postLimit: '1 per 24h', promoDays: null },
  { name: 'BBWGW', displayName: 'BBW Gone Wild', description: 'BBW GoneWild. Verificación requerida. Fuerte presencia de amateurs y creadores.', subscribers: 214000, over18: true, niches: ['bbw', 'gw', 'plus', 'of'], allowPromo: null, requiresVerify: true, postLimit: '1 per 24h', promoDays: null },

  // ═══════════════════════════════════════════════════════
  // GOTH / ALT — Verified active 2025
  // ═══════════════════════════════════════════════════════
  { name: 'gothsluts', displayName: 'Goth Sluts', description: 'Subreddit goth NSFW masivo. +44.8K nuevos/mes. Uno de los subs de fetiche que más crece en Reddit.', subscribers: 2679000, over18: true, niches: ['goth', 'alt', 'dark', 'nsfw', 'of'], allowPromo: null, requiresVerify: true, postLimit: '1 per 24h', promoDays: null },
  { name: 'gothgirls', displayName: 'Goth Girls', description: 'Apreciación goth (SFW-leaning). Buen embudo para conversión a OF.', subscribers: 393000, over18: true, niches: ['goth', 'girls', 'alt', 'dark'], allowPromo: null, requiresVerify: false, postLimit: '2 per day', promoDays: null },
  { name: 'AltGirls', displayName: 'Alt Girls', description: 'Chicas alternativas: tattoos, piercings, cabello colorido. Crecimiento rápido. Bueno para creadoras alt.', subscribers: 245000, over18: true, niches: ['alt', 'tattoo', 'piercing', 'alternative'], allowPromo: null, requiresVerify: false, postLimit: '1 per day', promoDays: null },

  // ═══════════════════════════════════════════════════════
  // HOTWIFE — Verified active 2025
  // ═══════════════════════════════════════════════════════
  { name: 'Hotwife', displayName: 'Hotwife', description: 'El subreddit principal de lifestyle hotwife. +27.5K nuevos/mes. Masivo y creciendo rápido.', subscribers: 1961000, over18: true, niches: ['hotwife', 'shared', 'lifestyle', 'couple'], allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: null },
  { name: 'cuckold', displayName: 'Cuckold', description: 'Contenido cuckold/hotwife. Audiencia enorme. Contenido de creadores bienvenido.', subscribers: 2178000, over18: true, niches: ['cuckold', 'cuck', 'hotwife', 'lifestyle'], allowPromo: null, requiresVerify: false, postLimit: '1 per day', promoDays: null },

  // ═══════════════════════════════════════════════════════
  // ONLYFANS PROMO — Verified active 2025
  // ═══════════════════════════════════════════════════════
  { name: 'OnlyFans101', displayName: 'OnlyFans 101', description: 'El subreddit de promo de OF más grande. +42.4K nuevos/mes. Esencial para todos los creadores.', subscribers: 2924000, over18: true, niches: ['onlyfans', 'promo', 'of', 'creator'], allowPromo: true, requiresVerify: true, postLimit: '1 per 24h', promoDays: null },
  { name: 'NSFWverifiedamateurs', displayName: 'NSFW Verified Amateurs', description: 'Contenido amateur verificado. Bueno para descubrimiento de OF y construir audiencia.', subscribers: 1376000, over18: true, niches: ['onlyfans', 'amateur', 'verified', 'of'], allowPromo: null, requiresVerify: true, postLimit: '1 per 24h', promoDays: null },
  { name: 'onlyfansadvice', displayName: 'OnlyFans Advice', description: 'Educación + networking para creadores. +9.9K nuevos/mes. Imprescindible para estrategia.', subscribers: 554000, over18: true, niches: ['onlyfans', 'advice', 'tips', 'creator'], allowPromo: true, requiresVerify: true, postLimit: '1 per 24h', promoDays: null },
  { name: 'OnlyFansPromo', displayName: 'OnlyFans Promo', description: 'Autopromoción dedicada de OF. Comunidad enfocada en postear tus links.', subscribers: 94000, over18: true, niches: ['onlyfans', 'promo', 'self-promo', 'of'], allowPromo: true, requiresVerify: true, postLimit: '1 per 24h', promoDays: null },

  // ═══════════════════════════════════════════════════════
  // JOI — Verified active 2025
  // ═══════════════════════════════════════════════════════
  { name: 'joi', displayName: 'JOI', description: 'El subreddit principal de Jerk Off Instruction. +9.4K nuevos/mes. Muy activo. Excelente para creadoras de OF.', subscribers: 549000, over18: true, niches: ['joi', 'instruction', 'femdom', 'edging', 'of'], allowPromo: null, requiresVerify: true, postLimit: '2 per day', promoDays: null },

  // ═══════════════════════════════════════════════════════
  // CHASTITY — Verified active 2025 (¡crecimiento más rápido!)
  // ═══════════════════════════════════════════════════════
  { name: 'chastity', displayName: 'Chastity', description: 'El subreddit de castidad principal. +13K nuevos/mes. "Fetiche de 2025". El kink que más crece.', subscribers: 486000, over18: true, niches: ['chastity', 'keyholding', 'denial', 'femdom'], allowPromo: null, requiresVerify: true, postLimit: '2 per day', promoDays: null },
  { name: 'chastitytraining', displayName: 'Chastity Training', description: 'Entrenamiento de castidad & keyholding. Comunidad activa para creadores que venden contenido de castidad.', subscribers: 143000, over18: true, niches: ['chastity', 'training', 'keyholding', 'of'], allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: null },

  // ═══════════════════════════════════════════════════════
  // THICK / CURVY — Verified active 2025
  // ═══════════════════════════════════════════════════════
  { name: 'Thick', displayName: 'Thick', description: 'Comunidad de chicas thick/curvy. Muy activa. Buena conversión para creadoras con cuerpo curvy.', subscribers: 850000, over18: true, niches: ['thick', 'curvy', 'body', 'of'], allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: null },

  // ═══════════════════════════════════════════════════════
  // PETITE — Verified active 2025
  // ═══════════════════════════════════════════════════════
  { name: 'petite', displayName: 'Petite', description: 'Comunidad para chicas petite. Audiencia dedicada. Bueno para creadoras de cuerpo pequeño.', subscribers: 620000, over18: true, niches: ['petite', 'small', 'tiny', 'body'], allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: null },

  // ═══════════════════════════════════════════════════════
  // MILF — Verified active 2025
  // ═══════════════════════════════════════════════════════
  { name: 'Milfie', displayName: 'Milfie', description: 'Comunidad MILF activa. +5K nuevos/mes. Excelente para creadoras 30+.', subscribers: 340000, over18: true, niches: ['milf', 'mature', 'mom', 'of'], allowPromo: null, requiresVerify: true, postLimit: '1 per day', promoDays: null },

  // ═══════════════════════════════════════════════════════
  // GONEWILD VARIANTS — Verified active 2025
  // ═══════════════════════════════════════════════════════
  { name: 'gonewild', displayName: 'Gone Wild', description: 'El subreddit GW original. Verificación obligatoria. Audiencia masiva pero sin promo directa.', subscribers: 4100000, over18: true, niches: ['gw', 'gonewild', 'nude', 'selfie'], allowPromo: false, requiresVerify: true, postLimit: '1 per 24h', promoDays: null },
  { name: 'gonewild30plus', displayName: 'Gone Wild 30+', description: 'GW para mujeres 30+. Comunidad dedicada. Gran conversión para creadoras maduras.', subscribers: 180000, over18: true, niches: ['gw', 'mature', 'milf', '30plus'], allowPromo: false, requiresVerify: true, postLimit: '1 per 24h', promoDays: null },
];

// Lookup map for quick access by name
export const SUBREDDIT_MAP = new Map(
  ALL_SUBREDDITS.map(s => [s.name.toLowerCase(), s])
);

// Get subscriber count for a subreddit (returns curated data or null)
export function getSubredditData(name: string): DemoSubreddit | null {
  return SUBREDDIT_MAP.get(name.toLowerCase()) || null;
}

// Get subscriber count (returns curated count or 0)
export function getSubscriberCount(name: string): number {
  return SUBREDDIT_MAP.get(name.toLowerCase())?.subscribers ?? 0;
}
