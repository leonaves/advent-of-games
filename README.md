# Advent of Games

A clean monorepo for daily coding games, built with Astro, React, and PNPM workspaces.

## Architecture

- **Astro** as the main site framework
- **React** components for games, rendered as islands in Astro
- **PNPM workspaces** for monorepo management
- Each game is a standalone package with its own dev harness

## Structure

```
advent-of-games/
  apps/
    web/              # Main Astro site
  packages/
    game-01/          # Snakle - Snake game
    game-02/          # Hay Girl - Resource management
    game-03/          # Nomoji - Memory puzzle
    ui/               # Shared design system
```

## Development

### Run the main site

```bash
pnpm dev
# or
pnpm --filter web dev
```

### Run a game standalone

```bash
pnpm --filter @games/game-01 dev  # Snakle on port 3001
pnpm --filter @games/game-02 dev  # Hay Girl on port 3002
pnpm --filter @games/game-03 dev  # Nomoji on port 3003
```

### Install dependencies

```bash
pnpm install
```

## Adding a New Game

1. Create a new package under `packages/game-XX/`
2. Implement the game as a React component:
   ```tsx
   export function Game({ seed, onComplete }: GameProps) {
     // Your game logic
   }
   ```
3. Add a Vite dev harness (copy from game-01)
4. Update `apps/web/src/pages/day/[n].astro`:
   - Import your game: `import { Game as DayN } from '@games/game-XX';`
   - Add route: Add `{ params: { n: 'N' } }` to `getStaticPaths()`
   - Render: Add `{dayNumber === N && <DayN client:load />}`
5. Update the game list in `apps/web/src/pages/index.astro`
6. The game will be available at `/day/N`

## Design System

The UI package contains:

- Tailwind config with cyberpunk/glassmorphism theme
- Neon colors (blue, pink, purple, green)
- Christmas theme colors
- Shared styles and animations

## Games

### Day 1: Snakle 🐍

A cyberpunk twist on the classic Snake game. Eat food, grow your snake, and phase through walls with ghost powerups!

### Day 2: Hay Girl 🌾

Make hay while the sun shines! A resource management game where you must harvest and protect your hay from changing weather conditions.

### Day 3: Nomoji 🎯

A memory and observation puzzle. Watch 50 emojis float around the screen and identify which one is missing in 2 guesses or less!

## Scripts

- `pnpm dev` - Run the main Astro site
- `pnpm build` - Build all packages
- `pnpm --filter <package> dev` - Run specific package dev server
