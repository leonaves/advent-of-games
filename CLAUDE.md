# Claude Development Guide

This document describes the architecture, conventions, and development patterns for the Advent of Games project.

## Architecture Overview

This project uses a **manifest-based build pipeline** that pulls games from external GitHub repositories, builds them, and integrates them into an Astro site via iframes.

### Project Structure

- **apps/web**: Astro site serving as the main frontend
- **games-manifest.json**: Central configuration for all games
- **scripts/build-games.js**: Build pipeline that clones and builds game repos
- **apps/web/public/games/**: Build output directory (gitignored)

## How the Build Pipeline Works

### 1. Games Manifest (`games-manifest.json`)

The manifest is the single source of truth for all games:

```json
{
  "games": [
    {
      "day": 1,
      "title": "Mastermind",
      "description": "Game description here",
      "isUnlocked": true,
      "repo": "https://github.com/user/repo",
      "branch": "master",
      "buildConfig": {
        "packageManager": "npm",
        "installCommand": "npm install",
        "buildCommand": "npm run build",
        "buildOutputDir": "dist",
        "nodeVersion": "20"
      }
    }
  ]
}
```

### 2. Build Pipeline (`scripts/build-games.js`)

The build script:
1. Reads `games-manifest.json`
2. Copies manifest to `apps/web/src/` for Astro to import
3. For each game:
   - Clones the repo to `.temp-games/day-{N}/`
   - Runs install command
   - Runs build command
   - Copies build output to `apps/web/public/games/day-{N}/`
4. Cleans up temp files

### 3. Astro Integration

Games are embedded in iframes for complete style isolation:

**`apps/web/src/pages/day/[n].astro`:**
- Dynamically generates routes based on manifest
- Wraps each game in an iframe
- Loads from `/games/day-{N}/index.html`

**`apps/web/src/pages/index.astro`:**
- Reads manifest to display game list
- Shows title, description, and unlock status

## Adding a New Game

### Step 1: Add to Manifest

Edit `games-manifest.json`:

```json
{
  "day": 2,
  "title": "Your Game Name",
  "description": "Brief description of the game",
  "isUnlocked": true,
  "repo": "https://github.com/username/repo-name",
  "branch": "main",
  "buildConfig": {
    "packageManager": "npm",
    "installCommand": "npm install",
    "buildCommand": "npm run build",
    "buildOutputDir": "dist",
    "nodeVersion": "20"
  }
}
```

### Step 2: Build

```bash
pnpm run build:games  # Build just the games
pnpm build            # Build games + Astro site
```

### Step 3: Deploy

```bash
pnpm deploy  # Builds everything and deploys to Cloudflare Pages
```

## Requirements for Game Repositories

Each game repository must have:

1. **`package.json` with build script:**
   ```json
   {
     "scripts": {
       "build": "vite build"  // or your build command
     }
   }
   ```

2. **Static build output:**
   - All files in a single directory (usually `dist/`)
   - Entry point at `index.html`
   - All assets bundled (no external dependencies)

3. **Self-contained:**
   - No server-side code
   - No API dependencies
   - Works from any path (relative asset paths)

4. **Framework agnostic:**
   - Can be React, Vue, Svelte, vanilla JS, etc.
   - Just needs to build to static HTML/CSS/JS

## Development Workflow

### Commands

**Development:**
```bash
pnpm dev                # Start Astro dev server (port 4321)
pnpm run build:games    # Build games only
```

**Build & Deploy:**
```bash
pnpm build             # Build games + Astro site
pnpm deploy            # Build and deploy to Cloudflare Pages
```

**Code Quality:**
```bash
pnpm lint              # Lint all packages
pnpm lint:fix          # Auto-fix linting issues
pnpm format            # Format with Prettier
pnpm format:check      # Check Prettier formatting
pnpm typecheck         # Type-check all packages
```

### Testing Games Locally

After running `pnpm run build:games`, you can test games:

1. **In development mode:**
   ```bash
   pnpm dev
   # Visit http://localhost:4321
   ```

2. **Standalone game build:**
   - Check `apps/web/public/games/day-{N}/index.html`
   - Open directly in browser to test game isolation

## Design System

The project uses a neon cyberpunk aesthetic. See the Astro layout files for the design system:

- **Colors:** Neon blue, pink, purple, green gradients
- **Effects:** Glassmorphism, glows, blurs
- **Typography:** Gradient text, wide tracking

Games don't need to follow this design - they're fully isolated in iframes.

## File Structure

```
advent-of-games/
├── games-manifest.json           # Central game configuration
├── scripts/
│   └── build-games.js           # Build pipeline
├── apps/
│   └── web/
│       ├── src/
│       │   ├── pages/
│       │   │   ├── index.astro       # Game list
│       │   │   └── day/[n].astro     # Game wrapper
│       │   ├── layouts/
│       │   │   └── Layout.astro      # Main layout
│       │   └── games-manifest.json   # (Generated, gitignored)
│       └── public/
│           └── games/               # (Generated, gitignored)
│               └── day-{N}/         # Built game files
└── .temp-games/                     # (Temporary, gitignored)
```

## Deployment

The project deploys to **Cloudflare Pages** automatically via GitHub integration.

**Preferred deployment method:**
1. Commit your changes to git
2. Push to the main branch on GitHub
3. Cloudflare Pages automatically builds and deploys

**Manual deployment (if needed):**
1. `pnpm build` runs:
   - `node scripts/build-games.js` (builds all games)
   - `pnpm --filter web build` (builds Astro site)

2. `pnpm deploy` runs:
   - `pnpm build` (above)
   - `wrangler pages deploy` (deploys to Cloudflare)

Output directory: `apps/web/dist/`

## Troubleshooting

### Game fails to build

1. Check the repo URL and branch in manifest
2. Verify the game repo has a working build script
3. Check the `buildOutputDir` matches the game's output
4. Look at build logs for specific errors

### Game doesn't display

1. Verify game built successfully in `apps/web/public/games/day-{N}/`
2. Check browser console for iframe errors
3. Ensure `index.html` exists in game directory
4. Check for CORS or CSP issues

### Manifest not found during build

Run `pnpm run build:games` before `pnpm --filter web build`.
The full `pnpm build` command does this automatically.

## Best Practices

1. **Keep manifest organized:** Add games in order by day number
2. **Test before committing:** Run `pnpm build` to ensure everything works
3. **Document special requirements:** Note any unusual build configs in the manifest
4. **Version control:** Only commit `games-manifest.json`, not built games
5. **Clean builds:** Delete `.temp-games/` if you encounter issues

## Example Game Repos

- **Mastermind:** https://github.com/herunan/mastermind
  - React + Vite + Tailwind
  - Standard build process
  - Good reference for new games
