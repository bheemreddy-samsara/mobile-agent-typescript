#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function ensureAssets() {
  const outDir = path.join(__dirname, '..', 'assets');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // icon.png 1024x1024 (blue)
  const iconPath = path.join(outDir, 'icon.png');
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 122, b: 255, alpha: 1 } },
  })
    .png()
    .toFile(iconPath);

  // adaptive-icon.png 1024x1024 (green)
  const adaptivePath = path.join(outDir, 'adaptive-icon.png');
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 76, g: 217, b: 100, alpha: 1 } },
  })
    .png()
    .toFile(adaptivePath);

  // splash.png 1242x2436 (white background with centered rectangle)
  const splashPath = path.join(outDir, 'splash.png');
  const base = sharp({
    create: { width: 1242, height: 2436, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  }).png();

  const overlay = Buffer.from(
    `<svg width="1242" height="2436" viewBox="0 0 1242 2436" xmlns="http://www.w3.org/2000/svg">
      <rect x="321" y="918" width="600" height="600" rx="64" fill="#007AFF" />
      <text x="621" y="1240" font-size="72" font-family="Arial" font-weight="bold" fill="#FFFFFF" text-anchor="middle">RN</text>
    </svg>`
  );

  await base
    .composite([{ input: overlay }])
    .toFile(splashPath);

  console.log('Generated assets:', { iconPath, adaptivePath, splashPath });
}

ensureAssets().catch((e) => {
  console.error('Failed to generate assets', e);
  process.exit(1);
});
