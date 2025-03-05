const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../src/assets/icons');
const SPLASH_DIR = path.join(__dirname, '../src/assets/splash');
const SOURCE_LOGO = path.join(__dirname, '../src/assets/app_logo.svg');

const ICONS = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 152, name: 'apple-icon-152x152.png' },
  { size: 167, name: 'apple-icon-167x167.png' },
  { size: 180, name: 'apple-icon-180x180.png' },
  { size: 192, name: 'android-icon-192x192.png' },
  { size: 512, name: 'android-icon-512x512.png' },
];

const SPLASH_SCREENS = [
  { width: 1125, height: 2436, name: 'apple-splash-1125x2436.png' },
  { width: 750, height: 1334, name: 'apple-splash-750x1334.png' },
  { width: 1242, height: 2208, name: 'apple-splash-1242x2208.png' },
];

async function ensureDirectoryExists(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function generateIcons() {
  await ensureDirectoryExists(ICONS_DIR);
  
  for (const icon of ICONS) {
    await sharp(SOURCE_LOGO)
      .resize(icon.size, icon.size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(ICONS_DIR, icon.name));
    
    console.log(`Generated ${icon.name}`);
  }
}

async function generateSplashScreens() {
  await ensureDirectoryExists(SPLASH_DIR);
  
  for (const screen of SPLASH_SCREENS) {
    // Calculate logo size (40% of the smaller dimension)
    const logoSize = Math.min(screen.width, screen.height) * 0.4;
    
    // Create a white background
    const image = sharp({
      create: {
        width: screen.width,
        height: screen.height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    });

    // Resize the logo
    const logo = await sharp(SOURCE_LOGO)
      .resize(Math.round(logoSize), Math.round(logoSize), {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .toBuffer();

    // Composite the logo onto the center of the background
    await image
      .composite([{
        input: logo,
        gravity: 'center'
      }])
      .png()
      .toFile(path.join(SPLASH_DIR, screen.name));
    
    console.log(`Generated ${screen.name}`);
  }
}

async function main() {
  try {
    await generateIcons();
    await generateSplashScreens();
    console.log('All assets generated successfully!');
  } catch (err) {
    console.error('Error generating assets:', err);
    process.exit(1);
  }
}

main(); 