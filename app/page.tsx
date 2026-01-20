// app/page.tsx
'use client';

import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import Game from '@/components/Game';

export default function HomePage() {
  useEffect(() => {
    // Сообщаем Base App что приложение готово
    const initMiniApp = async () => {
      try {
        await sdk.actions.ready();
        console.log('Mini app ready');
      } catch (error) {
        console.error('Failed to initialize mini app:', error);
      }
    };

    initMiniApp();
  }, []);

  return (
    <main className="min-h-screen">
      <Game />
    </main>
  );
}
