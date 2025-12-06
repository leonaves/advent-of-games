#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT_DIR, 'games-manifest.json');
const TEMP_DIR = path.join(ROOT_DIR, '.temp-games');
const OUTPUT_DIR = path.join(ROOT_DIR, 'apps/web/public/games');
const WEB_MANIFEST_PATH = path.join(ROOT_DIR, 'apps/web/src/games-manifest.json');
const API_ROUTES_DIR = path.join(ROOT_DIR, 'apps/web/src/pages/api');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function execCommand(command, cwd, description) {
  log(`  → ${description}...`, colors.cyan);
  try {
    execSync(command, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env },
    });
  } catch (error) {
    log(`  ✗ Failed: ${description}`, colors.red);
    throw error;
  }
}

async function buildGame(game, baseUrl) {
  const { day, title, repo, branch, buildConfig } = game;

  if (!repo) {
    log(`⊘ Skipping day ${day} (${title}) - no repo configured`, colors.yellow);
    return;
  }

  log(`\n${'='.repeat(60)}`, colors.bright);
  log(`Building Day ${day}: ${title}`, colors.bright);
  log(`${'='.repeat(60)}`, colors.bright);

  const tempGameDir = path.join(TEMP_DIR, `day-${day}`);
  const outputGameDir = path.join(OUTPUT_DIR, `day-${day}`);

  try {
    // Clean temp directory
    await fs.remove(tempGameDir);
    await fs.ensureDir(tempGameDir);

    // Clone repository
    log(`\n📦 Cloning repository...`, colors.cyan);
    execCommand(
      `git clone --depth 1 --branch ${branch || 'main'} ${repo} ${tempGameDir}`,
      ROOT_DIR,
      'Clone repository'
    );

    // Install dependencies
    log(`\n📥 Installing dependencies...`, colors.cyan);
    execCommand(buildConfig.installCommand, tempGameDir, 'Install dependencies');

    // Build game
    log(`\n🔨 Building game...`, colors.cyan);
    execCommand(buildConfig.buildCommand, tempGameDir, 'Build game');

    // Copy build output
    log(`\n📤 Copying build output...`, colors.cyan);
    const buildOutputPath = path.join(tempGameDir, buildConfig.buildOutputDir);

    if (!fs.existsSync(buildOutputPath)) {
      throw new Error(`Build output directory not found: ${buildOutputPath}`);
    }

    await fs.remove(outputGameDir);
    await fs.copy(buildOutputPath, outputGameDir);

    // Inject env vars in HTML
    log(`\n🔧 Injecting env vars...`, colors.cyan);
    const indexHtmlPath = path.join(outputGameDir, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
      let html = await fs.readFile(indexHtmlPath, 'utf-8');

      // Inject SHARE_URL env var - the absolute parent page URL for sharing
      const slug = game.slug || `day-${day}`;
      const shareUrl = `${baseUrl}/day/${day}/${slug}`;
      const shareUrlScript = `<script>window.SHARE_URL = "${shareUrl}";</script>`;
      html = html.replace('<head>', `<head>\n    ${shareUrlScript}`);

      await fs.writeFile(indexHtmlPath, html, 'utf-8');
    }

    // Copy API routes if specified
    if (game.apiRoutes && game.apiRoutes.length > 0) {
      log(`\n🔌 Copying API routes...`, colors.cyan);
      await fs.ensureDir(API_ROUTES_DIR);

      for (const route of game.apiRoutes) {
        const sourcePath = path.join(tempGameDir, route.source);
        const destPath = path.join(API_ROUTES_DIR, route.dest);

        if (fs.existsSync(sourcePath)) {
          // Read the source file and convert to Astro API route format
          let content = await fs.readFile(sourcePath, 'utf-8');

          // Convert Cloudflare Pages Function to Astro API route
          content = convertToAstroApiRoute(content);

          await fs.writeFile(destPath, content, 'utf-8');
          log(`  → Copied ${route.source} to ${route.dest}`, colors.cyan);
        } else {
          log(`  ⚠ API route source not found: ${route.source}`, colors.yellow);
        }
      }
    }

    log(`\n✓ Successfully built day ${day}: ${title}`, colors.green);
    log(`  Output: ${outputGameDir}`, colors.green);
  } catch (error) {
    log(`\n✗ Failed to build day ${day}: ${title}`, colors.red);
    log(`  Error: ${error.message}`, colors.red);
    throw error;
  }
}

// Convert Cloudflare Pages Function to Astro API route
function convertToAstroApiRoute(content) {
  // Add Astro imports and prerender export
  let astroContent = `import type { APIRoute } from 'astro';\n\nexport const prerender = false;\n\n`;

  // Remove Cloudflare-specific interface
  content = content.replace(/interface Env \{[^}]*\}\n*/g, '');

  // Convert onRequestGet to GET
  content = content.replace(
    /export const onRequestGet: PagesFunction<Env> = async \(context\) => \{/g,
    'export const GET: APIRoute = async ({ request }) => {'
  );
  content = content.replace(/context\.request/g, 'request');

  // Convert onRequestPost to POST
  content = content.replace(
    /export const onRequestPost: PagesFunction<Env> = async \(context\) => \{/g,
    'export const POST: APIRoute = async ({ request }) => {'
  );

  // Convert onRequestOptions to OPTIONS
  content = content.replace(
    /export const onRequestOptions: PagesFunction<Env> = async \(\) => \{/g,
    'export const OPTIONS: APIRoute = async () => {'
  );

  return astroContent + content;
}

async function main() {
  log('\n🎮 Starting game build pipeline...', colors.bright);

  // Load manifest
  if (!fs.existsSync(MANIFEST_PATH)) {
    log('✗ games-manifest.json not found', colors.red);
    process.exit(1);
  }

  const manifest = await fs.readJson(MANIFEST_PATH);
  log(`\n📋 Found ${manifest.games.length} games in manifest`, colors.cyan);

  // Copy manifest to web app src directory
  log(`\n📄 Copying manifest to web app...`, colors.cyan);
  await fs.copy(MANIFEST_PATH, WEB_MANIFEST_PATH);

  // Clean and create directories
  await fs.remove(TEMP_DIR);
  await fs.ensureDir(TEMP_DIR);
  await fs.ensureDir(OUTPUT_DIR);

  // Build each game
  let successCount = 0;
  let failCount = 0;

  const baseUrl = manifest.baseUrl || 'https://adventofgames.com';

  for (const game of manifest.games) {
    try {
      await buildGame(game, baseUrl);
      successCount++;
    } catch (error) {
      failCount++;
      log(`\nContinuing with next game...\n`, colors.yellow);
    }
  }

  // Clean up temp directory
  log(`\n🧹 Cleaning up temp files...`, colors.cyan);
  await fs.remove(TEMP_DIR);

  // Summary
  log(`\n${'='.repeat(60)}`, colors.bright);
  log(`Build Summary`, colors.bright);
  log(`${'='.repeat(60)}`, colors.bright);
  log(`✓ Successful: ${successCount}`, colors.green);
  if (failCount > 0) {
    log(`✗ Failed: ${failCount}`, colors.red);
  }
  log(`\n🎉 Game build pipeline complete!\n`, colors.bright);

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  log(`\n✗ Build pipeline failed: ${error.message}`, colors.red);
  process.exit(1);
});
