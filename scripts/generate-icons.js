import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const ICONS_DIR = 'src/assets/icons';
const PUBLIC_DIR = 'public';
const SPLASH_DIR = 'src/assets/splash';
const SOURCE_LOGO = 'src/assets/logo_only.svg';
const FAVICON_SOURCE = 'src/assets/mobile_app_logo.svg';

// Ensure the output directories exist
await fs.mkdir(ICONS_DIR, { recursive: true });
await fs.mkdir(SPLASH_DIR, { recursive: true });
await fs.mkdir(PUBLIC_DIR, { recursive: true });

const ICONS = [
  { size: 16, name: 'favicon-16x16.png', isFavicon: true },
  { size: 32, name: 'favicon-32x32.png', isFavicon: true },
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
    // Use different padding and size for favicons vs other icons
    const padding = icon.isFavicon ? Math.round(icon.size * 0.05) : Math.round(icon.size * 0.1); // 5% padding for favicon, 10% for others
    const logoSize = icon.isFavicon ? Math.round(icon.size * 0.9) : Math.round(icon.size * 0.8); // 90% size for favicon, 80% for others
    const sourceFile = icon.isFavicon ? FAVICON_SOURCE : SOURCE_LOGO;

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
    await sharp(sourceFile)
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

async function copyAndroidIconsToPublic() {
  const androidIcons = ['android-icon-192x192.png', 'android-icon-512x512.png'];
  for (const iconName of androidIcons) {
    const sourcePath = path.join(ICONS_DIR, iconName);
    const targetPath = path.join(PUBLIC_DIR, iconName);
    await fs.copyFile(sourcePath, targetPath);
    console.log(`Copied ${iconName} to public folder`);
  }
}

// Generate all assets
await generateIcons();
await generateSplashScreens();
await copyAndroidIconsToPublic();
console.log('All assets generated successfully!'); 