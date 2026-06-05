import { NextRequest, NextResponse } from 'next/server';

// Fallback demo data for when Reddit blocks server requests
const DEMO_DATA: Record<string, any[]> = {
  default: [
    { name: 'feet', displayName: 'Feet 👣', description: 'A community for foot lovers. Share your favorite content!', subscribers: 1250000, over18: true },
    { name: 'FootFetish', displayName: 'Foot Fetish', description: 'The original foot fetish community on Reddit. All foot content welcome.', subscribers: 890000, over18: true },
    { name: 'feetpics', displayName: 'Feet Pics', description: 'Quality feet pictures. Original content encouraged!', subscribers: 345000, over18: true },
    { name: 'FeetInYourFace', displayName: 'Feet In Your Face', description: 'Close-up feet content. POV and sole shots.', subscribers: 234000, over18: true },
    { name: 'cutefeet', displayName: 'Cute Feet', description: 'Adorable feet content. Clean and aesthetic.', subscribers: 156000, over18: true },
    { name: 'FeetToes', displayName: 'Feet & Toes', description: 'Focus on toes and soles. High quality content.', subscribers: 198000, over18: true },
    { name: 'soles', displayName: 'Soles', description: 'Dedicated to soles. Top and bottom views.', subscribers: 267000, over18: true },
    { name: 'paintedtoes', displayName: 'Painted Toes', description: 'Toenail polish and painted toes appreciation.', subscribers: 89000, over18: true },
    { name: 'feetvideos', displayName: 'Feet Videos', description: 'Video content featuring feet. Clips and full videos.', subscribers: 45000, over18: true },
    { name: 'footworship', displayName: 'Foot Worship', description: 'Foot worship and domination content. Femdom focused.', subscribers: 178000, over18: true },
    { name: 'GirlFeet', displayName: 'Girl Feet', description: 'Female feet appreciation. OC and verified creators welcome.', subscribers: 312000, over18: true },
    { name: 'FeetOnlyFans', displayName: 'Feet OnlyFans', description: 'Promote your OnlyFans feet content here. Self-promo allowed with verification.', subscribers: 67000, over18: true },
  ],
  findom: [
    { name: 'findom', displayName: 'Financial Domination', description: 'The original findom community. Pay pigs and cash cows welcome.', subscribers: 456000, over18: true },
    { name: 'FinDomBrat', displayName: 'Findom Brat', description: 'Bratty findom content. You know you want to pay.', subscribers: 123000, over18: true },
    { name: 'paypigs', displayName: 'Pay Pigs', description: 'Financial submission and domination. Tribute required.', subscribers: 89000, over18: true },
    { name: 'FindomHumiliation', displayName: 'Findom Humiliation', description: 'Humiliation + financial domination. Know your place.', subscribers: 67000, over18: true },
    { name: 'GoddessWorship', displayName: 'Goddess Worship', description: 'Worship and tribute your goddess. Findom and femdom combined.', subscribers: 134000, over18: true },
    { name: 'OnlyFansFindom', displayName: 'OnlyFans Findom', description: 'Findom creators on OnlyFans. Self-promo allowed.', subscribers: 45000, over18: true },
  ],
  cosplay: [
    { name: 'cosplay', displayName: 'Cosplay', description: 'The main cosplay community. All skill levels welcome.', subscribers: 2300000, over18: false },
    { name: 'cosplaygirls', displayName: 'Cosplay Girls', description: 'Female cosplay content. SFW and NSFW cosplay.', subscribers: 890000, over18: true },
    { name: 'nsfwcosplay', displayName: 'NSFW Cosplay', description: 'Adult cosplay content. Your favorite characters like never before.', subscribers: 567000, over18: true },
    { name: 'CosplayButts', displayName: 'Cosplay Butts', description: 'Cosplay with a focus on the backside. NSFW.', subscribers: 234000, over18: true },
    { name: 'CosplayBoobs', displayName: 'Cosplay Boobs', description: 'Cosplay featuring cleavage and more. NSFW.', subscribers: 345000, over18: true },
    { name: 'OnlyFansCosplay', displayName: 'OnlyFans Cosplay', description: 'Promote your cosplay OnlyFans content. Self-promo welcome!', subscribers: 78000, over18: true },
  ],
  asmr: [
    { name: 'asmr', displayName: 'ASMR', description: 'The main ASMR community. Relax and tingle.', subscribers: 3400000, over18: false },
    { name: 'ASMRGirls', displayName: 'ASMR Girls', description: 'Female ASMR content. Whisper and relax.', subscribers: 123000, over18: false },
    { name: 'nsfwasmr', displayName: 'NSFW ASMR', description: 'Adult ASMR content. Moans, whispers and more.', subscribers: 234000, over18: true },
    { name: 'ASMROnlyFans', displayName: 'ASMR OnlyFans', description: 'ASMR creators on OnlyFans. Promote your content!', subscribers: 45000, over18: true },
  ],
  femdom: [
    { name: 'femdom', displayName: 'Female Domination', description: 'The main femdom community. Women in charge.', subscribers: 567000, over18: true },
    { name: 'FemdomCommunity', displayName: 'Femdom Community', description: 'Discussion and content about female domination.', subscribers: 234000, over18: true },
    { name: 'femdomgonewild', displayName: 'Femdom Gone Wild', description: 'Original femdom content from real dominas.', subscribers: 178000, over18: true },
    { name: 'GoddessWorship', displayName: 'Goddess Worship', description: 'Worship your goddess. Findom and femdom.', subscribers: 134000, over18: true },
    { name: 'Dominatrix', displayName: 'Dominatrix', description: 'Professional and lifestyle dominatrix content.', subscribers: 89000, over18: true },
  ],
  lingerie: [
    { name: 'lingerie', displayName: 'Lingerie', description: 'Beautiful lingerie on beautiful people. SFW and NSFW.', subscribers: 890000, over18: true },
    { name: 'LingerieGW', displayName: 'Lingerie Gone Wild', description: 'Original lingerie content. Show off your collection!', subscribers: 345000, over18: true },
    { name: 'OnlyFansLingerie', displayName: 'OnlyFans Lingerie', description: 'Lingerie creators on OnlyFans. Self-promo allowed.', subscribers: 56000, over18: true },
  ],
  roleplay: [
    { name: 'roleplay', displayName: 'Roleplay', description: 'The main roleplay community. All scenarios welcome.', subscribers: 234000, over18: true },
    { name: 'DirtyRoleplay', displayName: 'Dirty Roleplay', description: 'Adult roleplay scenarios. Kink-friendly.', subscribers: 156000, over18: true },
    { name: 'Roleplaykik', displayName: 'Roleplay Partners', description: 'Find roleplay partners. All orientations and kinks.', subscribers: 89000, over18: true },
  ],
  latex: [
    { name: 'latex', displayName: 'Latex', description: 'Latex fashion and fetish. Shiny and tight.', subscribers: 234000, over18: true },
    { name: 'LatexFetish', displayName: 'Latex Fetish', description: 'Latex fetish content. Full body suits, masks, and more.', subscribers: 123000, over18: true },
    { name: 'girlsinyogapants', displayName: 'Girls in Yoga Pants', description: 'Tight yoga pants and leggings. No latex but same vibe.', subscribers: 567000, over18: true },
  ],
  bondage: [
    { name: 'bondage', displayName: 'Bondage', description: 'The main bondage community. Ropes, cuffs, and more.', subscribers: 345000, over18: true },
    { name: 'BondageGW', displayName: 'Bondage Gone Wild', description: 'Original bondage content. Tied up and loving it.', subscribers: 178000, over18: true },
    { name: 'shibari', displayName: 'Shibari', description: 'Japanese rope bondage. Art and kink combined.', subscribers: 234000, over18: true },
    { name: 'ropetied', displayName: 'Rope Tied', description: 'Rope bondage content. Professional and amateur.', subscribers: 89000, over18: true },
  ],
};

function getDemoResults(query: string) {
  const q = query.toLowerCase().trim();
  // Direct match
  if (DEMO_DATA[q]) return DEMO_DATA[q];
  // Search across all categories
  const results: any[] = [];
  const seen = new Set<string>();
  for (const [, subs] of Object.entries(DEMO_DATA)) {
    for (const sub of subs) {
      if (
        (sub.name.toLowerCase().includes(q) ||
        sub.displayName.toLowerCase().includes(q) ||
        sub.description.toLowerCase().includes(q)) &&
        !seen.has(sub.name)
      ) {
        results.push(sub);
        seen.add(sub.name);
      }
    }
  }
  // If nothing found, return feet results (most popular entry point)
  return results.length > 0 ? results : DEMO_DATA.default;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '15');

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
    const demoResults = getDemoResults(query).slice(0, limit).map((sub: any) => ({
      ...sub,
      url: `https://reddit.com/r/${sub.name}`,
      iconUrl: null,
    }));

    return NextResponse.json({ subreddits: demoResults, total: demoResults.length, source: 'demo' });
  } catch (error: any) {
    console.error('Search error:', error);
    // Fallback to demo data
    const demoResults = getDemoResults(query).slice(0, limit).map((sub: any) => ({
      ...sub,
      url: `https://reddit.com/r/${sub.name}`,
      iconUrl: null,
    }));
    return NextResponse.json({ subreddits: demoResults, total: demoResults.length, source: 'demo' });
  }
}
