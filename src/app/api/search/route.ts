import { NextRequest, NextResponse } from 'next/server';

// Comprehensive demo data organized by niche
const ALL_SUBREDDITS: any[] = [
  // FEET
  { name: 'feet', displayName: 'Feet 👣', description: 'A community for foot lovers. Share your favorite content!', subscribers: 1250000, over18: true, niches: ['feet', 'foot', 'pies'] },
  { name: 'FootFetish', displayName: 'Foot Fetish', description: 'The original foot fetish community on Reddit. All foot content welcome.', subscribers: 890000, over18: true, niches: ['feet', 'foot', 'fetish'] },
  { name: 'feetpics', displayName: 'Feet Pics', description: 'Quality feet pictures. Original content encouraged!', subscribers: 345000, over18: true, niches: ['feet', 'foot', 'pics'] },
  { name: 'FeetInYourFace', displayName: 'Feet In Your Face', description: 'Close-up feet content. POV and sole shots.', subscribers: 234000, over18: true, niches: ['feet', 'foot', 'pov', 'soles'] },
  { name: 'cutefeet', displayName: 'Cute Feet', description: 'Adorable feet content. Clean and aesthetic.', subscribers: 156000, over18: true, niches: ['feet', 'foot', 'cute'] },
  { name: 'FeetToes', displayName: 'Feet & Toes', description: 'Focus on toes and soles. High quality content.', subscribers: 198000, over18: true, niches: ['feet', 'toes', 'soles'] },
  { name: 'soles', displayName: 'Soles', description: 'Dedicated to soles. Top and bottom views.', subscribers: 267000, over18: true, niches: ['feet', 'soles', 'foot'] },
  { name: 'paintedtoes', displayName: 'Painted Toes', description: 'Toenail polish and painted toes appreciation.', subscribers: 89000, over18: true, niches: ['feet', 'toes', 'nails', 'pedicure'] },
  { name: 'feetvideos', displayName: 'Feet Videos', description: 'Video content featuring feet. Clips and full videos.', subscribers: 45000, over18: true, niches: ['feet', 'video', 'foot'] },
  { name: 'footworship', displayName: 'Foot Worship', description: 'Foot worship and domination content. Femdom focused.', subscribers: 178000, over18: true, niches: ['feet', 'worship', 'femdom', 'domination'] },
  { name: 'GirlFeet', displayName: 'Girl Feet', description: 'Female feet appreciation. OC and verified creators welcome.', subscribers: 312000, over18: true, niches: ['feet', 'girls', 'foot'] },
  { name: 'FeetOnlyFans', displayName: 'Feet OnlyFans', description: 'Promote your OnlyFans feet content here. Self-promo allowed with verification.', subscribers: 67000, over18: true, niches: ['feet', 'onlyfans', 'promo'] },
  { name: 'PedicureContent', displayName: 'Pedicure Content', description: 'Pedicured feet and nail art. Fresh pedis only!', subscribers: 34000, over18: true, niches: ['feet', 'pedicure', 'nails', 'toes'] },
  { name: 'ShoeDangling', displayName: 'Shoe Dangling', description: 'Shoe dangling, dipping and play. Heels and flats.', subscribers: 28000, over18: true, niches: ['feet', 'shoes', 'dangling', 'heels'] },
  { name: 'DirtyFeet', displayName: 'Dirty Feet', description: 'Muddy, messy and dirty feet content.', subscribers: 42000, over18: true, niches: ['feet', 'dirty', 'messy'] },
  { name: 'FeetJOI', displayName: 'Feet JOI', description: 'Foot-focused jerk off instructions. Dominant feet.', subscribers: 56000, over18: true, niches: ['feet', 'joi', 'femdom', 'instruction'] },

  // FINDOM
  { name: 'findom', displayName: 'Financial Domination', description: 'The original findom community. Pay pigs and cash cows welcome.', subscribers: 456000, over18: true, niches: ['findom', 'financial', 'domination', 'money'] },
  { name: 'FinDomBrat', displayName: 'Findom Brat', description: 'Bratty findom content. You know you want to pay.', subscribers: 123000, over18: true, niches: ['findom', 'brat', 'financial'] },
  { name: 'paypigs', displayName: 'Pay Pigs', description: 'Financial submission and domination. Tribute required.', subscribers: 89000, over18: true, niches: ['findom', 'paypig', 'tribute', 'submission'] },
  { name: 'FindomHumiliation', displayName: 'Findom Humiliation', description: 'Humiliation + financial domination. Know your place.', subscribers: 67000, over18: true, niches: ['findom', 'humiliation', 'degradation'] },
  { name: 'GoddessWorship', displayName: 'Goddess Worship', description: 'Worship and tribute your goddess. Findom and femdom combined.', subscribers: 134000, over18: true, niches: ['findom', 'goddess', 'worship', 'femdom'] },
  { name: 'OnlyFansFindom', displayName: 'OnlyFans Findom', description: 'Findom creators on OnlyFans. Self-promo allowed.', subscribers: 45000, over18: true, niches: ['findom', 'onlyfans', 'promo'] },
  { name: 'CryptoFindom', displayName: 'Crypto Findom', description: 'Financial domination with crypto. Bitcoin tributes.', subscribers: 18000, over18: true, niches: ['findom', 'crypto', 'bitcoin'] },
  { name: 'FindomFeet', displayName: 'Findom Feet', description: 'Where findom meets foot fetish. Pay to worship feet.', subscribers: 32000, over18: true, niches: ['findom', 'feet', 'foot', 'worship'] },

  // COSPLAY
  { name: 'cosplay', displayName: 'Cosplay', description: 'The main cosplay community. All skill levels welcome.', subscribers: 2300000, over18: false, niches: ['cosplay', 'costume', 'character'] },
  { name: 'cosplaygirls', displayName: 'Cosplay Girls', description: 'Female cosplay content. SFW and NSFW cosplay.', subscribers: 890000, over18: true, niches: ['cosplay', 'girls', 'costume'] },
  { name: 'nsfwcosplay', displayName: 'NSFW Cosplay', description: 'Adult cosplay content. Your favorite characters like never before.', subscribers: 567000, over18: true, niches: ['cosplay', 'nsfw', 'adult', 'costume'] },
  { name: 'CosplayButts', displayName: 'Cosplay Butts', description: 'Cosplay with a focus on the backside. NSFW.', subscribers: 234000, over18: true, niches: ['cosplay', 'butt', 'ass'] },
  { name: 'CosplayBoobs', displayName: 'Cosplay Boobs', description: 'Cosplay featuring cleavage and more. NSFW.', subscribers: 345000, over18: true, niches: ['cosplay', 'boobs', 'cleavage'] },
  { name: 'OnlyFansCosplay', displayName: 'OnlyFans Cosplay', description: 'Promote your cosplay OnlyFans content. Self-promo welcome!', subscribers: 78000, over18: true, niches: ['cosplay', 'onlyfans', 'promo'] },
  { name: 'CosplayFindom', displayName: 'Cosplay Findom', description: 'Cosplay goddesses doing findom. Character tributes.', subscribers: 22000, over18: true, niches: ['cosplay', 'findom', 'goddess'] },

  // ASMR
  { name: 'asmr', displayName: 'ASMR', description: 'The main ASMR community. Relax and tingle.', subscribers: 3400000, over18: false, niches: ['asmr', 'relax', 'whisper', 'tingle'] },
  { name: 'ASMRGirls', displayName: 'ASMR Girls', description: 'Female ASMR content. Whisper and relax.', subscribers: 123000, over18: false, niches: ['asmr', 'girls', 'whisper'] },
  { name: 'nsfwasmr', displayName: 'NSFW ASMR', description: 'Adult ASMR content. Moans, whispers and more.', subscribers: 234000, over18: true, niches: ['asmr', 'nsfw', 'adult', 'moan'] },
  { name: 'ASMROnlyFans', displayName: 'ASMR OnlyFans', description: 'ASMR creators on OnlyFans. Promote your content!', subscribers: 45000, over18: true, niches: ['asmr', 'onlyfans', 'promo'] },
  { name: 'FeetASMR', displayName: 'Feet ASMR', description: 'ASMR with feet focus. Sole sounds and foot whispers.', subscribers: 19000, over18: true, niches: ['asmr', 'feet', 'foot', 'soles'] },
  { name: 'MouthSoundsASMR', displayName: 'Mouth Sounds ASMR', description: 'Mouth sound ASMR content. Tongue clicks and whispers.', subscribers: 56000, over18: false, niches: ['asmr', 'mouth', 'sounds', 'tongue'] },

  // FEMDOM
  { name: 'femdom', displayName: 'Female Domination', description: 'The main femdom community. Women in charge.', subscribers: 567000, over18: true, niches: ['femdom', 'domination', 'mistress'] },
  { name: 'FemdomCommunity', displayName: 'Femdom Community', description: 'Discussion and content about female domination.', subscribers: 234000, over18: true, niches: ['femdom', 'community', 'domination'] },
  { name: 'femdomgonewild', displayName: 'Femdom Gone Wild', description: 'Original femdom content from real dominas.', subscribers: 178000, over18: true, niches: ['femdom', 'oc', 'domina'] },
  { name: 'Dominatrix', displayName: 'Dominatrix', description: 'Professional and lifestyle dominatrix content.', subscribers: 89000, over18: true, niches: ['femdom', 'dominatrix', 'pro'] },
  { name: 'FemdomFeet', displayName: 'Femdom Feet', description: 'Foot domination. Trampling, worship and humiliation.', subscribers: 67000, over18: true, niches: ['femdom', 'feet', 'foot', 'worship'] },
  { name: 'Pegging', displayName: 'Pegging', description: 'Pegging content. Strap-on play and more.', subscribers: 234000, over18: true, niches: ['femdom', 'pegging', 'strapon'] },
  { name: 'Chastity', displayName: 'Chastity', description: 'Male chastity and keyholding. Locked up for your goddess.', subscribers: 145000, over18: true, niches: ['femdom', 'chastity', 'keyholding', 'denial'] },
  { name: 'JOI', displayName: 'Jerk Off Instructions', description: 'Instructional content. Follow her commands.', subscribers: 345000, over18: true, niches: ['femdom', 'joi', 'instruction', 'edging'] },
  { name: 'Edging', displayName: 'Edging', description: 'Edging and orgasm control. Don\'t you dare finish.', subscribers: 189000, over18: true, niches: ['femdom', 'edging', 'denial', 'control'] },

  // LINGERIE
  { name: 'lingerie', displayName: 'Lingerie', description: 'Beautiful lingerie on beautiful people. SFW and NSFW.', subscribers: 890000, over18: true, niches: ['lingerie', 'underwear', 'sexy'] },
  { name: 'LingerieGW', displayName: 'Lingerie Gone Wild', description: 'Original lingerie content. Show off your collection!', subscribers: 345000, over18: true, niches: ['lingerie', 'oc', 'gw'] },
  { name: 'OnlyFansLingerie', displayName: 'OnlyFans Lingerie', description: 'Lingerie creators on OnlyFans. Self-promo allowed.', subscribers: 56000, over18: true, niches: ['lingerie', 'onlyfans', 'promo'] },
  { name: 'Stockings', displayName: 'Stockings & Nylons', description: 'Stockings, pantyhose and nylons content.', subscribers: 78000, over18: true, niches: ['lingerie', 'stockings', 'nylons', 'pantyhose'] },

  // ROLEPLAY
  { name: 'roleplay', displayName: 'Roleplay', description: 'The main roleplay community. All scenarios welcome.', subscribers: 234000, over18: true, niches: ['roleplay', 'rp', 'scenario'] },
  { name: 'DirtyRoleplay', displayName: 'Dirty Roleplay', description: 'Adult roleplay scenarios. Kink-friendly.', subscribers: 156000, over18: true, niches: ['roleplay', 'dirty', 'adult', 'kink'] },
  { name: 'Roleplaykik', displayName: 'Roleplay Partners', description: 'Find roleplay partners. All orientations and kinks.', subscribers: 89000, over18: true, niches: ['roleplay', 'partner', 'kik'] },
  { name: 'GiantessPOV', displayName: 'Giantess POV', description: 'Giantess and size play content from a POV perspective.', subscribers: 34000, over18: true, niches: ['roleplay', 'giantess', 'size', 'pov'] },

  // LATEX
  { name: 'latex', displayName: 'Latex', description: 'Latex fashion and fetish. Shiny and tight.', subscribers: 234000, over18: true, niches: ['latex', 'rubber', 'shiny'] },
  { name: 'LatexFetish', displayName: 'Latex Fetish', description: 'Latex fetish content. Full body suits, masks, and more.', subscribers: 123000, over18: true, niches: ['latex', 'fetish', 'catsuit'] },
  { name: 'girlsinyogapants', displayName: 'Girls in Yoga Pants', description: 'Tight yoga pants and leggings content.', subscribers: 567000, over18: true, niches: ['yoga', 'leggings', 'tight'] },

  // BONDAGE
  { name: 'bondage', displayName: 'Bondage', description: 'The main bondage community. Ropes, cuffs, and more.', subscribers: 345000, over18: true, niches: ['bondage', 'rope', 'restraint'] },
  { name: 'BondageGW', displayName: 'Bondage Gone Wild', description: 'Original bondage content. Tied up and loving it.', subscribers: 178000, over18: true, niches: ['bondage', 'oc', 'tied'] },
  { name: 'shibari', displayName: 'Shibari', description: 'Japanese rope bondage. Art and kink combined.', subscribers: 234000, over18: true, niches: ['bondage', 'shibari', 'rope', 'art'] },
  { name: 'ropetied', displayName: 'Rope Tied', description: 'Rope bondage content. Professional and amateur.', subscribers: 89000, over18: true, niches: ['bondage', 'rope', 'tied'] },
  { name: 'SensoryDeprivation', displayName: 'Sensory Deprivation', description: 'Sensory deprivation and restriction play. Blindfolds, hoods and mummification.', subscribers: 23000, over18: true, niches: ['bondage', 'sensory', 'deprivation', 'blindfold'] },

  // SMOKING
  { name: 'SmokingFetish', displayName: 'Smoking Fetish', description: 'Smoking content. Cigarettes, cigars and vape.', subscribers: 78000, over18: true, niches: ['smoking', 'cigarette', 'fetish'] },
  { name: 'CigaretteGoddess', displayName: 'Cigarette Goddess', description: 'Goddess smoking content. Dominant smokers.', subscribers: 34000, over18: true, niches: ['smoking', 'femdom', 'goddess'] },

  // BODY / FITNESS
  { name: 'fitgirls', displayName: 'Fit Girls', description: 'Fit and athletic women. Gym content welcome.', subscribers: 456000, over18: true, niches: ['fitness', 'gym', 'fit', 'body'] },
  { name: 'thick', displayName: 'Thick', description: 'Curvy and thick content. All shapes welcome.', subscribers: 890000, over18: true, niches: ['thick', 'curvy', 'body'] },
  { name: 'BBW', displayName: 'BBW', description: 'Big beautiful women. Plus size content.', subscribers: 567000, over18: true, niches: ['bbw', 'plus', 'big', 'body'] },
  { name: 'petite', displayName: 'Petite', description: 'Petite and small women content.', subscribers: 345000, over18: true, niches: ['petite', 'small', 'tiny', 'body'] },
  { name: 'tallgirls', displayName: 'Tall Girls', description: 'Tall women appreciation. Amazon energy.', subscribers: 45000, over18: true, niches: ['tall', 'amazon', 'body'] },

  // TATTOOS / ALT
  { name: 'tattooedgirls', displayName: 'Tattooed Girls', description: 'Ink and skin. Tattooed and pierced content.', subscribers: 234000, over18: true, niches: ['tattoo', 'ink', 'alt', 'piercing'] },
  { name: 'altgirls', displayName: 'Alt Girls', description: 'Alternative girls. Emo, goth, punk and more.', subscribers: 178000, over18: true, niches: ['alt', 'goth', 'emo', 'punk'] },
  { name: 'GothGirls', displayName: 'Goth Girls', description: 'Goth and dark aesthetic. Spooky and sexy.', subscribers: 123000, over18: true, niches: ['goth', 'dark', 'alt'] },

  // HAIR
  { name: 'hairfetish', displayName: 'Hair Fetish', description: 'Hair play, washing and styling content.', subscribers: 34000, over18: true, niches: ['hair', 'fetish', 'washing'] },

  // ONLYFANS / PROMO
  { name: 'OnlyFansPromotions', displayName: 'OnlyFans Promotions', description: 'The main OnlyFans promo subreddit. Post your links!', subscribers: 234000, over18: true, niches: ['onlyfans', 'promo', 'promotion'] },
  { name: 'OnlyFansReviews', displayName: 'OnlyFans Reviews', description: 'Reviews of OnlyFans accounts. Know before you buy.', subscribers: 89000, over18: true, niches: ['onlyfans', 'review', 'rating'] },
  { name: 'OnlyFans101', displayName: 'OnlyFans 101', description: 'Tips and tricks for OnlyFans creators. Learn the game.', subscribers: 167000, over18: true, niches: ['onlyfans', 'tips', 'advice', 'creator'] },

  // HOTWIFE / CUCKOLD
  { name: 'hotwife', displayName: 'Hotwife', description: 'Hotwife lifestyle content. Shared wives.', subscribers: 567000, over18: true, niches: ['hotwife', 'shared', 'lifestyle'] },
  { name: 'cuckold', displayName: 'Cuckold', description: 'Cuckold content and discussion.', subscribers: 345000, over18: true, niches: ['cuckold', 'cuck', 'lifestyle'] },

  // BODY PAINT
  { name: 'bodypaint', displayName: 'Body Paint', description: 'Body painting art. Naked canvas creativity.', subscribers: 45000, over18: true, niches: ['bodypaint', 'art', 'paint', 'creative'] },

  // WET / MESSY
  { name: 'wetlook', displayName: 'Wet Look', description: 'Wet clothing and wet hair content. Soaked and sexy.', subscribers: 34000, over18: true, niches: ['wet', 'water', 'messy'] },

  // NAILS / HANDS
  { name: 'nailfetish', displayName: 'Nail Fetish', description: 'Long nails, nail art and manicure content.', subscribers: 28000, over18: true, niches: ['nails', 'manicure', 'hands', 'fetish'] },
  { name: 'handfetish', displayName: 'Hand Fetish', description: 'Beautiful hands and finger content.', subscribers: 19000, over18: true, niches: ['hands', 'fingers', 'fetish'] },
];

function searchSubreddits(query: string, limit: number) {
  const q = query.toLowerCase().trim();
  // Remove r/ prefix if present
  const cleanQ = q.replace(/^\/?r\/+/, '');

  const results: any[] = [];
  const seen = new Set<string>();

  // Priority 1: Exact name match
  for (const sub of ALL_SUBREDDITS) {
    if (sub.name.toLowerCase() === cleanQ && !seen.has(sub.name)) {
      results.push({ ...sub, priority: 1 });
      seen.add(sub.name);
    }
  }

  // Priority 2: Name starts with query
  for (const sub of ALL_SUBREDDITS) {
    if (sub.name.toLowerCase().startsWith(cleanQ) && !seen.has(sub.name)) {
      results.push({ ...sub, priority: 2 });
      seen.add(sub.name);
    }
  }

  // Priority 3: Name contains query
  for (const sub of ALL_SUBREDDITS) {
    if (sub.name.toLowerCase().includes(cleanQ) && !seen.has(sub.name)) {
      results.push({ ...sub, priority: 3 });
      seen.add(sub.name);
    }
  }

  // Priority 4: Niche/tags match
  for (const sub of ALL_SUBREDDITS) {
    if (
      sub.niches?.some((n: string) => n.includes(cleanQ) || cleanQ.includes(n)) &&
      !seen.has(sub.name)
    ) {
      results.push({ ...sub, priority: 4 });
      seen.add(sub.name);
    }
  }

  // Priority 5: Display name or description contains query
  for (const sub of ALL_SUBREDDITS) {
    if (
      (sub.displayName.toLowerCase().includes(cleanQ) || sub.description.toLowerCase().includes(cleanQ)) &&
      !seen.has(sub.name)
    ) {
      results.push({ ...sub, priority: 5 });
      seen.add(sub.name);
    }
  }

  // Sort by priority then by subscribers
  results.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.subscribers - a.subscribers;
  });

  return results.slice(0, limit).map(({ priority, niches, ...sub }) => ({
    ...sub,
    url: `https://reddit.com/r/${sub.name}`,
    iconUrl: null,
  }));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '30');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    // Try Reddit API with realistic headers
    const redditUrl = `https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(query)}&limit=${limit}&sort=relevance`;
    
    const response = await fetch(redditUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (response.ok) {
      const data = await response.json();
      
      const subreddits = data.data.children
        .filter((child: any) => child.kind === 't5')
        .map((child: any) => {
          const sr = child.data;
          return {
            name: sr.display_name,
            displayName: sr.title,
            description: sr.public_description || sr.description?.substring(0, 300),
            subscribers: sr.subscribers || 0,
            over18: sr.over18 || false,
            iconUrl: sr.icon_img || sr.community_icon || null,
            url: `https://reddit.com/r/${sr.display_name}`,
          };
        })
        .sort((a: any, b: any) => b.subscribers - a.subscribers);

      return NextResponse.json({ subreddits, total: subreddits.length, source: 'reddit' });
    }

    // Reddit blocked us — use demo data
    console.log(`Reddit API returned ${response.status}, using demo data for: ${query}`);
    const demoResults = searchSubreddits(query, limit);
    return NextResponse.json({ subreddits: demoResults, total: demoResults.length, source: 'demo' });
  } catch (error: any) {
    console.error('Search error:', error);
    const demoResults = searchSubreddits(query, limit);
    return NextResponse.json({ subreddits: demoResults, total: demoResults.length, source: 'demo' });
  }
}
