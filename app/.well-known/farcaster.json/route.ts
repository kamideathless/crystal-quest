// app/.well-known/farcaster.json/route.ts

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL || 'https://your-domain.vercel.app';
  
  return Response.json({
    "accountAssociation": {
      // Эти поля будут заполнены после создания на https://www.base.dev/preview?tab=account
      "header": "",
      "payload": "",
      "signature": ""
    },
    "miniapp": {
      "version": "1",
      "name": "Crystal Quest - Match 3",
      "homeUrl": URL,
      "iconUrl": `${URL}/icon.png`,
      "splashImageUrl": `${URL}/splash.png`,
      "splashBackgroundColor": "#0A0E27",
      "webhookUrl": `${URL}/api/webhook`,
      "subtitle": "Match crystals, earn rewards",
      "description": "A fast-paced match-3 puzzle game built on Base blockchain. Match colorful crystals, build combos, and compete for high scores in the Base ecosystem. Play to earn rewards!",
      "screenshotUrls": [
        `${URL}/screenshot1.png`,
        `${URL}/screenshot2.png`,
        `${URL}/screenshot3.png`
      ],
      "primaryCategory": "games",
      "tags": ["match3", "puzzle", "gaming", "blockchain", "base", "web3"],
      "heroImageUrl": `${URL}/hero.png`,
      "tagline": "Match. Score. Win on Base.",
      "ogTitle": "Crystal Quest - Match 3 on Base",
      "ogDescription": "Play the most addictive match-3 game on Base blockchain. Build combos and compete for rewards!",
      "ogImageUrl": `${URL}/og-image.png`,
      "noindex": false
    }
  });
}
