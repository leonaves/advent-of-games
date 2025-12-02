import manifestData from '../../src/games-manifest.json';

function getCurrentDay(year: number): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDate = now.getDate();

  if (currentYear === year && currentMonth === 12) {
    return Math.min(currentDate, 25);
  }

  if (currentYear > year || (currentYear === year && currentMonth > 12)) {
    return 25;
  }

  return 0;
}

function hasUnlockCookie(request: Request): boolean {
  const cookieHeader = request.headers.get('Cookie') || '';
  return cookieHeader.includes('advent_unlocked=true');
}

export const onRequestGet: PagesFunction = async (context) => {
  const { request } = context;
  const isUnlocked = hasUnlockCookie(request);
  const currentDay = getCurrentDay(manifestData.year);

  const filteredManifest = {
    ...manifestData,
    games: manifestData.games.map((game) => {
      const gameIsAvailable = game.day <= currentDay || isUnlocked;
      if (gameIsAvailable) {
        return game;
      }
      // Strip slug and sensitive data from future games
      const { slug, ...rest } = game;
      return rest;
    }),
  };

  return new Response(JSON.stringify(filteredManifest), {
    headers: { 'Content-Type': 'application/json' },
  });
};
