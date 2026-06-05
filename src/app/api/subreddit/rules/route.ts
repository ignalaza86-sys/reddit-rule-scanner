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
      { short_name: 'No non-feet content', description: 'All posts must feature feet prominently. If feet are not the main focus, the post will be removed. Full body shots are ok as long as feet are clearly visible and a main element.' },
      { short_name: 'Watermarks allowed but no URLs', description: 'Watermarks with your Reddit username are encouraged to prevent reposts. However, watermarks containing URLs to external sites (OnlyFans, etc.) are not allowed in images.' },
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
      { short_name: 'No scamming or bait-and-switch', description: 'Do not promise content or services and then fail to deliver. This includes promising exclusive content and not providing it after tribute is paid.' },
      { short_name: 'No tribute under minimum', description: 'The minimum tribute amount is set by each Domme. Do not attempt to negotiate or lowball. If you can\'t afford the tribute, move on.' },
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
      { short_name: 'No AI-generated cosplay', description: 'AI-generated images are not considered cosplay and will be removed. Cosplay involves real people wearing real costumes.' },
      { short_name: 'Harassment of cosplayers is bannable', description: 'Sexual or harassing comments toward cosplayers will result in an immediate ban. Cosplay is not consent.' },
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
      { short_name: 'No low-effort cosplay', description: 'The cosplay must be recognizable and show effort. Wearing lingerie alone is not cosplay - you need to be portraying a character.' },
      { short_name: 'No deepfakes or AI nudes', description: 'Deepfake content or AI-generated nudes of real people are strictly prohibited and will result in an immediate permanent ban.' },
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
      { short_name: 'No pay-to-play without verification', description: 'If you offer paid services, you must be verified first. Unverified sellers will be banned immediately.' },
      { short_name: 'Consent is paramount', description: 'All content must depict consensual activities. Any content suggesting non-consent will be removed and reported.' },
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
      { short_name: 'No sexualized comments', description: 'ASMR is not sexual. Any sexual or flirtatious comments toward ASMRtists will be removed and may result in a ban.' },
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
      { short_name: 'No AI-generated latex images', description: 'AI-generated images of latex clothing are not allowed. Only real photos and videos of actual latex.' },
      { short_name: 'Credit designers and makers', description: 'If you\'re wearing latex made by a known designer, credit them in the title or comments.' },
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
      { short_name: 'No suspension without safety discussion', description: 'Suspension posts must include or link to safety information. Unsafe suspension content will be removed.' },
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
      { short_name: 'No selling others\' content', description: 'You may only promote your own OnlyFans. Promoting someone else\'s account is not allowed.' },
      { short_name: 'No excessive watermarking', description: 'Watermarks are allowed but should not cover more than 20% of the image. Huge watermarks will get your post removed.' },
    ],
  },
};

// Smart fallback rules based on subreddit name analysis
function generateFallbackRules(subredditName: string) {
  const name = subredditName.toLowerCase();
  const isNiche: Record<string, string[]> = {
    feet: ['feet', 'foot', 'soles', 'toes', 'pedicure', 'footfetish', 'feetpics', 'footworship'],
    findom: ['findom', 'findom', 'paypig', 'tribute', 'goddess'],
    femdom: ['femdom', 'dominatrix', 'mistress', 'chastity', 'joi', 'edging', 'pegging'],
    cosplay: ['cosplay', 'cosplayer'],
    asmr: ['asmr'],
    bondage: ['bondage', 'shibari', 'ropetied', 'bdsm'],
    latex: ['latex', 'rubber', 'pvc'],
    lingerie: ['lingerie', 'stockings', 'pantyhose', 'nylons'],
    smoking: ['smoking', 'cigarette', 'vape'],
    body: ['thick', 'bbw', 'petite', 'fitgirls', 'tall'],
    alt: ['goth', 'alt', 'tattoo', 'piercing', 'emo'],
    onlyfans: ['onlyfans'],
    hotwife: ['hotwife', 'cuckold'],
  };

  let detectedNiche = 'general';
  for (const [niche, keywords] of Object.entries(isNiche)) {
    if (keywords.some(k => name.includes(k))) {
      detectedNiche = niche;
      break;
    }
  }

  const isNSFW = !['cosplay', 'asmr'].some(safe => name.includes(safe)) || name.includes('nsfw');

  // Base rules that apply to all NSFW/adult communities
  const baseRules = [
    { short_name: 'Verification required for OC', description: 'All original content posters must be verified. Send modmail with verification photos including your username, the subreddit name, and today\'s date.', isKeyRule: true, keyRuleType: 'verification' },
    { short_name: 'Follow Reddit site-wide rules', description: 'All posts must comply with Reddit\'s content policy. No minors, no non-consensual content, no illegal content. Violations result in permanent bans.', isKeyRule: false, keyRuleType: 'other' },
    { short_name: 'Be respectful', description: 'No harassment, hate speech, bullying, or personal attacks. Keep discussions civil and report rule-breaking behavior to the mods.', isKeyRule: false, keyRuleType: 'other' },
    { short_name: 'No doxxing or personal info', description: 'Do not share anyone\'s personal information, real name, location, or other identifying details without their explicit consent.', isKeyRule: false, keyRuleType: 'other' },
  ];

  // Niche-specific rules
  const nicheRules: Record<string, any[]> = {
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
      { short_name: 'No AI-generated images', description: 'AI-generated cosplay images are not allowed. Only real people in real costumes.', isKeyRule: false, keyRuleType: 'other' },
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
    general: [
      { short_name: 'Self-promo rules vary', description: 'Check with moderators about self-promotion rules. Some allow it in comments, others ban it entirely. When in doubt, message the mods first.', isKeyRule: true, keyRuleType: 'promo' },
      { short_name: 'Post limit: check with mods', description: 'Most subreddits limit posting to 1-2 per day. Check the specific limits before posting.', isKeyRule: true, keyRuleType: 'post_limit' },
      { short_name: 'Use appropriate flairs', description: 'All posts should use the correct flair tag. If unsure, check existing posts or ask the mods.', isKeyRule: true, keyRuleType: 'flair' },
      { short_name: 'No low-effort content', description: 'Posts should show effort in quality, composition, and relevance to the community.', isKeyRule: false, keyRuleType: 'other' },
    ],
  };

  const selectedNicheRules = nicheRules[detectedNiche] || nicheRules.general;
  const allRules = [...selectedNicheRules, ...baseRules];

  // Generate summary
  const summaries: Record<string, string> = {
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
    general: 'Comunidad en Reddit. Las reglas de promoción varían — verificá con los moderadores. La mayoría de subreddits NSFW requieren verificación para OC.',
  };

  return {
    rules: allRules,
    niche: detectedNiche,
    isNSFW,
    allowPromo: detectedNiche === 'onlyfans' ? true : detectedNiche === 'asmr' ? false : null,
    requiresVerify: true,
    summaryEs: summaries[detectedNiche] || summaries.general + ' Estas reglas son estimadas — verificá las oficiales en Reddit.',
  };
}

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
      console.log('Reddit API failed, using demo/AI data');
    }

    // Use demo data if Reddit didn't work
    if (!redditWorked || rawRules.length === 0) {
      // Try exact match first, then partial match
      const subLower = subreddit.toLowerCase();
      let demoKey: string | null = null;
      
      // Exact match
      if (DEMO_RULES[subLower]) {
        demoKey = subLower;
      } else {
        // Partial match
        for (const key of Object.keys(DEMO_RULES)) {
          if (key.includes(subLower) || subLower.includes(key)) {
            demoKey = key;
            break;
          }
        }
      }
      
      if (demoKey) {
        const demo = DEMO_RULES[demoKey];
        subData = { ...demo.about, display_name: subreddit };
        rawRules = demo.rules;
      } else {
        // No demo rules — use smart fallback
        subData = { title: `r/${subreddit}`, subscribers: 0, over18: true, public_description: `Community r/${subreddit} on Reddit.` };
        rawRules = []; // Will be filled by AI or fallback
      }
    }

    // Extract rules from Reddit/demo data
    const extractedRules = rawRules.map((rule: any) => ({
      name: rule.short_name || 'Regla sin nombre',
      textOriginal: rule.description || '',
      category: rule.violation_reason || 'General',
    }));

    // If we have rules from Reddit or demo, use AI to translate
    let aiResult: any = null;
    
    if (extractedRules.length > 0) {
      try {
        const zai = await ZAI.create();
        const rulesText = extractedRules
          .map((r: any, i: number) => `Rule ${i + 1}: "${r.name}"\n${r.textOriginal}`)
          .join('\n\n---\n\n');

        const aiPrompt = `Sos un experto en Reddit y creadores de contenido de OnlyFans. Analizá las siguientes reglas de un subreddit y:

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

        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: 'Sos un asistente experto en Reddit y OnlyFans. Respondé SOLO en JSON válido, sin markdown ni backticks.' },
            { role: 'user', content: aiPrompt },
          ],
          temperature: 0.3,
        });

        const content = completion.choices[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch (e) {
        console.error('AI translation failed, using fallback:', e);
        aiResult = null;
      }

      // If AI worked, use the results
      if (aiResult?.rules?.length > 0) {
        // AI translation succeeded — save to DB
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

        const savedRules = await db.rule.findMany({
          where: { subredditId: savedSub.id },
        });

        return NextResponse.json({
          subreddit: savedSub,
          rules: savedRules,
          summaryEs: aiResult?.summaryEs || '',
          cached: false,
        });
      }

      // AI failed — do a simple translation without AI for the rules we have
      const fallbackTranslated = extractedRules.map((rule: any) => ({
        name: rule.name,
        textOriginal: rule.textOriginal,
        textEs: rule.textOriginal, // Keep original as fallback
        isKeyRule: false,
        keyRuleType: 'other' as const,
        aiExplanation: '',
      }));

      const upsertData = {
        name: subreddit.toLowerCase(),
        displayName: subData.title || subData.display_name || subreddit,
        description: subData.public_description || subData.description?.substring(0, 500) || '',
        subscribers: subData.subscribers || 0,
        over18: subData.over18 || false,
        allowPromo: null,
        requiresVerify: null,
        postLimit: null,
        promoDays: null,
        iconUrl: subData.icon_img || subData.community_icon || null,
      };

      const savedSub = await db.subreddit.upsert({
        where: { name: subreddit.toLowerCase() },
        update: upsertData,
        create: upsertData,
      });

      await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
      
      for (const rule of fallbackTranslated) {
        await db.rule.create({
          data: {
            subredditId: savedSub.id,
            ruleName: rule.name,
            ruleTextOriginal: rule.textOriginal,
            ruleTextEs: rule.textEs,
            category: rule.keyRuleType,
            isKeyRule: rule.isKeyRule,
            keyRuleType: rule.keyRuleType,
            aiExplanation: rule.aiExplanation,
          },
        });
      }

      const savedRules = await db.rule.findMany({
        where: { subredditId: savedSub.id },
      });

      return NextResponse.json({
        subreddit: savedSub,
        rules: savedRules,
        summaryEs: 'Reglas cargadas desde datos de demostración. La traducción con IA no estuvo disponible — las reglas se muestran en su idioma original.',
        cached: false,
      });
    }

    // No rules from Reddit or demo — try AI generation first, then smart fallback
    try {
      const zai = await ZAI.create();
      const aiPrompt = `Sos un experto en Reddit y creadores de contenido de OnlyFans. Un usuario quiere conocer las reglas del subreddit r/${subreddit}, pero no pudimos obtener las reglas oficiales de Reddit.

Basándote en tu conocimiento de Reddit y cómo funcionan las comunidades de contenido adulto/fetiches, GENERÁ las reglas más probables que tendría r/${subreddit}. Considerá:

1. El nombre del subreddit sugiere qué tipo de contenido es
2. Las comunidades similares en Reddit suelen tener reglas parecidas
3. Los subreddits NSFW suelen tener reglas sobre verificación, promoción, y límites de posts
4. Generá entre 8 y 12 reglas realistas y útiles

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

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'Sos un asistente experto en Reddit y OnlyFans. Respondé SOLO en JSON válido, sin markdown ni backticks.' },
          { role: 'user', content: aiPrompt },
        ],
        temperature: 0.3,
      });

      const content = completion.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
      console.error('AI rule generation failed:', e);
      aiResult = null;
    }

    // If AI generated rules, save them
    if (aiResult?.rules?.length > 0) {
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

      await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
      
      for (const rule of aiResult.rules) {
        await db.rule.create({
          data: {
            subredditId: savedSub.id,
            ruleName: rule.name || 'Regla',
            ruleTextOriginal: rule.textOriginal || '',
            ruleTextEs: rule.textEs || '',
            category: rule.keyRuleType || null,
            isKeyRule: rule.isKeyRule || false,
            keyRuleType: rule.keyRuleType || null,
            aiExplanation: rule.aiExplanation || '',
          },
        });
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
    }

    // AI also failed — use smart fallback rules based on subreddit name
    const fallback = generateFallbackRules(subreddit);
    
    const upsertData = {
      name: subreddit.toLowerCase(),
      displayName: subData.title || subData.display_name || `r/${subreddit}`,
      description: subData.public_description || subData.description?.substring(0, 500) || '',
      subscribers: subData.subscribers || 0,
      over18: subData.over18 || fallback.isNSFW,
      allowPromo: fallback.allowPromo,
      requiresVerify: fallback.requiresVerify,
      postLimit: null,
      promoDays: null,
      iconUrl: subData.icon_img || subData.community_icon || null,
    };

    const savedSub = await db.subreddit.upsert({
      where: { name: subreddit.toLowerCase() },
      update: upsertData,
      create: upsertData,
    });

    await db.rule.deleteMany({ where: { subredditId: savedSub.id } });
    
    // Translate fallback rules to Spanish using a simple mapping
    const translations: Record<string, { textEs: string; aiExplanation: string }> = {
      'Verification required for OC': { 
        textEs: 'Verificación obligatoria para contenido original', 
        aiExplanation: 'Tenés que verificar tu identidad con los moderadores antes de postear contenido propio. Normalmente te piden una foto con tu usuario y la fecha.' 
      },
      'Follow Reddit site-wide rules': { 
        textEs: 'Seguí las reglas generales de Reddit', 
        aiExplanation: 'Las reglas de Reddit aplican en todos lados: no menores, no contenido no consensuado, nada ilegal.' 
      },
      'Be respectful': { 
        textEs: 'Sé respetuoso con todos los miembros', 
        aiExplanation: 'No se permite acoso, insultos ni ataques personales. Tratá a todos con respeto.' 
      },
      'No doxxing or personal info': { 
        textEs: 'No compartas información personal', 
        aiExplanation: 'Nunca compartas nombres reales, ubicaciones o datos personales de nadie sin su permiso.' 
      },
      'Content must feature feet': { 
        textEs: 'El contenido debe mostrar pies', 
        aiExplanation: 'Los pies tienen que ser el foco principal del post. Si no se ven claramente, te lo van a borrar.' 
      },
      'Self-promo in comments only': { 
        textEs: 'Autopromoción solo en comentarios', 
        aiExplanation: 'Podés compartir tu OnlyFans SOLO en los comentarios de tus propios posts. Nada de links en títulos.' 
      },
      'Post limit: 1 per 24 hours': { 
        textEs: 'Límite de posts: 1 cada 24 horas', 
        aiExplanation: 'Solo podés postear una vez por día. Borrar y repostear para saltarte el límite te puede costar un ban.' 
      },
      'Required flair': { 
        textEs: 'Flair obligatorio', 
        aiExplanation: 'Todos los posts deben tener un flair (etiqueta). Si no lo ponés, te borran el post.' 
      },
      'No low-effort content': { 
        textEs: 'No se permite contenido de baja calidad', 
        aiExplanation: 'Las fotos tienen que estar bien tomadas, con buena luz. Las fotos borrosas o mal iluminadas las van a borrar.' 
      },
      'No free content - tribute required': { 
        textEs: 'No hay contenido gratis — se requiere tributo', 
        aiExplanation: 'Este es un sub de dominación financiera. Todo tiene que involucrar tributo o pago.' 
      },
      'Self-promo allowed with flair': { 
        textEs: 'Autopromoción permitida con flair', 
        aiExplanation: 'Podés promocionar tu OnlyFans, pero TENÉS que usar el flair [Promo]. Sin flair, te borran el post.' 
      },
      'Title format required': { 
        textEs: 'Formato de título obligatorio', 
        aiExplanation: 'Los títulos necesitan tags como [F4M], [F4F], [F4A]. Sin tag, el post se borra automáticamente.' 
      },
      'Post limit: 2 per day': { 
        textEs: 'Límite de posts: 2 por día', 
        aiExplanation: 'Podés postear hasta 2 veces por día. Borra los posts viejos antes de subir nuevos.' 
      },
      'No scamming': { 
        textEs: 'Prohibido estafar', 
        aiExplanation: 'No prometas contenido que no vas a entregar. Las estafas se pagan con ban permanente.' 
      },
      'No doxxing subs': { 
        textEs: 'Prohibido compartir info de seguidores', 
        aiExplanation: 'Nunca compartas información personal o financiera de tus seguidores. Ban inmediato.' 
      },
      'Self-promo weekends only': { 
        textEs: 'Autopromoción solo los fines de semana', 
        aiExplanation: 'Solo podés poner links de OnlyFans los sábados y domingos. Entre semana, te borran el post.' 
      },
      'No findom without flair': { 
        textEs: 'No findom sin flair', 
        aiExplanation: 'Si tu contenido es de dominación financiera, tiene que llevar el flair [Findom].' 
      },
      'Post limit: 3 per day': { 
        textEs: 'Límite de posts: 3 por día', 
        aiExplanation: 'Hasta 3 posts por día. Calidad antes que cantidad.' 
      },
      'Consent is paramount': { 
        textEs: 'El consentimiento es obligatorio', 
        aiExplanation: 'Todo el contenido debe ser consensuado. Cualquier cosa que sugiera lo contrario se borra y se reporta.' 
      },
      'Must be actual cosplay': { 
        textEs: 'Tiene que ser cosplay real', 
        aiExplanation: 'El personaje tiene que ser reconocible. Ponerse orejitas de gato no es cosplay.' 
      },
      'Required tags in title': { 
        textEs: 'Tags obligatorios en el título', 
        aiExplanation: 'Incluí [OC] para contenido original. Formato: [Nombre del Cosplay] - Nombre del Personaje.' 
      },
      'Post limit: 1 per 12 hours': { 
        textEs: 'Límite de posts: 1 cada 12 horas', 
        aiExplanation: 'Un post cada 12 horas para mantener el feed variado.' 
      },
      'No unauthorized reposts': { 
        textEs: 'No reposts sin permiso', 
        aiExplanation: 'No publiques contenido de otros sin permiso. Si lo encontraste online, dale crédito.' 
      },
      'No NSFW content': { 
        textEs: 'No se permite contenido NSFW', 
        aiExplanation: 'Este sub es SFW. Para contenido adulto, andá a la versión NSFW del sub.' 
      },
      'No self-promotion spam': { 
        textEs: 'No spamees autopromoción', 
        aiExplanation: 'Podés compartir tu contenido, pero máximo 1 post autopromo por semana.' 
      },
      'Credit the artist': { 
        textEs: 'Dale crédito al artista', 
        aiExplanation: 'Si compartís contenido de otro, poné su nombre y link.' 
      },
      'Consent is mandatory': { 
        textEs: 'El consentimiento es obligatorio', 
        aiExplanation: 'Todo el contenido debe ser consensuado. Lo contrario resulta en ban.' 
      },
      'No extreme content without warning': { 
        textEs: 'Contenido extremo requiere advertencia', 
        aiExplanation: 'Contenido de bondage extremo, asfixia o sangre necesita flair [Extreme] y NSFW.' 
      },
      'Post limit: 1 per day': { 
        textEs: 'Límite de posts: 1 por día', 
        aiExplanation: 'Un solo post por día.' 
      },
      'Must feature latex': { 
        textEs: 'Tiene que mostrar latex', 
        aiExplanation: 'Todo el contenido debe mostrar latex o goma real. PVC y spandex no cuentan.' 
      },
      'Self-promo with verification': { 
        textEs: 'Autopromoción con verificación', 
        aiExplanation: 'Los links de OnlyFans son solo para creadores verificados. Verificate primero.' 
      },
      'Tag your content': { 
        textEs: 'Etiquetá tu contenido', 
        aiExplanation: 'Usá flairs: [F], [M], [Couple], [OC], [Non-OC]. Todos los posts necesitan flair.' 
      },
      'Must feature lingerie': { 
        textEs: 'Tiene que mostrar lencería', 
        aiExplanation: 'El contenido debe mostrar lencería, medias o ropa interior. Otra cosa se borra.' 
      },
      'Must feature smoking': { 
        textEs: 'Tiene que mostrar fumar', 
        aiExplanation: 'Todo el contenido debe mostrar a alguien fumando. Contenido no relacionado se borra.' 
      },
      'Body-positive community': { 
        textEs: 'Comunidad body-positive', 
        aiExplanation: 'No se permite body shaming. Todos los cuerpos son bienvenidos. Comentarios negativos = ban.' 
      },
      'Must feature alt/tattoo/goth aesthetic': { 
        textEs: 'Tiene que tener estética alt/tattoo/goth', 
        aiExplanation: 'El contenido debe mostrar estilo alternativo: tatuajes, piercings, maquillaje gótico, etc.' 
      },
      'Must include OnlyFans link': { 
        textEs: 'Tiene que incluir link de OnlyFans', 
        aiExplanation: 'Todos los posts deben incluir tu link de OnlyFans. Sin link, se borra.' 
      },
      'No misleading titles': { 
        textEs: 'No títulos engañosos', 
        aiExplanation: 'Las imágenes de preview y el título tienen que representar tu contenido real. Nada de bait-and-switch.' 
      },
      'No hate or discrimination': { 
        textEs: 'No odio ni discriminación', 
        aiExplanation: 'Todos los creadores son bienvenidos sin importar género, tamaño, raza u orientación.' 
      },
      'Self-promo rules vary': { 
        textEs: 'Las reglas de autopromoción varían', 
        aiExplanation: 'Preguntale a los moderadores sobre las reglas de promoción. Algunos permiten en comentarios, otros no.' 
      },
      'Post limit: check with mods': { 
        textEs: 'Límite de posts: consultá con los mods', 
        aiExplanation: 'La mayoría de los subreddits limitan a 1-2 posts por día. Verificá antes de postear.' 
      },
      'Use appropriate flairs': { 
        textEs: 'Usá los flairs apropiados', 
        aiExplanation: 'Todos los posts deben usar el flair correcto. Si no estás seguro, mirá posts existentes o preguntá.' 
      },
      'Self-promo with flair only': { 
        textEs: 'Autopromoción solo con flair', 
        aiExplanation: 'Los links de OnlyFans están permitidos pero solo con el flair [Promo].' 
      },
      'Consent of all parties': { 
        textEs: 'Consentimiento de todas las partes', 
        aiExplanation: 'Todas las personas en el contenido deben consentir. No publiques sin permiso de todos los involucrados.' 
      },
      'Safety tips encouraged': { 
        textEs: 'Se anima a incluir tips de seguridad', 
        aiExplanation: 'Cuando publiques contenido de shibari o suspensión, incluís advertencias y tips de seguridad.' 
      },
      'No suspension without safety discussion': { 
        textEs: 'No suspensión sin discusión de seguridad', 
        aiExplanation: 'Posts de suspensión deben incluir info de seguridad. Contenido inseguro se elimina.' 
      },
      'No AI-generated cosplay': { 
        textEs: 'No cosplay generado por IA', 
        aiExplanation: 'Las imágenes generadas por IA no se consideran cosplay. Solo fotos reales de personas reales.' 
      },
      'Harassment of cosplayers is bannable': { 
        textEs: 'Acosar a cosplayers es motivo de ban', 
        aiExplanation: 'Comentarios sexuales o acosadores hacia cosplayers = ban inmediato. Cosplay no es consentimiento.' 
      },
      'No non-feet content': { 
        textEs: 'No contenido que no sea de pies', 
        aiExplanation: 'Los pies tienen que ser el foco principal. Fotos de cuerpo entero solo si los pies son claramente visibles.' 
      },
      'Watermarks allowed but no URLs': { 
        textEs: 'Watermarks permitidos pero sin URLs', 
        aiExplanation: 'Podés watermark con tu usuario de Reddit, pero sin URLs a OnlyFans u otros sitios.' 
      },
      'No pay-to-play without verification': { 
        textEs: 'No ventas sin verificación', 
        aiExplanation: 'Si ofrecés servicios pagos, tenés que estar verificada. Vendedoras sin verificar = ban.' 
      },
      'No deepfakes or AI nudes': { 
        textEs: 'No deepfakes ni nudes generados por IA', 
        aiExplanation: 'Deepfakes o nudes de IA de personas reales están prohibidos. Ban permanente inmediato.' 
      },
      'No low-effort cosplay': { 
        textEs: 'No cosplay de baja calidad', 
        aiExplanation: 'El cosplay tiene que ser reconocible y mostrar esfuerzo. Lencería sola no es cosplay.' 
      },
      'Credit designers and makers': { 
        textEs: 'Dale crédito a diseñadores', 
        aiExplanation: 'Si usás latex de un diseñador conocido, mencioná su nombre en el título o comentarios.' 
      },
      'No AI-generated latex images': { 
        textEs: 'No imágenes de latex generadas por IA', 
        aiExplanation: 'Solo fotos y videos reales de latex. Imágenes de IA no están permitidas.' 
      },
      'No sexualized comments': { 
        textEs: 'No comentarios sexualizados', 
        aiExplanation: 'El ASMR no es sexual. Comentarios sexuales o coqueteos hacia ASMRtists = ban.' 
      },
      'No tribute under minimum': { 
        textEs: 'No tributos por debajo del mínimo', 
        aiExplanation: 'Cada Domma establece su mínimo de tributo. No intentes negociar ni lowballear.' 
      },
      'No scamming or bait-and-switch': { 
        textEs: 'Prohibido estafar o hacer bait-and-switch', 
        aiExplanation: 'No prometas contenido y no lo entregues. Las estafas se pagan con ban permanente.' 
      },
      'No selling others\' content': { 
        textEs: 'No vendas contenido de otros', 
        aiExplanation: 'Solo podés promocionar tu propio OnlyFans. Promocionar la cuenta de otro no está permitido.' 
      },
      'No excessive watermarking': { 
        textEs: 'No watermarks excesivos', 
        aiExplanation: 'Los watermarks no deben cubrir más del 20% de la imagen. Watermarks enormes se borran.' 
      },
      'Mark paid content clearly': { 
        textEs: 'Marcá claramente el contenido pago', 
        aiExplanation: 'Si tu post tiene contenido PPV o pago, poné [PPV] en el título.' 
      },
      'No free content in DMs spam': { 
        textEs: 'No spamees contenido gratis por DM', 
        aiExplanation: 'No prometas contenido gratis en comentarios y después cobres. Sé transparente con los precios.' 
      },
      'Required title format': { 
        textEs: 'Formato de título obligatorio', 
        aiExplanation: 'Formato: [F4M] Nombre - Lo que ofrecés. Ej: [F4M] Jessica - Solo, feet, contenido personalizado' 
      },
      'Engagement Requirements': { 
        textEs: 'Requisitos de engagement', 
        aiExplanation: 'Los creadores deben responder comentarios en sus posts. No responder puede resultar en eliminación del post.' 
      },
      'No Direct Links OnlyFans': { 
        textEs: 'No links directos a OnlyFans', 
        aiExplanation: 'Evitá publicar links directos a OnlyFans. Buscá formas creativas de dirigir tráfico sin violar esta regla.' 
      },
      'Content Ownership': { 
        textEs: 'Propiedad del contenido', 
        aiExplanation: 'Solo publicá contenido que tengas derecho a compartir. Contenido robado o sin permiso = ban.' 
      },
      'Proper Flair Required': { 
        textEs: 'Flair apropiado requerido', 
        aiExplanation: 'Todos los posts deben tener flair. Los comunes incluyen: Verificado, Aficionado, Profesional, etc.' 
      },
      'Promotion Days and Limits': { 
        textEs: 'Días y límites de promoción', 
        aiExplanation: 'La autopromoción solo está permitida en días específicos con máximo 1 post promocional por día permitido.' 
      },
      'Content Must Be Relevant': { 
        textEs: 'El contenido debe ser relevante', 
        aiExplanation: 'Todos los posts deben ser relevantes al tema del sub. Contenido off-topic se elimina sin aviso.' 
      },
      'No Personal Information': { 
        textEs: 'No información personal', 
        aiExplanation: 'No compartas nombres reales, ubicaciones o datos de contacto. Solo links a OnlyFans verificado.' 
      },
      'Respectful Communication': { 
        textEs: 'Comunicación respetuosa', 
        aiExplanation: 'Mantené una comunicación respetuosa. Acoso u odio = ban.' 
      },
      'Title Formatting': { 
        textEs: 'Formato de título', 
        aiExplanation: 'Los títulos deben seguir el formato: [Tipo de Contenido] - Descripción.' 
      },
    };

    for (const rule of fallback.rules) {
      const translation = translations[rule.short_name as string] || { 
        textEs: rule.short_name, 
        aiExplanation: 'Regla estándar de la comunidad. Verificá los detalles directamente en Reddit.' 
      };
      
      await db.rule.create({
        data: {
          subredditId: savedSub.id,
          ruleName: rule.short_name as string,
          ruleTextOriginal: rule.description as string,
          ruleTextEs: translation.textEs,
          category: rule.keyRuleType as string || null,
          isKeyRule: rule.isKeyRule as boolean || false,
          keyRuleType: rule.keyRuleType as string || null,
          aiExplanation: translation.aiExplanation,
        },
      });
    }

    const savedRules = await db.rule.findMany({
      where: { subredditId: savedSub.id },
    });

    return NextResponse.json({
      subreddit: savedSub,
      rules: savedRules,
      summaryEs: fallback.summaryEs,
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
