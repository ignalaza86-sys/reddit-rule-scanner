export interface DemoSubreddit {
  name: string;
  displayName: string;
  description: string;
  subscribers: number;
  over18: boolean;
  niches: string[];
}

export const ALL_SUBREDDITS: DemoSubreddit[] = [
  // FEET — Verified active 2025
  { name: 'VerifiedFeet', displayName: 'Verified Feet', description: 'High-quality verified foot models, close-ups & POV. Verification required. Popular with OF creators.', subscribers: 514000, over18: true, niches: ['feet', 'foot', 'verified', 'of'] },
  { name: 'Feet_NSFW', displayName: 'Feet NSFW', description: 'Fully NSFW foot fetish content. Open posting schedule for creators.', subscribers: 495000, over18: true, niches: ['feet', 'foot', 'nsfw'] },
  { name: 'feet', displayName: 'Feet', description: 'Largest foot fetish community on Reddit. Strict karma & verification rules but huge audience.', subscribers: 485000, over18: true, niches: ['feet', 'foot', 'soles', 'toes'] },
  { name: 'FootFetish', displayName: 'Foot Fetish', description: 'Active foot fetish community. Allows OF watermarks. Great for creators.', subscribers: 464000, over18: true, niches: ['feet', 'foot', 'fetish', 'of'] },

  // FINDOM — Verified active 2025
  { name: 'findom', displayName: 'Financial Domination', description: 'The main findom hub. Verification pinned. Active daily. High spending audience.', subscribers: 210000, over18: true, niches: ['findom', 'financial', 'domination', 'money'] },
  { name: 'paypigsupportgroup', displayName: 'Paypig Support Group', description: 'Paypig-focused findom community. Sister sub to findom. Active tributing.', subscribers: 107000, over18: true, niches: ['findom', 'paypig', 'tribute'] },
  { name: 'Sexsells', displayName: 'Sex Sells', description: 'General NSFW marketplace. Findom promo, custom content, high buyer intent.', subscribers: 849000, over18: true, niches: ['findom', 'selling', 'custom', 'marketplace', 'of'] },

  // COSPLAY — Verified active 2025
  { name: 'cosplaygirls', displayName: 'Cosplay Girls', description: 'Massive community for female cosplayers. Allows OF links in comments.', subscribers: 1905000, over18: true, niches: ['cosplay', 'girls', 'costume', 'of'] },
  { name: 'nsfwcosplay', displayName: 'NSFW Cosplay', description: 'Largest nude cosplay subreddit. Verification required. +21K new members/month.', subscribers: 1677000, over18: true, niches: ['cosplay', 'nsfw', 'nude', 'costume'] },
  { name: 'CosplayLewd', displayName: 'Cosplay Lewd', description: 'Lewd/erotic cosplay showcase. Created by ero-cosplayers. Good for OF promo.', subscribers: 573000, over18: true, niches: ['cosplay', 'lewd', 'erotic', 'of'] },

  // ASMR — Verified active 2025
  { name: 'GoneWildAudio', displayName: 'Gone Wild Audio', description: 'Erotic audio, ASMR, moans, dirty talk. The dominant NSFW audio sub. Huge audience for voice creators.', subscribers: 2160000, over18: true, niches: ['asmr', 'audio', 'voice', 'moan', 'dirty talk'] },
  { name: 'dirtypenpals', displayName: 'Dirty Pen Pals', description: 'Text-based erotic roleplay & audio scripts. Good for writers & voice creators.', subscribers: 739000, over18: true, niches: ['asmr', 'audio', 'roleplay', 'script', 'writing'] },

  // FEMDOM — Verified active 2025
  { name: 'Femdom', displayName: 'Femdom', description: 'The main femdom subreddit. +11.6K new/month. Content-focused, allows creator posts.', subscribers: 828000, over18: true, niches: ['femdom', 'domination', 'mistress', 'of'] },
  { name: 'BDSM', displayName: 'BDSM', description: 'Largest BDSM community on Reddit. Broad reach for femdom, bondage, and kink creators.', subscribers: 1398000, over18: true, niches: ['femdom', 'bdsm', 'bondage', 'kink'] },
  { name: 'femdomcommunity', displayName: 'Femdom Community', description: 'Discussion and content for femdom lifestyle. Good engagement for creators.', subscribers: 200000, over18: true, niches: ['femdom', 'community', 'lifestyle'] },

  // LINGERIE — Verified active 2025
  { name: 'lingerie', displayName: 'Lingerie', description: 'The primary lingerie subreddit. +8.2K new/month. Mix of SFW/NSFW. Good OF conversion.', subscribers: 806000, over18: true, niches: ['lingerie', 'underwear', 'sexy', 'of'] },
  { name: 'gonewildcurvy', displayName: 'Gone Wild Curvy', description: 'Curvy women in lingerie/undress. Body-positive. Strong OF creator presence.', subscribers: 704000, over18: true, niches: ['lingerie', 'curvy', 'thick', 'of'] },

  // LATEX — Verified active 2025
  { name: 'latexfetish', displayName: 'Latex Fetish', description: 'Dedicated latex/rubber fetish content. Active community for latex OF creators.', subscribers: 137000, over18: true, niches: ['latex', 'rubber', 'fetish', 'shiny'] },
  { name: 'Gonewild_latex', displayName: 'Gone Wild Latex', description: 'GW-style latex content. +2.4K new/month. Creator-friendly posting rules.', subscribers: 53000, over18: true, niches: ['latex', 'gw', 'rubber', 'of'] },

  // BONDAGE — Verified active 2025
  { name: 'Bondage', displayName: 'Bondage', description: 'The main bondage subreddit. +6.7K new/month. Ropes, cuffs, submission content.', subscribers: 772000, over18: true, niches: ['bondage', 'rope', 'restraint', 'submission'] },

  // SMOKING — Verified active 2025
  { name: 'smokingfetish', displayName: 'Smoking Fetish', description: 'The primary smoking fetish sub. +3.6K new/month. Active and niche-specific.', subscribers: 150000, over18: true, niches: ['smoking', 'cigarette', 'fetish'] },

  // BBW — Verified active 2025
  { name: 'BBW', displayName: 'BBW', description: 'The biggest BBW subreddit. +15.5K new/month. 218K weekly visitors. Creator-friendly.', subscribers: 1092000, over18: true, niches: ['bbw', 'plus', 'big', 'curvy', 'of'] },
  { name: 'BBWGW', displayName: 'BBW Gone Wild', description: 'BBW GoneWild. Verification required. Strong amateur/creator presence.', subscribers: 214000, over18: true, niches: ['bbw', 'gw', 'plus', 'of'] },

  // GOTH — Verified active 2025
  { name: 'gothsluts', displayName: 'Goth Sluts', description: 'Massive goth NSFW sub. +44.8K new/month. One of the fastest-growing fetish subs on Reddit.', subscribers: 2679000, over18: true, niches: ['goth', 'alt', 'dark', 'nsfw', 'of'] },
  { name: 'gothgirls', displayName: 'Goth Girls', description: 'SFW-leaning goth appreciation. Good funnel for OF conversion.', subscribers: 393000, over18: true, niches: ['goth', 'girls', 'alt', 'dark'] },

  // HOTWIFE — Verified active 2025
  { name: 'Hotwife', displayName: 'Hotwife', description: 'The main hotwife lifestyle sub. +27.5K new/month. Massive and growing fast.', subscribers: 1961000, over18: true, niches: ['hotwife', 'shared', 'lifestyle', 'couple'] },
  { name: 'cuckold', displayName: 'Cuckold', description: 'Cuckold/hotwife content. Huge audience. Creator content welcome.', subscribers: 2178000, over18: true, niches: ['cuckold', 'cuck', 'hotwife', 'lifestyle'] },

  // ONLYFANS PROMO — Verified active 2025
  { name: 'OnlyFans101', displayName: 'OnlyFans 101', description: 'The largest OF promo sub. +42.4K new/month. Essential for all creators.', subscribers: 2924000, over18: true, niches: ['onlyfans', 'promo', 'of', 'creator'] },
  { name: 'NSFWverifiedamateurs', displayName: 'NSFW Verified Amateurs', description: 'Verified amateur content. Great for OF discovery and building audience.', subscribers: 1376000, over18: true, niches: ['onlyfans', 'amateur', 'verified', 'of'] },
  { name: 'onlyfansadvice', displayName: 'OnlyFans Advice', description: 'Creator education + networking. +9.9K new/month. Must-join for strategy.', subscribers: 554000, over18: true, niches: ['onlyfans', 'advice', 'tips', 'creator'] },
  { name: 'OnlyFansPromo', displayName: 'OnlyFans Promo', description: 'Dedicated OF self-promotion. Focused community for posting your links.', subscribers: 94000, over18: true, niches: ['onlyfans', 'promo', 'self-promo', 'of'] },

  // JOI — Verified active 2025
  { name: 'joi', displayName: 'JOI', description: 'The main Jerk Off Instruction sub. +9.4K new/month. Very active. Great for OF creators.', subscribers: 549000, over18: true, niches: ['joi', 'instruction', 'femdom', 'edging', 'of'] },

  // CHASTITY — Verified active 2025 (fastest growing!)
  { name: 'chastity', displayName: 'Chastity', description: 'The main chastity subreddit. +13K new/month. Called "fetish of 2025". Fastest-growing kink.', subscribers: 486000, over18: true, niches: ['chastity', 'keyholding', 'denial', 'femdom'] },
  { name: 'chastitytraining', displayName: 'Chastity Training', description: 'Chastity training & keyholding. Active community for creators selling chastity content.', subscribers: 143000, over18: true, niches: ['chastity', 'training', 'keyholding', 'of'] },
];
