# Claude Development Guide

This document describes the architecture, conventions, and development patterns for the Advent of Games monorepo.

## Architecture Overview

This is a **PNPM workspace monorepo** with the following structure:

- **apps/web**: Astro site that serves as the main frontend
- **packages/game-XX**: Individual game packages (React components)
- **packages/ui**: Shared design system and Tailwind configuration

## How Games Work

### Game Component API

Every game is a standalone React component that exports a `Game` function with this interface:

```tsx
export interface GameProps {
  seed?: number;
  onComplete?: (score: number) => void;
}

export function Game({ seed, onComplete }: GameProps) {
  // Game implementation
}
```

**Props:**

- `seed`: Optional random seed for deterministic gameplay
- `onComplete`: Callback fired when game ends, receives final score

### Game Package Structure

```
packages/game-XX/
├── src/
│   ├── Game.tsx        # Main game component (exported)
│   ├── main.tsx        # Vite dev harness entry point
│   └── index.css       # Styles for dev harness
├── index.html          # Dev harness HTML
├── vite.config.ts      # Vite configuration
├── package.json        # Package metadata and scripts
└── tsconfig.json       # TypeScript configuration
```

### Creating a New Game

1. **Create the package directory:**

   ```bash
   mkdir -p packages/game-XX/src
   ```

2. **Copy `package.json` from an existing game** and update:
   - `name`: `@games/game-XX`
   - `port` in `vite.config.ts`: `300X`

3. **Implement `src/Game.tsx`:**

   ```tsx
   import { useState, useEffect } from 'react';

   export interface GameProps {
     seed?: number;
     onComplete?: (score: number) => void;
   }

   export function Game({ seed, onComplete }: GameProps) {
     // Your game logic here

     // When game ends:
     useEffect(() => {
       if (isGameOver && onComplete) {
         onComplete(finalScore);
       }
     }, [isGameOver, finalScore, onComplete]);

     return <div className="game-container">{/* JSX */}</div>;
   }
   ```

4. **Create dev harness** (`src/main.tsx`, `index.html`, `vite.config.ts`)
   - Copy from existing game packages
   - Update port number in `vite.config.ts`

5. **Integrate into Astro site:**

   Update `apps/web/package.json`:

   ```json
   {
     "dependencies": {
       "@games/game-XX": "workspace:*"
     }
   }
   ```

   Update `apps/web/src/pages/day/[n].astro`:

   ```astro
   ---
   import { Game as DayX } from '@games/game-XX';

   export function getStaticPaths() {
     return [
       // existing routes...
       { params: { n: 'X' } },
     ];
   }

   const gameTitles: Record<number, string> = {
     // existing titles...
     X: 'Your Game Title',
   };
   ---

   <Layout title={`Day ${dayNumber} - ${gameTitle}`}>
     <div class="flex justify-center">
       {dayNumber === X && <DayX client:load />}
     </div>
   </Layout>
   ```

   Update `apps/web/src/pages/index.astro` to add game to list.

6. **Test both modes:**

   ```bash
   # Standalone mode
   pnpm --filter @games/game-XX dev

   # Integrated mode
   pnpm dev
   ```

## Design System

### Using the UI Package

The `@advent/ui` package provides:

#### Tailwind Configuration

Import in your `tailwind.config.mjs`:

```js
import uiConfig from '@advent/ui/tailwind-config';

export default uiConfig;
```

Or extend it:

```js
import uiConfig from '@advent/ui/tailwind-config';

export default {
  ...uiConfig,
  theme: {
    extend: {
      ...uiConfig.theme.extend,
      // Your custom extensions
    },
  },
};
```

#### Global Styles

Import in your main layout or component:

```tsx
import '@advent/ui/styles';
```

This provides:

- Tailwind base styles
- CSS custom properties for colors
- Star animation background

#### Theme Colors

**Neon Palette (Primary):**

- `text-neon-blue` / `bg-neon-blue`: #00F3FF (cyan)
- `text-neon-pink` / `bg-neon-pink`: #FF003C (hot pink)
- `text-neon-purple` / `bg-neon-purple`: #BC13FE (violet)
- `text-neon-green` / `bg-neon-green`: #00FF9D (mint)

**Christmas Palette (Secondary):**

- `text-christmas-red` / `bg-christmas-red`: #FF003C
- `text-christmas-green` / `bg-christmas-green`: #00F3FF
- `text-christmas-gold` / `bg-christmas-gold`: #F8B229
- `text-christmas-midnight` / `bg-christmas-midnight`: #050B14

**Glass/Transparency:**

- `border-glass-border`: rgba(255, 255, 255, 0.1)
- `bg-glass-surface`: rgba(255, 255, 255, 0.05)
- `bg-glass-highlight`: rgba(255, 255, 255, 0.2)

### Design Patterns

#### Glassmorphism Cards

```tsx
<div className="relative">
  {/* Glow effect */}
  <div className="from-neon-blue via-neon-purple to-neon-pink absolute -inset-[4px] bg-gradient-to-r opacity-60 blur-sm" />

  {/* Card */}
  <div className="relative border-2 border-white/10 bg-black/80 p-8 backdrop-blur-xl">Content</div>
</div>
```

#### Neon Buttons

```tsx
<button className="bg-neon-blue hover:bg-neon-green transform rounded-lg border-4 border-white/30 px-8 py-4 font-bold text-black shadow-[0_0_20px_rgba(0,243,255,0.5)] transition-all hover:scale-105">
  Click Me
</button>
```

#### Gradient Text

```tsx
<h1 className="from-neon-green to-neon-blue bg-gradient-to-r bg-clip-text text-5xl font-bold text-transparent">
  Title
</h1>
```

## Development Workflow

### Scripts

**Root level:**

- `pnpm dev` - Run main Astro site
- `pnpm build` - Build all packages
- `pnpm lint` - Lint all packages
- `pnpm lint:fix` - Auto-fix linting issues
- `pnpm format` - Format with Prettier
- `pnpm format:check` - Check Prettier formatting
- `pnpm typecheck` - Type-check all packages

**Per-package:**

- `pnpm --filter @games/game-XX dev` - Run game standalone
- `pnpm --filter @games/game-XX build` - Build game
- `pnpm --filter @games/game-XX lint` - Lint game
- `pnpm --filter @games/game-XX typecheck` - Type-check game

### Code Quality

**ESLint** checks TypeScript/React code:

- No unused variables (warnings)
- React hooks rules
- TypeScript-aware

**Prettier** formats:

- JavaScript/TypeScript
- Astro files (via plugin)
- Tailwind class ordering (via plugin)
- JSON, Markdown, CSS

**Stylelint** checks CSS:

- Standard CSS rules
- Tailwind directives allowed

**TypeScript** checks:

- Strict mode enabled
- Type safety across all packages

### State Management

Games can use **Zustand** for state management:

```bash
pnpm add zustand --filter @games/game-XX
```

Example:

```tsx
import { create } from 'zustand';

interface GameState {
  score: number;
  isPlaying: boolean;
  incrementScore: () => void;
}

const useGameStore = create<GameState>((set) => ({
  score: 0,
  isPlaying: false,
  incrementScore: () => set((state) => ({ score: state.score + 1 })),
}));

export function Game() {
  const { score, incrementScore } = useGameStore();
  return <button onClick={incrementScore}>Score: {score}</button>;
}
```

## Deployment

### Build Process

```bash
pnpm build
```

This runs build in all packages:

1. Games are built with Vite (for dev harness)
2. Astro site is built with all games as islands

### Astro Islands

Games are rendered as React islands using `client:load`:

```astro
<Day1 client:load />
```

This means:

- Game JS is code-split automatically
- Game only hydrates when loaded
- Each game is an independent bundle

## Best Practices

1. **Keep games self-contained**: No external API calls, all logic client-side
2. **Use TypeScript**: Strong typing prevents bugs
3. **Follow design system**: Use provided colors and patterns
4. **Optimize performance**: Games should run at 60fps
5. **Test both modes**: Standalone dev harness AND Astro integration
6. **Clean up effects**: Always return cleanup functions from useEffect
7. **Handle edge cases**: Game over, pause, reset states
8. **Responsive design**: Games should work on different screen sizes (where applicable)

## Troubleshooting

### Game not showing in Astro

1. Check `apps/web/package.json` has dependency
2. Run `pnpm install` at root
3. Check import in `day/[n].astro`
4. Check getStaticPaths includes your day number
5. Check conditional render: `{dayNumber === X && <DayX client:load />}`

### Type errors

1. Run `pnpm typecheck` to see all errors
2. Ensure `@types/node` is in devDependencies
3. Check tsconfig.json extends base config
4. For React types: `@types/react` and `@types/react-dom`

### Build failures

1. Check all packages build individually
2. Run `pnpm --filter @games/game-XX build`
3. Check for import errors in Astro pages
4. Clear `.astro` and `dist` folders

### Linting issues

1. Run `pnpm lint` to see all issues
2. Run `pnpm lint:fix` to auto-fix
3. Run `pnpm format` for Prettier issues
4. Check eslint.config.mjs for custom rules
