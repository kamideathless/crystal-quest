// app/layout.tsx
import type { Metadata } from 'next';
import { Orbitron, Space_Mono } from 'next/font/google';
import './globals.css';

const orbitron = Orbitron({ 
  subsets: ['latin'],
  variable: '--font-orbitron',
  weight: ['400', '700', '900']
});

const spaceMono = Space_Mono({ 
  subsets: ['latin'],
  variable: '--font-space-mono',
  weight: ['400', '700']
});

export async function generateMetadata(): Promise<Metadata> {
  const URL = process.env.NEXT_PUBLIC_URL || 'https://crystalquestonbase.vercel.app';
  
  return {
    title: 'Crystal Quest - Match 3 on Base',
    description: 'Play the most addictive match-3 game on Base blockchain!',
    other: {
      'base:app_id': '696ffee95f24b57cc50d3209',
      'fc:miniapp': JSON.stringify({
        version: 'next',
        imageUrl: `${URL}/embed-image.png`,
        button: {
          title: 'Play Crystal Quest',
          action: {
            type: 'launch_miniapp',
            name: 'Crystal Quest',
            url: URL,
            splashImageUrl: `${URL}/splash.png`,
            splashBackgroundColor: '#0A0E27',
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${orbitron.variable} ${spaceMono.variable}`}>
        {children}
      </body>
    </html>
  );
}