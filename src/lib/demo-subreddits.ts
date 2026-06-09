// Curated subreddit list — ONLY subscriber counts and basic info are reliable.
// Rule-specific fields (allowPromo, requiresVerify, postLimit, promoDays) are set to null
// because they were previously inaccurate. Real rule data now comes from:
// 1. Client-side Reddit fetch (browser fetches directly) → REAL rules
// 2. AI translation of real rules
// 3. AI estimation (with clear warning)
// DO NOT add hardcoded rule data here — it was wrong before and will be wrong again.

export interface DemoSubreddit {
  name: string;
  displayName: string;
  description: string;
  subscribers: number;
  over18: boolean;
  niches: string[];
  allowPromo: boolean | null;   // null = unknown, must fetch from Reddit
  requiresVerify: boolean | null; // null = unknown, must fetch from Reddit
  postLimit: string | null;     // null = unknown, must fetch from Reddit
  promoDays: string | null;     // null = unknown, must fetch from Reddit
}

export const ALL_SUBREDDITS: DemoSubreddit[] = [
  // ═══════════════════════════════════════════════════════
  // LATINAS / LATIN — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'latinas', displayName: 'Latinas', description: 'La comunidad más grande de contenido Latina en Reddit. Excelente visibilidad para creadoras latinas.', subscribers: 580000, over18: true, niches: ['latina', 'latin', 'español', 'latinas'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'LatinasGW', displayName: 'Latinas Gone Wild', description: 'GoneWild para Latinas. Muy activo, buena conversión para OnlyFans.', subscribers: 310000, over18: true, niches: ['latina', 'latin', 'gw', 'latinas'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'LatinaHotties', displayName: 'Latina Hotties', description: 'Contenido caliente de Latinas. Comunidad en crecimiento.', subscribers: 185000, over18: true, niches: ['latina', 'latin', 'hot', 'latinas'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'dommeslatinas', displayName: 'Dommes Latinas', description: 'Dominación femenina Latina. Findom y femdom en español/comunidad latina. Nicho dedicado para creadoras de habla hispana.', subscribers: 12000, over18: true, niches: ['latina', 'femdom', 'findom', 'dominatrix', 'dommes', 'español'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'Latinasnsfw', displayName: 'Latinas NSFW', description: 'Contenido NSFW exclusivo de Latinas. Crecimiento constante. Buen nicho para creadoras latinas.', subscribers: 95000, over18: true, niches: ['latina', 'latin', 'nsfw', 'latinas'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },

  // ═══════════════════════════════════════════════════════
  // FEET — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'VerifiedFeet', displayName: 'Verified Feet', description: 'Modelos de pies verificadas. Popular con creadores de OF.', subscribers: 514000, over18: true, niches: ['feet', 'foot', 'verified', 'of'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'Feet_NSFW', displayName: 'Feet NSFW', description: 'Contenido NSFW de pies.', subscribers: 495000, over18: true, niches: ['feet', 'foot', 'nsfw'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'feet', displayName: 'Feet', description: 'La comunidad de fetichismo de pies más grande de Reddit. Audiencia enorme.', subscribers: 485000, over18: true, niches: ['feet', 'foot', 'soles', 'toes'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'FootFetish', displayName: 'Foot Fetish', description: 'Comunidad activa de fetichismo de pies. Excelente para creadores.', subscribers: 464000, over18: true, niches: ['feet', 'foot', 'fetish', 'of'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },

  // ═══════════════════════════════════════════════════════
  // FINDOM — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'findom', displayName: 'Financial Domination', description: 'El hub principal de findom. Activo diario. Audiencia con alto poder adquisitivo.', subscribers: 210000, over18: true, niches: ['findom', 'financial', 'domination', 'money'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'paypigsupportgroup', displayName: 'Paypig Support Group', description: 'Comunidad findom enfocada en paypigs. Sub hermano de findom. Tributos activos.', subscribers: 107000, over18: true, niches: ['findom', 'paypig', 'tribute'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'Sexsells', displayName: 'Sex Sells', description: 'Marketplace NSFW general. Promo de findom, contenido personalizado. Alta intención de compra.', subscribers: 849000, over18: true, niches: ['findom', 'selling', 'custom', 'marketplace', 'of'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },

  // ═══════════════════════════════════════════════════════
  // COSPLAY — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'cosplaygirls', displayName: 'Cosplay Girls', description: 'Comunidad masiva de cosplayers femeninas.', subscribers: 1905000, over18: true, niches: ['cosplay', 'girls', 'costume', 'of'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'nsfwcosplay', displayName: 'NSFW Cosplay', description: 'El subreddit de cosplay nude más grande.', subscribers: 1677000, over18: true, niches: ['cosplay', 'nsfw', 'nude', 'costume'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'CosplayLewd', displayName: 'Cosplay Lewd', description: 'Showcase de cosplay lewd/erótico. Bueno para promo de OF.', subscribers: 573000, over18: true, niches: ['cosplay', 'lewd', 'erotic', 'of'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },

  // ═══════════════════════════════════════════════════════
  // ASMR / AUDIO — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'GoneWildAudio', displayName: 'Gone Wild Audio', description: 'Audio erótico, ASMR, gemidos, dirty talk. El sub NSFW de audio dominante.', subscribers: 2160000, over18: true, niches: ['asmr', 'audio', 'voice', 'moan', 'dirty talk'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'dirtypenpals', displayName: 'Dirty Pen Pals', description: 'Roleplay erótico por texto y scripts de audio.', subscribers: 739000, over18: true, niches: ['asmr', 'audio', 'roleplay', 'script', 'writing'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },

  // ═══════════════════════════════════════════════════════
  // FEMDOM — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'Femdom', displayName: 'Femdom', description: 'El subreddit principal de femdom. Enfocado en contenido.', subscribers: 828000, over18: true, niches: ['femdom', 'domination', 'mistress', 'of'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'BDSM', displayName: 'BDSM', description: 'La comunidad BDSM más grande de Reddit. Alcance amplio para femdom, bondage y kink.', subscribers: 1398000, over18: true, niches: ['femdom', 'bdsm', 'bondage', 'kink'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'femdomcommunity', displayName: 'Femdom Community', description: 'Discusión y contenido para el lifestyle femdom.', subscribers: 200000, over18: true, niches: ['femdom', 'community', 'lifestyle'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },

  // ═══════════════════════════════════════════════════════
  // LINGERIE — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'lingerie', displayName: 'Lingerie', description: 'El subreddit de lencería principal. Buena conversión para OF.', subscribers: 806000, over18: true, niches: ['lingerie', 'underwear', 'sexy', 'of'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'gonewildcurvy', displayName: 'Gone Wild Curvy', description: 'Mujeres curvas en lencería/desnudas. Body-positive.', subscribers: 704000, over18: true, niches: ['lingerie', 'curvy', 'thick', 'of'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },

  // ═══════════════════════════════════════════════════════
  // LATEX — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'latexfetish', displayName: 'Latex Fetish', description: 'Contenido dedicado de fetichismo latex/rubber.', subscribers: 137000, over18: true, niches: ['latex', 'rubber', 'fetish', 'shiny'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'Gonewild_latex', displayName: 'Gone Wild Latex', description: 'Contenido latex estilo GW.', subscribers: 53000, over18: true, niches: ['latex', 'gw', 'rubber', 'of'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },

  // ═══════════════════════════════════════════════════════
  // BONDAGE — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'Bondage', displayName: 'Bondage', description: 'El subreddit principal de bondage. Cuerdas, esposas, contenido de sumisión.', subscribers: 772000, over18: true, niches: ['bondage', 'rope', 'restraint', 'submission'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },

  // ═══════════════════════════════════════════════════════
  // SMOKING — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'smokingfetish', displayName: 'Smoking Fetish', description: 'El subreddit de fetichismo de fumar principal. Activo y específico del nicho.', subscribers: 150000, over18: true, niches: ['smoking', 'cigarette', 'fetish'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },

  // ═══════════════════════════════════════════════════════
  // BBW — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'BBW', displayName: 'BBW', description: 'El subreddit BBW más grande. Amigable para creadores.', subscribers: 1092000, over18: true, niches: ['bbw', 'plus', 'big', 'curvy', 'of'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'BBWGW', displayName: 'BBW Gone Wild', description: 'BBW GoneWild. Fuerte presencia de amateurs y creadores.', subscribers: 214000, over18: true, niches: ['bbw', 'gw', 'plus', 'of'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },

  // ═══════════════════════════════════════════════════════
  // GOTH / ALT — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'gothsluts', displayName: 'Goth Sluts', description: 'Subreddit goth NSFW masivo. Uno de los subs de fetiche que más crece en Reddit.', subscribers: 2679000, over18: true, niches: ['goth', 'alt', 'dark', 'nsfw', 'of'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'gothgirls', displayName: 'Goth Girls', description: 'Apreciación goth. Buen embudo para conversión a OF.', subscribers: 393000, over18: true, niches: ['goth', 'girls', 'alt', 'dark'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'AltGirls', displayName: 'Alt Girls', description: 'Chicas alternativas: tattoos, piercings, cabello colorido. Bueno para creadoras alt.', subscribers: 245000, over18: true, niches: ['alt', 'tattoo', 'piercing', 'alternative'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },

  // ═══════════════════════════════════════════════════════
  // HOTWIFE — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'Hotwife', displayName: 'Hotwife', description: 'El subreddit principal de lifestyle hotwife. Masivo y creciendo rápido.', subscribers: 1961000, over18: true, niches: ['hotwife', 'shared', 'lifestyle', 'couple'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'cuckold', displayName: 'Cuckold', description: 'Contenido cuckold/hotwife. Audiencia enorme.', subscribers: 2178000, over18: true, niches: ['cuckold', 'cuck', 'hotwife', 'lifestyle'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },

  // ═══════════════════════════════════════════════════════
  // ONLYFANS PROMO — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'OnlyFans101', displayName: 'OnlyFans 101', description: 'El subreddit de promo de OF más grande. Esencial para todos los creadores.', subscribers: 2924000, over18: true, niches: ['onlyfans', 'promo', 'of', 'creator'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'NSFWverifiedamateurs', displayName: 'NSFW Verified Amateurs', description: 'Contenido amateur verificado. Bueno para descubrimiento de OF.', subscribers: 1376000, over18: true, niches: ['onlyfans', 'amateur', 'verified', 'of'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'onlyfansadvice', displayName: 'OnlyFans Advice', description: 'Educación + networking para creadores. Imprescindible para estrategia.', subscribers: 554000, over18: true, niches: ['onlyfans', 'advice', 'tips', 'creator'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'OnlyFansPromo', displayName: 'OnlyFans Promo', description: 'Autopromoción dedicada de OF.', subscribers: 94000, over18: true, niches: ['onlyfans', 'promo', 'self-promo', 'of'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },

  // ═══════════════════════════════════════════════════════
  // JOI — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'joi', displayName: 'JOI', description: 'El subreddit principal de Jerk Off Instruction. Muy activo. Excelente para creadoras de OF.', subscribers: 549000, over18: true, niches: ['joi', 'instruction', 'femdom', 'edging', 'of'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },

  // ═══════════════════════════════════════════════════════
  // CHASTITY — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'chastity', displayName: 'Chastity', description: 'El subreddit de castidad principal. El kink que más crece.', subscribers: 486000, over18: true, niches: ['chastity', 'keyholding', 'denial', 'femdom'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'chastitytraining', displayName: 'Chastity Training', description: 'Entrenamiento de castidad y keyholding.', subscribers: 143000, over18: true, niches: ['chastity', 'training', 'keyholding', 'of'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },

  // ═══════════════════════════════════════════════════════
  // THICK / CURVY — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'Thick', displayName: 'Thick', description: 'Comunidad de chicas thick/curvy. Muy activa.', subscribers: 850000, over18: true, niches: ['thick', 'curvy', 'body', 'of'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },

  // ═══════════════════════════════════════════════════════
  // PETITE — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'petite', displayName: 'Petite', description: 'Comunidad para chicas petite. Audiencia dedicada.', subscribers: 620000, over18: true, niches: ['petite', 'small', 'tiny', 'body'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },

  // ═══════════════════════════════════════════════════════
  // MILF — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'Milfie', displayName: 'Milfie', description: 'Comunidad MILF activa. Excelente para creadoras 30+.', subscribers: 340000, over18: true, niches: ['milf', 'mature', 'mom', 'of'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },

  // ═══════════════════════════════════════════════════════
  // GONEWILD VARIANTS — Active communities
  // ═══════════════════════════════════════════════════════
  { name: 'gonewild', displayName: 'Gone Wild', description: 'El subreddit GW original. Audiencia masiva.', subscribers: 4100000, over18: true, niches: ['gw', 'gonewild', 'nude', 'selfie'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
  { name: 'gonewild30plus', displayName: 'Gone Wild 30+', description: 'GW para mujeres 30+. Comunidad dedicada.', subscribers: 180000, over18: true, niches: ['gw', 'mature', 'milf', '30plus'], allowPromo: null, requiresVerify: null, postLimit: null, promoDays: null },
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
