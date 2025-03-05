import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const ICONS_DIR = 'src/assets/icons';
const SPLASH_DIR = 'src/assets/splash';
const SOURCE_LOGO = 'src/assets/logo_only.svg';

// Ensure the output directories exist
await fs.mkdir(ICONS_DIR, { recursive: true });
await fs.mkdir(SPLASH_DIR, { recursive: true });

const ICONS = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 152, name: 'apple-icon-152x152.png' },
  { size: 167, name: 'apple-icon-167x167.png' },
  { size: 180, name: 'apple-icon-180x180.png' },
  { size: 384, name: 'android-icon-192x192.png' },
  { size: 1024, name: 'android-icon-512x512.png' },
];

const SPLASH_SCREENS = [
  { width: 1125, height: 2436 },
  { width: 750, height: 1334 },
  { width: 1242, height: 2208 }
];

async function generateIcons() {
  for (const icon of ICONS) {
    const outputPath = path.join(ICONS_DIR, icon.name);
    const padding = Math.round(icon.size * 0.1); // 10% padding
    const logoSize = Math.round(icon.size * 0.8); // Logo takes up 80% of the space

    // Create a white background
    const background = await sharp({
      create: {
        width: icon.size,
        height: icon.size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    }).png().toBuffer();

    // Resize the logo with padding and composite onto the background
    await sharp(SOURCE_LOGO)
      .resize(logoSize, logoSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .toBuffer()
      .then(async (logo) => {
        await sharp(background)
          .composite([{
            input: logo,
            top: Math.round((icon.size - logoSize) / 2),
            left: Math.round((icon.size - logoSize) / 2)
          }])
          .png()
          .toFile(outputPath);
      });

    console.log(`Generated ${icon.name}`);
  }
}

async function generateSplashScreens() {
  for (const screen of SPLASH_SCREENS) {
    const outputPath = path.join(SPLASH_DIR, `apple-splash-${screen.width}x${screen.height}.png`);
    const logoSize = Math.min(screen.width, screen.height) * 0.6; // Logo takes up 60% of the smaller dimension

    // Create a white background
    const background = await sharp({
      create: {
        width: screen.width,
        height: screen.height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    }).png().toBuffer();

    // Resize the logo and composite onto the background
    await sharp(SOURCE_LOGO)
      .resize(Math.round(logoSize), Math.round(logoSize), {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .toBuffer()
      .then(async (logo) => {
        await sharp(background)
          .composite([{
            input: logo,
            top: Math.round((screen.height - logoSize) / 2),
            left: Math.round((screen.width - logoSize) / 2)
          }])
          .png()
          .toFile(outputPath);
      });

    console.log(`Generated splash screen ${screen.width}x${screen.height}`);
  }
}

// Generate all assets
await generateIcons();
await generateSplashScreens();
console.log('All assets generated successfully!'); 